const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Required for .web.js/.web.ts extensions to resolve inside node_modules
// (e.g. react-native-reanimated, @gorhom/bottom-sheet web implementations)
config.resolver.platforms = ["ios", "android", "web"];

module.exports = withNativeWind(config, { input: "./global.css" });
