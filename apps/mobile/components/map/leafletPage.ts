import {
  LEAFLET_CSS,
  LEAFLET_JS,
  MARKERCLUSTER_CSS,
  MARKERCLUSTER_JS,
} from "./leafletAssets";
import { LEAFLET_PAGE_SCRIPT } from "./leafletPageScript";

export interface LeafletPageOptions {
  center: { lat: number; lng: number };
  zoom: number;
  interactive: boolean;
  backgroundColor: string;
}

// The pulse rings follow MapMarkerIcon's Reanimated loop: 2 s, ease in-out,
// back and forth, the second ring 0.5 s later.
const PAGE_CSS = `
html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; -webkit-tap-highlight-color: transparent; }
#map { position: absolute; top: 0; right: 0; bottom: 0; left: 0; }
.leaflet-container { background: transparent; font-family: system-ui, -apple-system, Roboto, sans-serif; }
.tulum-marker { position: relative; display: flex; align-items: center; justify-content: center; }
.tulum-pulse { position: absolute; border-radius: 50%; }
.tulum-pulse-1 { opacity: 0.5; animation: tulum-pulse-1 2s ease-in-out infinite alternate; }
.tulum-pulse-2 { opacity: 0.3; animation: tulum-pulse-2 2s ease-in-out 0.5s infinite alternate; }
@keyframes tulum-pulse-1 { from { transform: scale(1); opacity: 0.5; } to { transform: scale(1.5); opacity: 0; } }
@keyframes tulum-pulse-2 { from { transform: scale(1); opacity: 0.3; } to { transform: scale(1.5); opacity: 0; } }
.tulum-inner { position: relative; box-sizing: border-box; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.tulum-inner img { width: 100%; height: 100%; object-fit: cover; display: block; }
.tulum-count { position: absolute; top: 0; right: 0; bottom: 0; left: 0; display: flex; align-items: center; justify-content: center; font-weight: 800; }
.tulum-cluster { display: flex; align-items: center; justify-content: center; }
.tulum-cluster span { box-sizing: border-box; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.25); }
`;

/** The WebView document: Leaflet, markercluster and the bridge script, all inline. */
export function buildLeafletPage(options: LeafletPageOptions) {
  // JSON inside <script> must not contain "</".
  const optionsJson = JSON.stringify(options).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>${LEAFLET_CSS}</style>
<style>${MARKERCLUSTER_CSS}</style>
<style>${PAGE_CSS}</style>
</head>
<body style="background: ${options.backgroundColor}">
<div id="map"></div>
<script>${LEAFLET_JS}</script>
<script>${MARKERCLUSTER_JS}</script>
<script>window.TULUM_MAP_OPTIONS = ${optionsJson};</script>
<script>${LEAFLET_PAGE_SCRIPT}</script>
</body>
</html>`;
}
