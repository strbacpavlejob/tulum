"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { IconHeartFilled, IconMapPin, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

const PROFILES = [
  {
    nameKey: "swipeScreen.profiles.milica.name",
    age: 24,
    tagKeys: [
      "swipeScreen.profiles.milica.tags.liveMusic",
      "swipeScreen.profiles.milica.tags.rooftop",
      "swipeScreen.profiles.milica.tags.party",
    ],
    locationKey: "swipeScreen.profiles.milica.location",
    image: "https://mockmind-api.uifaces.co/content/human/194.jpg",
  },
  {
    nameKey: "swipeScreen.profiles.stefan.name",
    age: 27,
    tagKeys: [
      "swipeScreen.profiles.stefan.tags.dj",
      "swipeScreen.profiles.stefan.tags.techno",
      "swipeScreen.profiles.stefan.tags.coffee",
    ],
    locationKey: "swipeScreen.profiles.stefan.location",
    image: "https://mockmind-api.uifaces.co/content/human/222.jpg",
  },
  {
    nameKey: "swipeScreen.profiles.ana.name",
    age: 22,
    tagKeys: [
      "swipeScreen.profiles.ana.tags.spontaneous",
      "swipeScreen.profiles.ana.tags.dancing",
      "swipeScreen.profiles.ana.tags.nightOut",
    ],
    locationKey: "swipeScreen.profiles.ana.location",
    image: "https://mockmind-api.uifaces.co/content/human/127.jpg",
  },
  {
    nameKey: "swipeScreen.profiles.marko.name",
    age: 26,
    tagKeys: [
      "swipeScreen.profiles.marko.tags.festival",
      "swipeScreen.profiles.marko.tags.rave",
      "swipeScreen.profiles.marko.tags.summerVibes",
    ],
    locationKey: "swipeScreen.profiles.marko.location",
    image: "https://mockmind-api.uifaces.co/content/human/213.jpg",
  },
  {
    nameKey: "swipeScreen.profiles.jovana.name",
    age: 25,
    tagKeys: [
      "swipeScreen.profiles.jovana.tags.dance",
      "swipeScreen.profiles.jovana.tags.house",
      "swipeScreen.profiles.jovana.tags.cocktails",
    ],
    locationKey: "swipeScreen.profiles.jovana.location",
    image: "https://mockmind-api.uifaces.co/content/human/113.jpg",
  },
];

export default function SwipeScreen() {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(
    null,
  );

  const startXRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const card = PROFILES[currentIndex % PROFILES.length];
  const nextCard = PROFILES[(currentIndex + 1) % PROFILES.length];

  const advanceCard = useCallback((direction: "left" | "right") => {
    setExitDirection(direction);

    setTimeout(() => {
      setCurrentIndex((i) => i + 1);
      setExitDirection(null);
      setDragX(0);
    }, 300);
  }, []);

  useEffect(() => {
    if (isDragging || exitDirection) return;

    const timer = setInterval(() => {
      advanceCard(Math.random() > 0.3 ? "right" : "left");
    }, 2500);

    return () => clearInterval(timer);
  }, [isDragging, exitDirection, currentIndex, advanceCard]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    startXRef.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setDragX(e.clientX - startXRef.current);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;

    setIsDragging(false);

    if (Math.abs(dragX) > 60) {
      advanceCard(dragX > 0 ? "right" : "left");
    } else {
      setDragX(0);
    }
  };

  const rotation = isDragging ? dragX * 0.1 : 0;
  const opacity = isDragging ? Math.max(0.5, 1 - Math.abs(dragX) / 300) : 1;

  const exitX =
    exitDirection === "left" ? -400 : exitDirection === "right" ? 400 : 0;
  const exitRotation =
    exitDirection === "left" ? -30 : exitDirection === "right" ? 30 : 0;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full select-none overflow-hidden bg-gradient-to-b from-zinc-900 to-zinc-950"
      style={{ touchAction: "none" }}
    >
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-5 pt-3 pb-2">
        <span className="text-[10px] font-medium text-white/70">9:41</span>
        <div className="flex items-center gap-1">
          <div className="relative h-2 w-3.5 rounded-sm border border-white/70">
            <div className="absolute inset-[1px] right-[2px] rounded-[1px] bg-white/70" />
          </div>
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center px-3 pt-10 pb-16">
        <div className="relative h-full w-full scale-[0.95] overflow-hidden rounded-2xl opacity-60">
          <img
            src={nextCard.image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-lg leading-tight font-bold text-white">
              {t(nextCard.nameKey)}, {nextCard.age}
            </p>

            <div className="mt-1 flex items-center gap-1 text-xs text-white/80">
              <IconMapPin className="h-4 w-4" />
              <span>{t(nextCard.locationKey)}</span>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {nextCard.tagKeys.map((tagKey) => (
                <span
                  key={tagKey}
                  className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-white/80"
                >
                  {t(tagKey)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        className="absolute inset-0 z-10 flex items-center justify-center px-3 pt-10 pb-16"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
      >
        <div
          className="relative h-full w-full overflow-hidden rounded-2xl shadow-2xl"
          style={{
            transform: exitDirection
              ? `translateX(${exitX}px) rotate(${exitRotation}deg)`
              : `translateX(${dragX}px) rotate(${rotation}deg)`,
            opacity: exitDirection ? 0 : opacity,
            transition:
              exitDirection || !isDragging ? "all 0.3s ease-out" : "none",
          }}
        >
          <img
            src={card.image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          {dragX > 30 && (
            <div className="absolute top-8 left-4 z-20 -rotate-12 rounded-lg border-2 border-green-400 px-3 py-1">
              <span className="text-xl font-extrabold tracking-wider text-green-400">
                {t("swipeScreen.labels.like")}
              </span>
            </div>
          )}

          {dragX < -30 && (
            <div className="absolute top-8 right-4 z-20 rotate-12 rounded-lg border-2 border-red-400 px-3 py-1">
              <span className="text-xl font-extrabold tracking-wider text-red-400">
                {t("swipeScreen.labels.nope")}
              </span>
            </div>
          )}

          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-xl leading-tight font-bold text-white">
              {t(card.nameKey)}, {card.age}
            </p>

            <div className="mt-1 flex items-center gap-1 text-sm text-white/80">
              <IconMapPin className="h-4 w-4" />
              <span>{t(card.locationKey)}</span>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {card.tagKeys.map((tagKey) => (
                <span
                  key={tagKey}
                  className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-white/80 backdrop-blur-sm"
                >
                  {t(tagKey)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-3 left-0 right-0 z-20 flex items-center justify-center gap-6">
        <button
          onClick={() => advanceCard("left")}
          className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-red-400/60 bg-black/30 backdrop-blur-sm transition-transform active:scale-90"
        >
          <IconX className="h-5 w-5 text-red-400" stroke={3} />
        </button>

        <button
          onClick={() => advanceCard("right")}
          className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-green-400/60 bg-black/30 backdrop-blur-sm transition-transform active:scale-90"
        >
          <IconHeartFilled className="h-5 w-5 text-green-400" />
        </button>
      </div>
    </div>
  );
}
