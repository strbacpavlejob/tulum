import { LATITUDE_DELTA, LONGITUDE_DELTA } from "@/constants/map";
import { useAppTheme } from "@/hooks/useAppTheme";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { createRoot } from "react-dom/client";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import useStore from "@/store/useStore";
import { EventSummary } from "@/types/event";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
  ViewToken,
} from "react-native";
import { DiscoverCard } from "./DiscoverCard";
import MapClusterIcon from "./MapClusterIcon";
import MapMarkerIcon from "./MapMarkerIcon";
import SearchBox from "./SearchBox";

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
  longitude: 20.4573,
  latitude: 44.8156,
  latitudeDelta: LATITUDE_DELTA,
  longitudeDelta: LONGITUDE_DELTA,
};

const ListingsMap = memo(() => {
  const {
    filteredEvents: listings,
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

  const [selectedIndex, setSelectedIndex] = useState<number | null>(0);
  const [activeTag, setActiveTag] = useState("All");
  const [mapReady, setMapReady] = useState(false);

  const filterTags = useMemo(() => {
    const counts = new Map<string, number>();
    (events ?? []).forEach((e) =>
      e.tags?.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1)),
    );
    const top10 = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);
    return ["All", ...top10];
  }, [events]);

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
        mapInstanceRef.current.panTo([
          item.location.latitude,
          item.location.longitude,
        ]);
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
    ({ item, index }: { item: EventSummary; index: number }) => (
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

    listings?.forEach((item: EventSummary, index: number) => {
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
        <View pointerEvents="auto">
          <SearchBox />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingTop: 12, paddingBottom: 4 }}
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
                  color: activeTag === tag ? theme.background : theme.gray10,
                }}
              >
                {tag === "All" ? t("all") : tag}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
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
          <FlatList
            ref={flatListRef}
            data={listings}
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
        </LinearGradient>
      </View>
    </View>
  );
});

ListingsMap.displayName = "ListingsMap";
export default ListingsMap;
