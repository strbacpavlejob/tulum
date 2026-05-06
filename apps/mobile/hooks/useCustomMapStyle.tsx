import { useMemo } from "react";
import { useAppTheme } from "./useAppTheme";

const hslToHex = (hsl: string): string => {
  const match = hsl.match(
    /hsla?\((\d+),\s*([\d.]+)%,\s*([\d.]+)%(?:,\s*([\d.]+))?\)/,
  );
  if (!match) {
    console.error("Invalid HSL/HSLA format:", hsl);
    throw new Error("Invalid HSL/HSLA format");
  }
  const [, h, s, l, a] = match.map((value, index) =>
    index > 0 && value ? parseFloat(value) : value,
  ) as [string, number, number, number, number | undefined];
  const lightness = l / 100;
  const chroma = (Number(s) / 100) * Math.min(lightness, 1 - lightness);
  const f = (n: number) => {
    const k = (n + Number(h) / 30) % 12;
    const color = lightness - chroma * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

export const useCustomMapStyle = () => {
  const theme = useAppTheme();

  const mapStyle = useMemo(() => {
    const color = theme.backgroundFocus;

    return [
      {
        featureType: "all",
        elementType: "labels.text.fill",
        stylers: [
          {
            saturation: 50, // Reduced saturation
          },
          {
            color: color,
          },
          {
            lightness: 40,
          },
        ],
      },
      {
        featureType: "all",
        elementType: "labels.text.stroke",
        stylers: [
          {
            visibility: "on",
          },
          {
            color: color,
          },
          {
            lightness: 20,
          },
        ],
      },
      {
        featureType: "all",
        elementType: "labels.icon",
        stylers: [
          {
            visibility: "off",
          },
        ],
      },
      {
        featureType: "administrative",
        elementType: "geometry.fill",
        stylers: [
          {
            color: color,
          },
          {
            lightness: 25,
          },
          {
            saturation: -50, // Reduced saturation
          },
        ],
      },
      {
        featureType: "administrative",
        elementType: "geometry.stroke",
        stylers: [
          {
            color: color,
          },
          {
            lightness: 10,
          },
          {
            weight: 1.2,
          },
          {
            saturation: -50, // Reduced saturation
          },
        ],
      },
      {
        featureType: "landscape",
        elementType: "geometry",
        stylers: [
          {
            color: color,
          },
          {
            lightness: 15,
          },
          {
            saturation: -50, // Reduced saturation
          },
        ],
      },
      {
        featureType: "poi",
        elementType: "geometry",
        stylers: [
          {
            color: color,
          },
          {
            lightness: 18,
          },
          {
            saturation: -50, // Reduced saturation
          },
        ],
      },
      {
        featureType: "road.highway",
        elementType: "geometry.fill",
        stylers: [
          {
            color: color,
          },
          {
            lightness: 10,
          },
          {
            saturation: -50, // Reduced saturation
          },
        ],
      },
      {
        featureType: "road.highway",
        elementType: "geometry.stroke",
        stylers: [
          {
            color: color,
          },
          {
            lightness: 20,
          },
          {
            weight: 0.2,
          },
          {
            saturation: -50, // Reduced saturation
          },
        ],
      },
      {
        featureType: "road.arterial",
        elementType: "geometry",
        stylers: [
          {
            color: color,
          },
          {
            lightness: 12,
          },
          {
            saturation: -50, // Reduced saturation
          },
        ],
      },
      {
        featureType: "road.local",
        elementType: "geometry",
        stylers: [
          {
            color: color,
          },
          {
            lightness: 10,
          },
          {
            saturation: -50, // Reduced saturation
          },
        ],
      },
      {
        featureType: "transit",
        elementType: "geometry",
        stylers: [
          {
            color: color,
          },
          {
            lightness: 12,
          },
          {
            saturation: -50, // Reduced saturation
          },
        ],
      },
      {
        featureType: "water",
        elementType: "geometry",
        stylers: [
          {
            color: color,
          },
          {
            lightness: 10,
          },
          {
            saturation: -50, // Reduced saturation
          },
        ],
      },
    ];
  }, [theme.backgroundFocus]);

  return mapStyle;
};
