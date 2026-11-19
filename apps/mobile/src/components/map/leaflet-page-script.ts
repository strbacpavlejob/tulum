// Runs inside the native maps' WebView, after leaflet.js and
// leaflet.markercluster.js. It is a string, not a function, because Hermes
// release builds don't keep function source for toString().
//
// Bridge: the app calls window.tulumMap.receive(command) through
// injectJavaScript (see LeafletWebView), and the page posts JSON events back
// with window.ReactNativeWebView.postMessage: "ready", "markerPress" and
// "error". The markers mirror MapMarkerIcon and MapClusterIcon.
export const LEAFLET_PAGE_SCRIPT = String.raw`
(function () {
  "use strict";

  var options = window.TULUM_MAP_OPTIONS;

  function post(message) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    }
  }

  function reportError(error) {
    post({ type: "error", message: String((error && error.message) || error) });
  }

  window.addEventListener("error", function (event) {
    reportError(event.error || event.message);
  });
  window.addEventListener("unhandledrejection", function (event) {
    reportError(event.reason);
  });

  // Lucide's map-pin and user-round, as MapMarkerIcon draws them.
  var ICONS = {
    pin: [
      ["path", { d: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" }],
      ["circle", { cx: "12", cy: "10", r: "3" }],
    ],
    user: [
      ["circle", { cx: "12", cy: "8", r: "5" }],
      ["path", { d: "M20 21a8 8 0 0 0-16 0" }],
    ],
  };

  // MapMarkerIcon's "md" size for markers and "xl" for the selected one.
  var SIZES = {
    md: { outer: 48, inner: 40, border: 2, icon: 20 },
    xl: { outer: 72, inner: 58, border: 3, icon: 32 },
  };

  var CLUSTER_BOX = 80;

  var map = L.map("map", {
    zoomControl: false,
    attributionControl: false,
    dragging: options.interactive,
    touchZoom: options.interactive,
    doubleClickZoom: options.interactive,
    scrollWheelZoom: false,
    boxZoom: false,
    keyboard: false,
  }).setView([options.center.lat, options.center.lng], options.zoom);

  var palette = null;
  var tileLayer = null;
  var markerLayer = null;
  var pins = [];
  var clustered = false;
  var selectedKey = null;
  var markers = {};

  function isCoord(value) {
    return typeof value === "number" && isFinite(value);
  }

  function element(tag, className, style) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (style) {
      for (var name in style) node.style[name] = style[name];
    }
    return node;
  }

  function svgIcon(name, size, color) {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    var attributes = {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: color,
      "stroke-width": 2,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    };
    for (var key in attributes) svg.setAttribute(key, attributes[key]);
    ICONS[name].forEach(function (part) {
      var child = document.createElementNS(ns, part[0]);
      for (var attr in part[1]) child.setAttribute(attr, part[1][attr]);
      svg.appendChild(child);
    });
    return svg;
  }

  function markerIcon(pin, selected) {
    var size = SIZES[selected ? "xl" : "md"];
    var box = size.outer + 16;
    var root = element("div", "tulum-marker", { width: box + "px", height: box + "px" });

    ["tulum-pulse tulum-pulse-1", "tulum-pulse tulum-pulse-2"].forEach(function (className) {
      root.appendChild(
        element("span", className, {
          width: size.outer + "px",
          height: size.outer + "px",
          background: palette.color,
        }),
      );
    });

    var inner = element("span", "tulum-inner", {
      width: size.inner + "px",
      height: size.inner + "px",
    });
    if (pin.image) {
      inner.style.border = size.border + "px solid " + (selected ? palette.color : palette.color075);
      inner.style.background = palette.background;
      var image = element("img");
      image.alt = "";
      image.src = pin.image;
      inner.appendChild(image);
      if (pin.instances > 1) {
        var count = element("span", "tulum-count", {
          background: palette.color050,
          color: palette.colorStrong,
          fontSize: (selected ? 22 : 16) + "px",
        });
        count.textContent = String(pin.instances);
        inner.appendChild(count);
      }
    } else {
      inner.style.background = palette.gray3;
      inner.appendChild(svgIcon(pin.kind === "user" ? "user" : "pin", size.icon, palette.gray10));
    }
    root.appendChild(inner);

    return L.divIcon({
      html: root,
      className: "",
      iconSize: [box, box],
      iconAnchor: [box / 2, box / 2],
    });
  }

  // MapClusterIcon's steps.
  function clusterDiameter(count) {
    if (count >= 750) return 80;
    if (count >= 100) return 64;
    if (count >= 50) return 56;
    if (count >= 25) return 48;
    if (count >= 10) return 44;
    return 40;
  }

  function clusterIcon(cluster) {
    var count = cluster.getChildCount();
    var diameter = clusterDiameter(count);
    var root = element("div", "tulum-cluster", {
      width: CLUSTER_BOX + "px",
      height: CLUSTER_BOX + "px",
    });
    var badge = element("span", "", {
      width: diameter + "px",
      height: diameter + "px",
      background: palette.color,
      border: "2px solid " + palette.background,
      color: palette.background,
      fontSize: diameter * 0.32 + "px",
    });
    badge.textContent = String(count);
    root.appendChild(badge);
    return L.divIcon({
      html: root,
      className: "",
      iconSize: [CLUSTER_BOX, CLUSTER_BOX],
      iconAnchor: [CLUSTER_BOX / 2, CLUSTER_BOX / 2],
    });
  }

  function isSelected(pin) {
    return pin.selected === true || (selectedKey !== null && pin.key === selectedKey);
  }

  function renderPins() {
    if (markerLayer) map.removeLayer(markerLayer);
    markerLayer = null;
    markers = {};
    if (!palette) return;

    markerLayer = clustered
      ? L.markerClusterGroup({
          maxClusterRadius: 60,
          disableClusteringAtZoom: 17,
          spiderfyOnMaxZoom: false,
          showCoverageOnHover: false,
          iconCreateFunction: clusterIcon,
        })
      : L.layerGroup();

    pins.forEach(function (pin) {
      if (!isCoord(pin.lat) || !isCoord(pin.lng)) return;
      var marker = L.marker([pin.lat, pin.lng], {
        icon: markerIcon(pin, isSelected(pin)),
        interactive: options.interactive,
        keyboard: false,
      });
      marker.on("click", function () {
        post({ type: "markerPress", key: pin.key });
      });
      markerLayer.addLayer(marker);
      markers[pin.key] = { marker: marker, pin: pin };
    });
    map.addLayer(markerLayer);
  }

  function updateIcon(key) {
    var entry = key !== null ? markers[key] : null;
    if (entry) entry.marker.setIcon(markerIcon(entry.pin, isSelected(entry.pin)));
  }

  var commands = {
    setTheme: function (command) {
      palette = command.palette;
      document.body.style.background = command.palette.background;
      if (tileLayer) map.removeLayer(tileLayer);
      tileLayer = L.tileLayer(command.tileUrl, { maxZoom: 19 }).addTo(map);
      renderPins();
    },
    setPins: function (command) {
      pins = command.pins;
      clustered = command.cluster === true;
      selectedKey = command.selectedKey === undefined ? null : command.selectedKey;
      renderPins();
    },
    setSelected: function (command) {
      var previous = selectedKey;
      selectedKey = command.key;
      if (previous !== selectedKey) {
        updateIcon(previous);
        updateIcon(selectedKey);
      }
    },
    flyTo: function (command) {
      map.flyTo([command.lat, command.lng], command.zoom, {
        duration: command.duration,
      });
    },
    setView: function (command) {
      map.setView([command.lat, command.lng], command.zoom, { animate: false });
    },
    fitBounds: function (command) {
      map.fitBounds(command.points, {
        padding: [command.padding, command.padding],
        animate: false,
      });
    },
  };

  window.tulumMap = {
    receive: function (command) {
      var run = commands[command && command.type];
      if (!run) {
        reportError("Unknown map command: " + (command && command.type));
        return;
      }
      try {
        run(command);
      } catch (error) {
        reportError(error);
      }
    },
  };

  post({ type: "ready" });
})();
`;
