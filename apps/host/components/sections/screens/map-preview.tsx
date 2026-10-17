import Marker from "@/components/common/marker";
import { cn } from "@/lib/utils";

type MapPreviewProps = {
  className?: string;
  markerImages?: readonly string[];
  variant?: "discover" | "venue";
};

type MapPreviewMarker = {
  left: string;
  top: string;
  image?: string;
};

const discoverMarkers: MapPreviewMarker[] = [
  { left: "55%", top: "55%" },
  { left: "70%", top: "33%" },
  { left: "71%", top: "72%" },
];

const venueMarker: MapPreviewMarker[] = [{ left: "60%", top: "65%" }];

export function MapPreview({
  className,
  markerImages,
  variant = "discover",
}: MapPreviewProps) {
  const markers =
    variant === "discover"
      ? discoverMarkers.map((marker, index) => ({
          ...marker,
          image: markerImages?.[index],
        }))
      : venueMarker;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative h-full w-full overflow-hidden bg-[#e8ece5] dark:bg-[#191b22]",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 400 800"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
      >
        <path
          d="M-30 165C50 143 114 225 192 208s139-23 240 45M-25 472c70-45 119-70 203-39s144 23 250-42M263-25c-36 105-37 178-2 273s55 177 14 284-61 193-30 296"
          className="fill-none stroke-white dark:stroke-[#282b34]"
          strokeWidth="22"
        />
        <path
          d="M-30 165C50 143 114 225 192 208s139-23 240 45M-25 472c70-45 119-70 203-39s144 23 250-42M263-25c-36 105-37 178-2 273s55 177 14 284-61 193-30 296"
          className="fill-none stroke-[#d1d8cd] dark:stroke-[#353843]"
          strokeWidth="2"
        />
        <path
          d="M38 285c21-35 66-47 101-26 28 17 33 49 9 69-31 25-78 27-103 8-20-15-21-34-7-51ZM278 571c26-32 65-35 88-16 20 17 19 46-6 63-28 19-67 18-85-2-12-14-11-31 3-45Z"
          className="fill-[#d6e5d2] dark:fill-[#25382e]"
        />
        <path
          d="M-20 83c65 42 124 24 187 43s107 34 188 0M-35 352c58-42 123-45 175-12s112 33 180 7M-24 627c62-23 114-10 166 24s129 38 272-12M91-20c13 95 4 156 44 233s30 151 5 233 2 177 61 372M354-18c-28 82-10 156 23 229s21 147-22 226-38 168-3 281"
          className="fill-none stroke-[#cbd2c7] dark:stroke-[#30333d]"
          strokeWidth="3"
        />
      </svg>

      {markers.map((marker, index) => (
        <div
          key={`${marker.left}-${index}`}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: marker.left, top: marker.top }}
        >
          <div className="relative size-32">
            <Marker image={marker.image} size="xl" className="size-32" />
          </div>
        </div>
      ))}
    </div>
  );
}
