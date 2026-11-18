/* eslint-disable react-hooks/exhaustive-deps */
import { useAppTheme } from "@/hooks/use-app-theme";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import useStore from "@/store/use-store";
import { EventPin, EventSummary } from "@/types/event";
import {
  FlatList,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
  ViewToken,
} from "react-native";
import { DiscoverCard } from "../discover-card";
import MapClusterIcon from "../map-cluster-icon";
import MapMarkerIcon from "../map-marker-icon";
import SearchBox from "../search-box";
import { Skeleton } from "../ui/skeleton";
import LoadingIndicator from "../loading-indicator";
import {
  renderToDiv,
  loadLeaflet,
  TILE_URLS,
  INITIAL_REGION,
  ACTIVE_PIN_ZOOM,
  getMarkerIconSize,
} from "@/components/listings-map/leaflet-web";

/* ── Render a React component into a DOM element for Leaflet ── */
/* ── Leaflet + MarkerCluster CDN loader ─────────────── */
const ListingsMap = memo(() => {
  const {
    filteredEvents: listings,
    filteredPins: mapPins,
    events,
    setSelectedEventId,
    filter,
    setFilter,
    applyEventsFilter,
  } = useStore();
  const theme = useAppTheme();
  const colorScheme = useColorScheme();
  const storeTheme = useStore((s) => s.settings.theme);
  const isDark =
    storeTheme === "dark" ||
    (storeTheme === "system" && colorScheme === "dark");
  const { t } = useTranslation();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  const CARD_WIDTH = 300;
  const CARD_GAP = 12;
  const SKELETON_COUNT = 5;
  const TAG_SKELETON_WIDTHS = [72, 88, 64, 96, 76];

  const [selectedIndex, setSelectedIndex] = useState<number | null>(0);
  const hasFirstSelectionRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const prevSelectedIndexRef = useRef<number | null>(0);

  // The chosen chip is the filter's tag, so Reset and Apply keep it right.
  const activeTag = filter.tags?.[0] ?? "All";

  const filterTags = useMemo(() => {
    const counts = new Map<string, number>();
    (events ?? []).forEach((e) =>
      e.tags?.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1)),
    );
    const top10 = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);
    // Keep the chosen chip when the latest list has few or none of its
    // events, so the filter stays visible and can be switched off.
    if (activeTag !== "All" && !top10.includes(activeTag)) {
      top10.unshift(activeTag);
    }
    return ["All", ...top10];
  }, [events, activeTag]);

  /* ── Leaflet map refs ─────────────────────────────── */
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const clusterGroupRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);

  // Store callbacks in refs so Leaflet click handlers see latest values
  const listingsRef = useRef(listings);
  listingsRef.current = listings;
  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;

  const onCardPress = useCallback(
    (item: EventSummary, index: number) => {
      setSelectedIndex(index);
      setSelectedEventId(item.id);
      if (mapInstanceRef.current) {
        const lat = item?.location?.latitude;
        const lng = item?.location?.longitude;
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          mapInstanceRef.current.flyTo([lat, lng], ACTIVE_PIN_ZOOM, {
            duration: 0.35,
          });
        }
      }
      router.push(`/event-details/${item.id}`);
    },
    [setSelectedEventId, router],
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems && viewableItems.length > 0) {
        const index = viewableItems[0].index;
        if (index !== null && index !== selectedIndexRef.current) {
          setSelectedIndex(index);
          const currentListings = listingsRef.current;
          if (currentListings && currentListings[index]) {
            const item = currentListings[index];
            if (mapInstanceRef.current) {
              const lat = item?.location?.latitude;
              const lng = item?.location?.longitude;
              if (Number.isFinite(lat) && Number.isFinite(lng)) {
                mapInstanceRef.current.panTo([lat, lng]);
              }
            }
          }
        }
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const firstEventIndexByVenueId = useMemo(() => {
    const indices = new Map<string, number>();
    (listings ?? []).forEach((event, index) => {
      if (event.venueId && !indices.has(event.venueId)) {
        indices.set(event.venueId, index);
      }
    });
    return indices;
  }, [listings]);

  const renderItem = useCallback(
    ({ item, index }: { item: EventSummary; index: number }) => (
      <DiscoverCard
        event={item}
        isSelected={selectedIndex === index}
        onPress={() => onCardPress(item, index)}
      />
    ),
    [selectedIndex, onCardPress],
  );

  const skeletonItems = useMemo(
    () => Array.from({ length: SKELETON_COUNT }, (_, i) => i),
    [SKELETON_COUNT],
  );

  const renderSkeletonItem = useCallback(
    () => <DiscoverCard isLoading isSelected={false} />,
    [],
  );

  const showLoadingCards = !mapReady || events === undefined;
  const showNoSearchResults =
    filter.title.trim().length > 0 && (listings?.length ?? 0) === 0;

  const handleTagPress = useCallback(
    (tag: string) => {
      if (tag === "All") {
        setFilter({ ...filter, tags: [] });
      } else {
        setFilter({ ...filter, tags: [tag] });
      }
      applyEventsFilter();
    },
    [filter, setFilter, applyEventsFilter],
  );

  const isValidCoord = useCallback((lat: any, lng: any) => {
    return Number.isFinite(lat) && Number.isFinite(lng);
  }, []);

  /* ── Initialize Leaflet map ──────────────────────── */
  useEffect(() => {
    let map: any;
    loadLeaflet().then(() => {
      const L = (window as any).L;
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([INITIAL_REGION.latitude, INITIAL_REGION.longitude], 13);

      mapInstanceRef.current = map;
      setMapReady(true);
    });

    return () => {
      if (map) {
        map.remove();
        mapInstanceRef.current = null;
        tileLayerRef.current = null;
        setMapReady(false);
      }
    };
  }, []);

  /* ── Apply / swap tile layer when map is ready or theme changes ── */
  useEffect(() => {
    if (!mapReady) return;
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }
    tileLayerRef.current = L.tileLayer(
      isDark ? TILE_URLS.dark : TILE_URLS.light,
      { maxZoom: 19 },
    ).addTo(map);
  }, [isDark, mapReady]);

  /* ── Sync markers with listings (clustered) ──────── */
  useEffect(() => {
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    // Remove previous cluster group
    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
      clusterGroupRef.current = null;
    }
    markersRef.current = [];

    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 60,
      disableClusteringAtZoom: 17,
      spiderfyOnMaxZoom: false,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        const el = renderToDiv(<MapClusterIcon count={count} />, 80);
        return L.divIcon({
          html: el,
          className: "",
          iconSize: [80, 80],
          iconAnchor: [40, 40],
        });
      },
    });

    (mapPins ?? []).forEach((pin: EventPin) => {
      const lat = pin?.location?.latitude;
      const lng = pin?.location?.longitude;

      // Keep markersRef aligned with mapPins by pushing null for invalid pins
      if (!isValidCoord(lat, lng)) {
        // eslint-disable-next-line no-console
        console.warn(
          "Skipping pin with invalid coordinates:",
          pin?.venueId,
          lat,
          lng,
        );
        markersRef.current.push(null);
        return;
      }

      // All markers start unselected; the selection effect updates the active one
      const markerSize = getMarkerIconSize(false);

      const el = renderToDiv(
        <MapMarkerIcon
          image={pin.image}
          size="md"
          isSelected={false}
          instances={pin.instances}
        />,
        markerSize,
      );

      const icon = L.divIcon({
        html: el,
        className: "",
        iconSize: [markerSize, markerSize],
        iconAnchor: [markerSize / 2, markerSize / 2],
      });

      const marker = L.marker([lat, lng], {
        icon,
      });

      marker.on("click", () => {
        const eventIndex = firstEventIndexByVenueId.get(pin.venueId);
        const currentListings = listingsRef.current;
        if (
          eventIndex !== undefined &&
          currentListings &&
          currentListings[eventIndex]
        ) {
          setSelectedIndex(eventIndex);
          setSelectedEventId(currentListings[eventIndex].id);
          flatListRef.current?.scrollToIndex({
            index: eventIndex,
            animated: true,
          });
        }
      });

      clusterGroup.addLayer(marker);
      markersRef.current.push(marker);
    });

    map.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;

    // After rebuilding, re-apply the current selection
    const cur = selectedIndexRef.current;
    const selectedVenueId =
      cur !== null ? (listings?.[cur]?.venueId ?? null) : null;
    const selectedPinIndex =
      selectedVenueId == null
        ? -1
        : (mapPins ?? []).findIndex((pin) => pin.venueId === selectedVenueId);

    if (selectedPinIndex >= 0 && mapPins?.[selectedPinIndex]) {
      const markerSize = getMarkerIconSize(true);
      const el = renderToDiv(
        <MapMarkerIcon
          image={mapPins[selectedPinIndex].image}
          size="md"
          isSelected={true}
          instances={mapPins[selectedPinIndex].instances}
        />,
        markerSize,
      );
      // Only set icon if the corresponding marker exists
      if (markersRef.current[selectedPinIndex]) {
        markersRef.current[selectedPinIndex].setIcon(
          L.divIcon({
            html: el,
            className: "",
            iconSize: [markerSize, markerSize],
            iconAnchor: [markerSize / 2, markerSize / 2],
          }),
        );
      }
    }
  }, [
    mapPins,
    listings,
    firstEventIndexByVenueId,
    theme,
    mapReady,
    setSelectedEventId,
  ]);

  /* ── Swap only the two affected marker icons on selection change ── */
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !markersRef.current.length) return;

    const selectedVenueId =
      selectedIndex !== null
        ? (listings?.[selectedIndex]?.venueId ?? null)
        : null;
    const prevVenueId =
      prevSelectedIndexRef.current !== null
        ? (listings?.[prevSelectedIndexRef.current]?.venueId ?? null)
        : null;

    const selectedPinIndex =
      selectedVenueId == null
        ? null
        : (mapPins ?? []).findIndex((pin) => pin.venueId === selectedVenueId);
    const prevPinIndex =
      prevVenueId == null
        ? null
        : (mapPins ?? []).findIndex((pin) => pin.venueId === prevVenueId);

    const updateIcon = (index: number | null, isSelected: boolean) => {
      if (
        index === null ||
        index < 0 ||
        !markersRef.current[index] ||
        !mapPins?.[index]
      )
        return;
      const markerSize = getMarkerIconSize(isSelected);
      const el = renderToDiv(
        <MapMarkerIcon
          image={mapPins[index].image}
          size="md"
          isSelected={isSelected}
          instances={mapPins[index].instances}
        />,
        markerSize,
      );
      markersRef.current[index].setIcon(
        L.divIcon({
          html: el,
          className: "",
          iconSize: [markerSize, markerSize],
          iconAnchor: [markerSize / 2, markerSize / 2],
        }),
      );
    };

    updateIcon(prevPinIndex, false);
    updateIcon(selectedPinIndex, true);
    prevSelectedIndexRef.current = selectedIndex;
  }, [selectedIndex, listings, mapPins]);

  /* ── Keep selected pin centered and zoomed in ── */
  useEffect(() => {
    if (selectedIndex === null) return;

    const selectedEvent = listings?.[selectedIndex];
    if (!selectedEvent) return;
    const lat = selectedEvent?.location?.latitude;
    const lng = selectedEvent?.location?.longitude;
    if (!isValidCoord(lat, lng)) return;

    // The map opens on the city overview, even when the events load after it:
    // the first selection only marks its pin, and later ones fly to theirs.
    if (!hasFirstSelectionRef.current) {
      hasFirstSelectionRef.current = true;
      return;
    }

    mapInstanceRef.current?.flyTo([lat, lng], ACTIVE_PIN_ZOOM, {
      duration: 0.35,
    });
  }, [selectedIndex, listings]);

  // OpenStreetMap via Leaflet

  return (
    <View style={{ flex: 1 }}>
      {/* Full-screen Leaflet map */}
      <div
        ref={mapContainerRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
        }}
      />

      {/* Top controls */}
      <View
        style={{ paddingTop: insets.top + 8 }}
        className="absolute top-0 left-0 right-0 z-10 px-4 pb-3"
        pointerEvents="box-none"
      >
        {showLoadingCards ? (
          <View pointerEvents="none">
            <View className="flex-row items-center gap-3">
              <Skeleton className="h-12 flex-1 rounded-full" />
              <Skeleton className="h-12 w-12 rounded-full" />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: 8,
                paddingTop: 12,
                paddingBottom: 4,
              }}
              pointerEvents="none"
            >
              {TAG_SKELETON_WIDTHS.map((width, index) => (
                <Skeleton
                  key={`tag-skeleton-${index}`}
                  style={{ width, height: 32, borderRadius: 99 }}
                />
              ))}
            </ScrollView>
          </View>
        ) : (
          <>
            <View pointerEvents="auto">
              <SearchBox />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: 8,
                paddingTop: 12,
                paddingBottom: 4,
              }}
              pointerEvents="auto"
            >
              {filterTags.map((tag) => (
                <Pressable
                  key={tag}
                  onPress={() => handleTagPress(tag)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 6,
                    borderRadius: 99,
                    borderWidth: 1,
                    borderColor: activeTag === tag ? theme.color : theme.gray4,
                    backgroundColor:
                      activeTag === tag ? theme.color : theme.background075,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "500",
                      color:
                        activeTag === tag ? theme.background : theme.gray10,
                    }}
                  >
                    {tag === "All" ? t("all") : tag}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}
      </View>

      {/* Bottom gradient + cards */}
      <View
        className="absolute bottom-0 left-0 right-0"
        pointerEvents="box-none"
      >
        <LinearGradient
          colors={["transparent", theme.background075, theme.background]}
          style={{ paddingBottom: insets.bottom + 4, paddingTop: 48 }}
          pointerEvents="box-none"
        >
          {showLoadingCards ? (
            <FlatList
              key="listings-skeleton"
              data={skeletonItems}
              keyExtractor={(item) => `skeleton-${item}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={CARD_WIDTH + CARD_GAP}
              decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: 16, gap: CARD_GAP }}
              getItemLayout={(_, index) => ({
                length: CARD_WIDTH,
                offset: 16 + index * (CARD_WIDTH + CARD_GAP),
                index,
              })}
              renderItem={renderSkeletonItem}
              pointerEvents="none"
            />
          ) : showNoSearchResults ? (
            <View
              className="mx-4 items-center justify-center rounded-2xl border border-light-gray4 bg-light-background075 px-4 py-6 dark:border-dark-gray4 dark:bg-dark-background075"
              pointerEvents="none"
            >
              <Text className="text-center text-sm font-medium text-light-gray12 dark:text-dark-gray12">
                {t("noEventsMatchSearch")}
              </Text>
            </View>
          ) : (
            <FlatList
              key="listings-data"
              ref={flatListRef}
              data={listings ?? []}
              keyExtractor={(item: EventSummary) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={CARD_WIDTH + CARD_GAP}
              decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: 16, gap: CARD_GAP }}
              getItemLayout={(_, index) => ({
                length: CARD_WIDTH,
                offset: 16 + index * (CARD_WIDTH + CARD_GAP),
                index,
              })}
              renderItem={renderItem}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              initialNumToRender={5}
              maxToRenderPerBatch={5}
              windowSize={5}
              pointerEvents="auto"
            />
          )}
        </LinearGradient>
      </View>

      {events === undefined && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            alignItems: "center",
            paddingTop: insets.top + 64,
          }}
          pointerEvents="none"
        >
          <LoadingIndicator />
        </View>
      )}
    </View>
  );
});

ListingsMap.displayName = "ListingsMap";
export default ListingsMap;
