import { LATITUDE_DELTA, LONGITUDE_DELTA } from "@/constants/map";
import { useAppTheme } from "@/hooks/useAppTheme";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Search, SlidersHorizontal } from "lucide-react-native";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { createRoot } from "react-dom/client";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import useStore from "@/store/useStore";
import { Event } from "@/types/event";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
  ViewToken,
} from "react-native";
import { DiscoverCard } from "./DiscoverCard";
import {
  FiltersBottomSheet,
  FiltersBottomSheetRef,
} from "./FiltersBottomSheet";
import MapClusterIcon from "./MapClusterIcon";
import MapControlsOverlay from "./MapControlsOverlay";
import MapMarkerIcon from "./MapMarkerIcon";

/* ── Render a React component into a DOM element for Leaflet ── */
function renderToDiv(
  element: React.ReactElement,
  size: number,
): HTMLDivElement {
  const container = document.createElement("div");
  container.style.width = `${size}px`;
  container.style.height = `${size}px`;
  createRoot(container).render(element);
  return container;
}

/* ── Leaflet + MarkerCluster CDN loader ─────────────── */
let leafletReady: Promise<void> | null = null;

function loadLeaflet(): Promise<void> {
  if (leafletReady) return leafletReady;
  leafletReady = new Promise((resolve) => {
    const loadScript = (src: string): Promise<void> =>
      new Promise((res) => {
        const s = document.createElement("script");
        s.src = src;
        s.onload = () => res();
        document.head.appendChild(s);
      });

    const loadCss = (href: string) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    };

    if ((window as any).L?.markerClusterGroup) {
      resolve();
      return;
    }

    // Leaflet core
    loadCss("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
    loadCss(
      "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css",
    );
    loadCss(
      "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css",
    );

    const loadAll = async () => {
      if (!(window as any).L) {
        await loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js");
      }
      await loadScript(
        "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js",
      );
      resolve();
    };
    loadAll();
  });
  return leafletReady;
}

const maptilerKey = process.env.EXPO_PUBLIC_MAPTILER_KEY ?? "";

const TILE_URLS = {
  dark: `https://api.maptiler.com/maps/dataviz-dark/{z}/{x}/{y}.png?key=${maptilerKey}`,
  light: `https://api.maptiler.com/maps/dataviz/{z}/{x}/{y}.png?key=${maptilerKey}`,
};

const INITIAL_REGION = {
  latitude: 20.4573,
  longitude: 44.8156,
  latitudeDelta: LATITUDE_DELTA,
  longitudeDelta: LONGITUDE_DELTA,
};

const FILTER_TAGS = [
  "All",
  "Nightlife",
  "Rooftop",
  "Live Music",
  "Cocktails",
  "House",
  "Deep House",
  "Outdoor",
  "Festival",
];

const ListingsMap = memo(() => {
  const {
    filteredEvents: listings,
    events,
    setSelectedEventId,
    filter,
    setFilter,
    applyEventsFilter,
    resetEventsFilter,
    refreshEvents,
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
  const filtersRef = useRef<FiltersBottomSheetRef>(null);

  const CARD_WIDTH = 300;
  const CARD_GAP = 12;

  const [selectedIndex, setSelectedIndex] = useState<number | null>(0);
  const [activeTag, setActiveTag] = useState("All");
  const [mapReady, setMapReady] = useState(false);

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
    (item: Event, index: number) => {
      setSelectedIndex(index);
      setSelectedEventId(item.id);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo([
          item.location.latitude,
          item.location.longitude,
        ]);
      }
      router.push(`/event-details`);
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
              mapInstanceRef.current.panTo([
                item.location.latitude,
                item.location.longitude,
              ]);
            }
          }
        }
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderItem = useCallback(
    ({ item, index }: { item: Event; index: number }) => (
      <DiscoverCard
        event={item}
        isSelected={selectedIndex === index}
        onPress={() => onCardPress(item, index)}
      />
    ),
    [selectedIndex, onCardPress],
  );

  const handleTagPress = useCallback(
    (tag: string) => {
      setActiveTag(tag);
      if (tag === "All") {
        setFilter({ ...filter, tags: [] });
      } else {
        setFilter({ ...filter, tags: [tag] });
      }
      applyEventsFilter();
    },
    [filter, setFilter, applyEventsFilter],
  );

  const onZoomIn = useCallback(() => {
    mapInstanceRef.current?.zoomIn();
  }, []);

  const onZoomOut = useCallback(() => {
    mapInstanceRef.current?.zoomOut();
  }, []);

  const onLocate = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        mapInstanceRef.current?.setView(
          [position.coords.latitude, position.coords.longitude],
          mapInstanceRef.current.getZoom(),
        );
      });
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    listings?.forEach((item: Event, index: number) => {
      const isSelected = selectedIndex === index;
      const markerSize = 64; // matches "md" outer + padding

      const el = renderToDiv(
        <MapMarkerIcon image={item.image} size="md" isSelected={isSelected} />,
        markerSize,
      );

      const icon = L.divIcon({
        html: el,
        className: "",
        iconSize: [markerSize, markerSize],
        iconAnchor: [markerSize / 2, markerSize / 2],
      });

      const marker = L.marker(
        [item.location.latitude, item.location.longitude],
        { icon },
      );

      marker.on("click", () => {
        const currentListings = listingsRef.current;
        if (currentListings && currentListings[index]) {
          setSelectedIndex(index);
          setSelectedEventId(currentListings[index].id);
          flatListRef.current?.scrollToIndex({ index, animated: true });
        }
      });

      clusterGroup.addLayer(marker);
      markersRef.current.push(marker);
    });

    map.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;
  }, [listings, selectedIndex, theme, setSelectedEventId]);

  if (events === undefined)
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="small" />
      </View>
    );

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
        <View className="flex-row items-center gap-3" pointerEvents="auto">
          <View
            className="flex-1 flex-row items-center gap-2 rounded-full px-4"
            style={{
              height: 48,
              backgroundColor: theme.background075,
              borderWidth: 1,
              borderColor: theme.gray4,
            }}
          >
            <Search size={20} color={theme.gray10} />
            <TextInput
              placeholder={t("searchEvents")}
              placeholderTextColor={theme.gray10}
              value={filter.title}
              onChangeText={(text) => setFilter({ ...filter, title: text })}
              onSubmitEditing={() => applyEventsFilter()}
              returnKeyType="search"
              style={{ flex: 1, fontSize: 14, color: theme.gray12 }}
            />
          </View>

          <Pressable
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: theme.background075,
              borderWidth: 1,
              borderColor: theme.gray4,
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={() => filtersRef.current?.open()}
          >
            <SlidersHorizontal size={20} color={theme.gray10} />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingTop: 12, paddingBottom: 4 }}
          pointerEvents="auto"
        >
          {FILTER_TAGS.map((tag) => (
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
                  color: activeTag === tag ? theme.background : theme.gray10,
                }}
              >
                {tag}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Map controls */}
      <MapControlsOverlay
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onLocate={onLocate}
      />

      <FiltersBottomSheet
        ref={filtersRef}
        onApply={() => refreshEvents()}
        onReset={() => resetEventsFilter()}
      />

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
          <FlatList
            ref={flatListRef}
            data={listings}
            keyExtractor={(item: Event) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + CARD_GAP}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: 16, gap: CARD_GAP }}
            renderItem={renderItem}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            windowSize={5}
            pointerEvents="auto"
          />
        </LinearGradient>
      </View>
    </View>
  );
});

ListingsMap.displayName = "ListingsMap";
export default ListingsMap;
