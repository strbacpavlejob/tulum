import { LATITUDE_DELTA, LONGITUDE_DELTA } from "@/constants/map";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useCustomMapStyle } from "@/hooks/useCustomMapStyle";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { Search, SlidersHorizontal } from "lucide-react-native";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import useStore from "@/store/useStore";
import { Event } from "@/types/event";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewToken,
} from "react-native";
import MapView, { Marker, Region, UrlTile } from "react-native-maps";
import { DiscoverCard } from "./DiscoverCard";
import MapClusterIcon from "./MapClusterIcon";
import MapControlsOverlay from "./MapControlsOverlay";
import MapMarkerIcon from "./MapMarkerIcon";

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
    refreshEvents,
  } = useStore();
  const theme = useAppTheme();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const { t } = useTranslation();
  const flatListRef = useRef<FlatList>(null);
  const mapStyle = useCustomMapStyle();
  const insets = useSafeAreaInsets();

  const CARD_WIDTH = 300;
  const CARD_GAP = 12;

  const [selectedIndex, setSelectedIndex] = useState<number | null>(0);
  const [activeTag, setActiveTag] = useState("All");
  const [currentRegion, setCurrentRegion] = useState<Region>(INITIAL_REGION);

  useEffect(() => {
    onLocateMe();
  }, []);

  const onLocateMe = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;

    const location = await Location.getCurrentPositionAsync({});
    const region = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: LATITUDE_DELTA,
      longitudeDelta: LONGITUDE_DELTA,
    };
    mapRef.current?.animateToRegion(region);
  };

  const moveMapToItem = (item: Event) => {
    const region = {
      latitude: item.location.latitude,
      longitude: item.location.longitude,
      latitudeDelta: LATITUDE_DELTA,
      longitudeDelta: LONGITUDE_DELTA,
    };
    mapRef.current?.animateToRegion(region, 500);
  };

  const onZoomIn = useCallback(() => {
    const newRegion = {
      ...currentRegion,
      latitudeDelta: currentRegion.latitudeDelta / 2,
      longitudeDelta: currentRegion.longitudeDelta / 2,
    };
    mapRef.current?.animateToRegion(newRegion, 300);
  }, [currentRegion]);

  const onZoomOut = useCallback(() => {
    const newRegion = {
      ...currentRegion,
      latitudeDelta: currentRegion.latitudeDelta * 2,
      longitudeDelta: currentRegion.longitudeDelta * 2,
    };
    mapRef.current?.animateToRegion(newRegion, 300);
  }, [currentRegion]);

  const onMarkerSelected = useCallback(
    (item: Event, index: number) => {
      setSelectedIndex(index);
      setSelectedEventId(item.id);
      flatListRef.current?.scrollToIndex({ index, animated: true });
      moveMapToItem(item);
    },
    [listings],
  );

  const onCardPress = useCallback(
    (item: Event, index: number) => {
      setSelectedIndex(index);
      setSelectedEventId(item.id);
      moveMapToItem(item);
      router.push(`/event-details`);
    },
    [listings],
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems && viewableItems.length > 0) {
        const index = viewableItems[0].index;
        if (index !== null && index !== selectedIndex) {
          setSelectedIndex(index);
          if (listings && listings[index]) {
            moveMapToItem(listings[index]);
          }
        }
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderCluster = (cluster: any) => {
    const { id, geometry, onPress, properties } = cluster;
    const points = properties.point_count;
    return (
      <Marker
        key={`cluster-${id}`}
        coordinate={{
          longitude: geometry.coordinates[0],
          latitude: geometry.coordinates[1],
        }}
        onPress={onPress}
      >
        <MapClusterIcon count={points} />
      </Marker>
    );
  };

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
    [filter],
  );

  if (events === undefined)
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ActivityIndicator size="small" />
      </SafeAreaView>
    );

  return (
    <View style={{ flex: 1 }}>
      {/* Full-screen Map */}
      <MapView
        ref={mapRef}
        animationEnabled={false}
        style={StyleSheet.absoluteFillObject}
        initialRegion={INITIAL_REGION}
        mapType={Platform.OS === "android" ? "none" : "standard"}
        clusterColor="#fff"
        clusterTextColor="red"
        clusterFontFamily="mon-sb"
        renderCluster={renderCluster}
        showsUserLocation
        scrollEnabled
        zoomEnabled
        pitchEnabled
        rotateEnabled
        onRegionChangeComplete={(region) => setCurrentRegion(region)}
      >
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
          tileSize={256}
        />
        {listings?.map((item: Event, index: number) => (
          <Marker
            coordinate={{
              latitude: item.location.latitude,
              longitude: item.location.longitude,
            }}
            key={item.id}
            onPress={() => onMarkerSelected(item, index)}
          >
            <MapMarkerIcon
              image={item.image}
              size="md"
              isSelected={selectedIndex === index}
            />
          </Marker>
        ))}
      </MapView>

      {/* Top controls overlay */}
      <View
        style={{ paddingTop: insets.top + 8 }}
        className="absolute top-0 left-0 right-0 z-10 px-4 pb-3"
        pointerEvents="box-none"
      >
        {/* Search + Filter row */}
        <View className="flex-row items-center gap-3" pointerEvents="auto">
          {/* Search bar */}
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
              style={{
                flex: 1,
                fontSize: 14,
                color: theme.gray12,
              }}
            />
          </View>

          {/* Filter button */}
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
          >
            <SlidersHorizontal size={20} color={theme.gray10} />
          </Pressable>
        </View>

        {/* Filter Tags */}
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

      {/* Map controls (zoom + locate) */}
      <MapControlsOverlay
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onLocate={onLocateMe}
      />

      {/* Bottom: gradient + cards */}
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
            contentContainerStyle={{
              paddingHorizontal: 16,
              gap: CARD_GAP,
            }}
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

export default ListingsMap;
