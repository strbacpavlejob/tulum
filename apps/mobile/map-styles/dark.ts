const darkJSON =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "";

const customLayers = [
  {
    id: "background",
    type: "background",
    paint: {
      "background-color": "hsl(240, 6%, 10%)",
    },
  },
  {
    id: "water",
    type: "fill",
    source: "openmaptiles",
    "source-layer": "water",
    paint: {
      "fill-color": "hsl(0, 0%, 64%)",
      "fill-opacity": 0.1,
    },
  },
  {
    id: "landcover",
    type: "fill",
    source: "openmaptiles",
    "source-layer": "landcover",
    paint: {
      "fill-color": "hsl(0, 0%, 64%)",
      "fill-opacity": 0.05,
    },
  },
  {
    id: "road",
    type: "line",
    source: "openmaptiles",
    "source-layer": "transportation",
    paint: {
      "line-color": "hsl(0, 0%, 64%)",
      "line-opacity": 0.2,
      "line-width": 1,
    },
  },
];

// Async function to create the merged style
export async function getNewDarkMapStyle() {
  const response = await fetch(darkJSON);
  if (!response.ok) {
    throw new Error(`Failed to fetch base style: ${response.statusText}`);
  }
  const baseStyle = await response.json();

  // Merge layers: replace by id if exists, else append
  const baseLayers = baseStyle.layers || [];
  const mergedLayers = [...baseLayers];
  for (const customLayer of customLayers) {
    const idx = mergedLayers.findIndex((l) => l.id === customLayer.id);
    if (idx !== -1) {
      mergedLayers[idx] = customLayer;
    } else {
      mergedLayers.push(customLayer);
    }
  }

  return {
    ...baseStyle,
    sources: {
      ...baseStyle.sources,
      openmaptiles: {
        type: "vector",
        url: `https://api.maptiler.com/tiles/v3/tiles.json?key=${maptilerKey}`,
      },
    },
    layers: mergedLayers,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    name: "Tailwind Dark (Custom)",
  };
}
