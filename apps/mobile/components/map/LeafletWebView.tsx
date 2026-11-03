import { Ref, useCallback, useImperativeHandle, useRef, useState } from "react";
import { StyleProp, ViewStyle } from "react-native";
import WebView, { WebViewMessageEvent } from "react-native-webview";
import { buildLeafletPage } from "./leafletPage";
import { MapPalette } from "./mapConfig";

export interface LeafletPin {
  /** Sent back in "markerPress"; a venue id or a fixed name. */
  key: string;
  lat: number;
  lng: number;
  image?: string;
  instances?: number;
  kind?: "venue" | "user";
  /** Always drawn as selected, whatever the setSelected key is. */
  selected?: boolean;
}

export type LeafletCommand =
  | { type: "setTheme"; tileUrl: string; palette: MapPalette }
  | {
      type: "setPins";
      pins: LeafletPin[];
      cluster?: boolean;
      selectedKey?: string | null;
    }
  | { type: "setSelected"; key: string | null }
  | { type: "flyTo"; lat: number; lng: number; zoom: number; duration: number }
  | { type: "setView"; lat: number; lng: number; zoom: number }
  | { type: "fitBounds"; points: [number, number][]; padding: number };

export type LeafletEvent =
  | { type: "ready" }
  | { type: "markerPress"; key: string }
  | { type: "error"; message: string };

export interface LeafletWebViewHandle {
  send: (command: LeafletCommand) => void;
}

interface LeafletWebViewProps {
  ref?: Ref<LeafletWebViewHandle>;
  /** Where the map starts; later moves go through send(). */
  center: { lat: number; lng: number };
  zoom: number;
  /** False turns off panning, zooming and marker taps. */
  interactive?: boolean;
  /** Shown until the first tiles load. */
  backgroundColor: string;
  onEvent?: (event: LeafletEvent) => void;
  style?: StyleProp<ViewStyle>;
}

// The page's origin. MapTiler accepts any referrer today; if the key is ever
// limited to the site's domain, this keeps the apps' tiles working.
const PAGE_BASE_URL = "https://tulum-app.com/";

/**
 * A Leaflet map in a WebView for Android and iOS (TASK-019). The page is
 * built once per mount, so prop changes never reload it: callers send
 * commands after the "ready" event. A WebView whose renderer died is mounted
 * again, and its new "ready" event tells callers to send their state again.
 */
export default function LeafletWebView({
  ref,
  center,
  zoom,
  interactive = true,
  backgroundColor,
  onEvent,
  style,
}: LeafletWebViewProps) {
  // react-native-webview's typings default P to undefined, which turns the
  // props into never; passing object keeps them as WebViewProps.
  const webViewRef = useRef<WebView<object>>(null);
  const [html] = useState(() =>
    buildLeafletPage({ center, zoom, interactive, backgroundColor }),
  );
  const [instance, setInstance] = useState(0);

  useImperativeHandle(
    ref,
    () => ({
      send(command) {
        webViewRef.current?.injectJavaScript(
          `window.tulumMap && window.tulumMap.receive(${JSON.stringify(command)}); true;`,
        );
      },
    }),
    [],
  );

  const handleMessage = useCallback(
    (message: WebViewMessageEvent) => {
      let event: LeafletEvent;
      try {
        event = JSON.parse(message.nativeEvent.data);
      } catch {
        return;
      }
      if (event.type === "error") {
        console.warn(`Map page error: ${event.message}`);
      }
      onEvent?.(event);
    },
    [onEvent],
  );

  const remount = useCallback(() => setInstance((n) => n + 1), []);

  return (
    <WebView<object>
      key={instance}
      ref={webViewRef}
      source={{ html, baseUrl: PAGE_BASE_URL }}
      originWhitelist={["*"]}
      onMessage={handleMessage}
      onShouldStartLoadWithRequest={(request) =>
        request.url === "about:blank" || request.url.startsWith(PAGE_BASE_URL)
      }
      onRenderProcessGone={remount}
      onContentProcessDidTerminate={remount}
      setSupportMultipleWindows={false}
      scrollEnabled={false}
      bounces={false}
      overScrollMode="never"
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      webviewDebuggingEnabled={__DEV__}
      style={[{ flex: 1, backgroundColor }, style]}
    />
  );
}
