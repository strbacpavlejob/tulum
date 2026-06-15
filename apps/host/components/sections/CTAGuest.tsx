"use client";

import { useTranslation } from "react-i18next";
import { IconMapPin } from "@tabler/icons-react";
import { faker } from "@faker-js/faker";
import Logo from "../common/logo";
import { Marquee } from "../ui/marquee";
import { cn } from "@/lib/utils";

const TAGS = [
  "Live Music",
  "Rooftop",
  "Party",
  "DJ",
  "Techno",
  "Coffee",
  "Dancing",
  "Night Out",
  "Festival",
  "Rave",
  "Summer Vibes",
  "House",
  "Cocktails",
  "Indie",
  "Art",
  "Wine",
  "Chill",
  "R&B",
  "Karaoke",
  "Latin",
  "Jazz",
  "Hip Hop",
  "Afterparty",
];

faker.seed(42);

const profiles = Array.from({ length: 40 }, (_, i) => {
  const gender = i % 2 === 0 ? "female" : "male";
  return {
    name: faker.person.firstName(gender),
    age: faker.number.int({ min: 20, max: 32 }),
    tags: faker.helpers.arrayElements(TAGS, { min: 3, max: 3 }),
    location: `${faker.location.street()}, ${faker.location.city()}`,
    image: `https://mockmind-api.uifaces.co/content/human/${i + 180}.jpg`,
  };
});

const firstRow = profiles.slice(0, 13);
const secondRow = profiles.slice(13, 25);
const thirdRow = profiles.slice(25, 38);
const fourthRow = profiles.slice(38);

const ProfileCard = ({
  name,
  age,
  tags,
  location,
  image,
}: {
  name: string;
  age: number;
  tags: string[];
  location: string;
  image: string;
}) => {
  return (
    <figure
      className={cn(
        "relative w-36 h-48 cursor-pointer overflow-hidden rounded-2xl",
        "shadow-lg",
      )}
    >
      <img
        src={image}
        alt={name}
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      <div className="absolute bottom-2 left-2 right-2">
        <p className="text-sm font-bold leading-tight text-white">
          {name}, {age}
        </p>
        <div className="mt-0.5 flex items-center gap-0.5 text-[9px] text-white/80">
          <IconMapPin className="h-3 w-3" />
          <span>{location}</span>
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-white/15 px-1.5 py-0.5 text-[8px] text-white/80 backdrop-blur-sm"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
};
export function Marquee3D() {
  const columns = [
    { profiles: [...firstRow, ...thirdRow], reverse: false },
    { profiles: [...secondRow, ...fourthRow], reverse: true },
  ];

  return (
    <div className="relative flex h-full w-full flex-row items-center justify-center gap-4 overflow-hidden [perspective:300px]">
      <div
        className="flex flex-row items-center gap-4"
        style={{
          transform:
            "translateX(0px) translateY(0px) translateZ(-100px) rotateX(20deg) rotateY(-10deg) rotateZ(20deg)",
        }}
      >
        {columns.map((col, i) => (
          <Marquee
            key={i}
            reverse={col.reverse}
            pauseOnHover
            vertical
            className="[--duration:100s]"
          >
            {col.profiles.map((profile) => (
              <ProfileCard key={profile.name} {...profile} />
            ))}
          </Marquee>
        ))}
      </div>
      <div className="from-background pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-linear-to-b"></div>
      <div className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t"></div>
      <div className="from-background pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r"></div>
      <div className="from-background pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l"></div>
    </div>
  );
}
export default function CTAGuest() {
  const { t } = useTranslation();

  return (
    <section
      id="cta"
      className="flex flex-col items-center justify-center w-full px-6 py-6"
    >
      <div className="w-full flex justify-center">
        <div className="relative flex w-full max-w-[1000px] flex-col items-center justify-center overflow-hidden rounded-[2rem] border p-10 py-14">
          <div className="absolute inset-0">
            <Marquee3D />
          </div>
          <div className="flex z-10 justify-center items-center mx-auto size-24 rounded-full border bg-white/10 p-3 shadow-2xl backdrop-blur-md dark:bg-black/10 lg:size-32">
            <Logo className="size-16" />
          </div>
          <div className="z-10 mt-4 flex flex-col items-center text-center text-black dark:text-white">
            <h1 className="text-3xl font-bold lg:text-4xl">
              {t("landingpage.ctaGuest.title")}
            </h1>
            <p className="mt-2">{t("landingpage.ctaGuest.subtitle")}</p>
            <a
              href="/"
              className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-11 group mt-4 rounded-[2rem] px-6"
            >
              {t("landingpage.ctaGuest.cta")}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-chevron-right ml-1 size-4 transition-all duration-300 ease-out group-hover:translate-x-1"
              >
                <path d="m9 18 6-6-6-6"></path>
              </svg>
            </a>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-b from-transparent to-white to-70% dark:to-black"></div>
        </div>
      </div>
    </section>
  );
}
