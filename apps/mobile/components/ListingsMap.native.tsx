import LeafletWebView, {
  LeafletEvent,
  LeafletWebViewHandle,
} from "@/components/map/LeafletWebView";
import {
  ACTIVE_PIN_FLY_SECONDS,
  ACTIVE_PIN_ZOOM,
  INITIAL_REGION,
  INITIAL_ZOOM,
  isValidCoord,
  mapPalette,
  TILE_URLS,
  useIsDarkMap,
} from "@/components/map/mapConfig";
import { useAppTheme } from "@/hooks/useAppTheme";
import useStore from "@/store/useStore";
import { EventPin, EventSummary } from "@/types/event";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DiscoverCard } from "./DiscoverCard";
import LoadingIndicator from "./loading-indicator";
import SearchBox from "./SearchBox";
import { Skeleton } from "./ui/skeleton";

const CARD_WIDTH = 300;
const CARD_GAP = 12;
const SKELETON_ITEMS = [0, 1, 2, 3, 4];
const TAG_SKELETON_WIDTHS = [72, 88, 64, 96, 76];
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 50 };

/**
 * The Home map on Android and iOS: the same search box, tag chips and event
 * cards as ListingsMap.web.tsx, over a Leaflet map in a WebView (TASK-019).
 */
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
  const isDark = useIsDarkMap();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<EventSummary>>(null);
  const mapRef = useRef<LeafletWebViewHandle>(null);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(0);
  // Counts the map page's "ready" events: 0 until the map can take commands.
  const [mapGeneration, setMapGeneration] = useState(0);

  // The chosen chip is the filter's tag, so Reset and Apply keep it right.
  const activeTag = filter.tags?.[0] ?? "All";

  const filterTags = useMemo(() => {
    const counts = new Map<string, number>();
    (events ?? []).forEach((e: EventSummary) =>
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

  const firstEventIndexByVenueId = useMemo(() => {
    const indices = new Map<string, number>();
    (listings ?? []).forEach((event: EventSummary, index: number) => {
      if (event.venueId && !indices.has(event.venueId)) {
        indices.set(event.venueId, index);
      }
    });
    return indices;
  }, [listings]);

  const selectedEvent =
    selectedIndex !== null ? listings?.[selectedIndex] : undefined;
  const selectedVenueId = selectedEvent?.venueId ?? null;
  const selectedLat = selectedEvent?.location?.latitude;
  const selectedLng = selectedEvent?.location?.longitude;

  // Read by callbacks that must keep one identity (FlatList's
  // onViewableItemsChanged) and by the marker rebuild, which shouldn't rerun
  // on every selection change.
  const latest = useRef({ selectedIndex, selectedVenueId });
  useEffect(() => {
    latest.current = { selectedIndex, selectedVenueId };
  });
  const hasFirstSelection = useRef(false);

  const flyTo = useCallback((lat: number, lng: number) => {
    mapRef.current?.send({
      type: "flyTo",
      lat,
      lng,
      zoom: ACTIVE_PIN_ZOOM,
      duration: ACTIVE_PIN_FLY_SECONDS,
    });
  }, []);

  const onCardPress = useCallback(
    (item: EventSummary, index: number) => {
      setSelectedIndex(index);
      setSelectedEventId(item.id);
      const lat = item.location?.latitude;
      const lng = item.location?.longitude;
      if (isValidCoord(lat, lng)) flyTo(lat, lng);
      router.push(`/event-details/${item.id}`);
    },
    [setSelectedEventId, router, flyTo],
  );

  // Swiping the cards selects the card in view; the selection effect then
  // moves the map.
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { index?: number | null }[] }) => {
      const index = viewableItems[0]?.index;
      if (index == null || index === latest.current.selectedIndex) return;
      setSelectedIndex(index);
    },
    [],
  );

  const handleMapEvent = useCallback(
    (event: LeafletEvent) => {
      if (event.type === "ready") {
        setMapGeneration((n) => n + 1);
        return;
      }
      if (event.type !== "markerPress") return;
      const eventIndex = firstEventIndexByVenueId.get(event.key);
      const item = eventIndex !== undefined ? listings?.[eventIndex] : null;
      if (eventIndex === undefined || !item) return;
      setSelectedIndex(eventIndex);
      setSelectedEventId(item.id);
      flatListRef.current?.scrollToIndex({ index: eventIndex, animated: true });
    },
    [firstEventIndexByVenueId, listings, setSelectedEventId],
  );

  /* ── Map commands, sent once the page is ready and again after a remount ── */
  useEffect(() => {
    if (mapGeneration === 0) return;
    mapRef.current?.send({
      type: "setTheme",
      tileUrl: isDark ? TILE_URLS.dark : TILE_URLS.light,
      palette: mapPalette(theme),
    });
  }, [mapGeneration, isDark, theme]);

  useEffect(() => {
    if (mapGeneration === 0) return;
    const pins = (mapPins ?? []).flatMap((pin: EventPin) => {
      const lat = pin?.location?.latitude;
      const lng = pin?.location?.longitude;
      if (!isValidCoord(lat, lng)) {
        console.warn("Skipping pin with invalid coordinates:", pin?.venueId);
        return [];
      }
      return [
        {
          key: pin.venueId,
          lat,
          lng,
          image: pin.image,
          instances: pin.instances,
        },
      ];
    });
    mapRef.current?.send({
      type: "setPins",
      pins,
      cluster: true,
      selectedKey: latest.current.selectedVenueId,
    });
  }, [mapGeneration, mapPins]);

  useEffect(() => {
    if (mapGeneration === 0) return;
    mapRef.current?.send({ type: "setSelected", key: selectedVenueId });
    if (!isValidCoord(selectedLat, selectedLng)) return;
    // The map opens on the city overview: the first selection only marks its
    // pin, and later ones fly to theirs.
    if (!hasFirstSelection.current) {
      hasFirstSelection.current = true;
      return;
    }
    flyTo(selectedLat as number, selectedLng as number);
  }, [mapGeneration, selectedVenueId, selectedLat, selectedLng, flyTo]);

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

  const renderSkeletonItem = useCallback(
    () => <DiscoverCard isLoading isSelected={false} />,
    [],
  );

  const showLoadingCards = mapGeneration === 0 || events === undefined;
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

  return (
    <View style={{ flex: 1 }}>
      <LeafletWebView
        ref={mapRef}
        center={{ lat: INITIAL_REGION.latitude, lng: INITIAL_REGION.longitude }}
        zoom={INITIAL_ZOOM}
        backgroundColor={theme.background}
        onEvent={handleMapEvent}
        style={StyleSheet.absoluteFill}
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
                  accessibilityRole="button"
                  accessibilityState={{ selected: activeTag === tag }}
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
              data={SKELETON_ITEMS}
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
              viewabilityConfig={VIEWABILITY_CONFIG}
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
