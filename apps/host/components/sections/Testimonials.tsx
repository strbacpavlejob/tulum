import { useTranslation } from "react-i18next";
import { Marquee } from "../ui/marquee";
import { Star } from "lucide-react";

const reviews = [
  {
    name: "Nikola",
    username: "@nikola_n",
    bodyBefore: "Way better than dating apps.",
    highlight: "You already know you're going to the same place.",
    bodyAfter: "So it just feels natural.",
    img: "https://randomuser.me/api/portraits/men/1.jpg",
    rating: 5,
  },
  {
    name: "Milica",
    username: "@mica",
    bodyBefore: "I liked that I could see who's going before the event.",
    highlight: "It made everything less awkward.",
    bodyAfter: "",
    img: "https://randomuser.me/api/portraits/women/2.jpg",
    rating: 5,
  },
  {
    name: "Stefan",
    username: "@stefanv",
    bodyBefore: "The signal feature is genius.",
    highlight: "Actually found my match in the crowd.",
    bodyAfter: "Without texting forever.",
    img: "https://randomuser.me/api/portraits/men/3.jpg",
    rating: 5,
  },
  {
    name: "Jovana",
    username: "@jovanaaa",
    bodyBefore: "Finally something that’s not just endless swiping.",
    highlight: "You actually meet people IRL.",
    bodyAfter: "",
    img: "https://randomuser.me/api/portraits/women/4.jpg",
    rating: 5,
  },
  {
    name: "Marko",
    username: "@marko_m",
    bodyBefore: "Matches happening only at events makes it feel way more real.",
    highlight: "No random people from miles away.",
    bodyAfter: "",
    img: "https://randomuser.me/api/portraits/men/5.jpg",
    rating: 4,
  },
  {
    name: "Ana",
    username: "@ana_l",
    bodyBefore: "I was skeptical at first, but it's actually fun.",
    highlight: "Way less pressure than classic dating apps.",
    bodyAfter: "",
    img: "https://randomuser.me/api/portraits/women/6.jpg",
    rating: 5,
  },
  {
    name: "Luka",
    username: "@lukaa",
    bodyBefore: "You go out anyway,",
    highlight: "and this just adds something extra to the night.",
    bodyAfter: "",
    img: "https://randomuser.me/api/portraits/men/7.jpg",
    rating: 4,
  },
  {
    name: "Teodora",
    username: "@teodora",
    bodyBefore: "Seeing people with similar vibe tags made a big difference.",
    highlight: "Conversations just start easier.",
    bodyAfter: "",
    img: "https://randomuser.me/api/portraits/women/8.jpg",
    rating: 5,
  },
  {
    name: "Filip",
    username: "@filip_dev",
    bodyBefore: "Way more organic than Tinder.",
    highlight: "You already have something in common — the event.",
    bodyAfter: "",
    img: "https://randomuser.me/api/portraits/men/9.jpg",
    rating: 5,
  },
  {
    name: "Sara",
    username: "@sara_s",
    bodyBefore: "The chat disappearing after the event",
    highlight: "actually makes you talk in real life.",
    bodyAfter: "",
    img: "https://randomuser.me/api/portraits/women/10.jpg",
    rating: 5,
  },
  {
    name: "Andrej",
    username: "@andrej",
    bodyBefore: "I met people I would never randomly approach.",
    highlight: "This makes it so much easier.",
    bodyAfter: "",
    img: "https://randomuser.me/api/portraits/men/11.jpg",
    rating: 4,
  },
  {
    name: "Ivana",
    username: "@ivana",
    bodyBefore:
      "It feels safer because everyone is actually at the same place,",
    highlight: "not some random location.",
    bodyAfter: "",
    img: "https://randomuser.me/api/portraits/women/12.jpg",
    rating: 5,
  },
  {
    name: "Nemanja",
    username: "@nemanja",
    bodyBefore: "The idea is simple but works really well.",
    highlight: "Events + matching = makes sense.",
    bodyAfter: "",
    img: "https://randomuser.me/api/portraits/men/13.jpg",
    rating: 4,
  },
  {
    name: "Katarina",
    username: "@kaca",
    bodyBefore: "I liked that I could check the vibe of people before going.",
    highlight: "It changes the whole experience.",
    bodyAfter: "",
    img: "https://randomuser.me/api/portraits/women/14.jpg",
    rating: 5,
  },
  {
    name: "Vuk",
    username: "@vuk",
    bodyBefore: "Honestly, nights out feel more exciting now.",
    highlight: "You know something might actually happen.",
    bodyAfter: "",
    img: "https://randomuser.me/api/portraits/men/15.jpg",
    rating: 5,
  },
];

const firstRow = reviews.slice(0, reviews.length / 2);
const secondRow = reviews.slice(reviews.length / 2);
const thirdRow = reviews.slice(reviews.length / 3, (reviews.length / 3) * 2);
const ReviewCard = ({
  img,
  name,
  username,
  bodyBefore,
  highlight,
  bodyAfter,
  rating,
}: {
  img: string;
  name: string;
  username: string;
  bodyBefore: string;
  highlight: string;
  bodyAfter: string;
  rating: number;
}) => {
  return (
    <div className="flex w-full cursor-pointer break-inside-avoid flex-col items-center justify-between gap-6 rounded-xl p-4 bg-accent shadow-[0px_0px_0px_1px_rgba(0,0,0,0.04),0px_8px_12px_-4px_rgba(15,12,12,0.08),0px_1px_2px_0px_rgba(15,12,12,0.10)] dark:shadow-[0px_0px_0px_1px_rgba(250,250,250,0.1),0px_0px_0px_1px_#18181B,0px_8px_12px_-4px_rgba(15,12,12,0.3),0px_1px_2px_0px_rgba(15,12,12,0.3)]">
      <div className="select-none leading-relaxed font-normal text-foreground/90">
        <p>
          {bodyBefore}{" "}
          <span className="bg-primary/20 px-1 py-0.5 font-bold text-primary dark:bg-primary/20 dark:text-primary">
            {highlight}
          </span>{" "}
          {bodyAfter}
        </p>
      </div>

      <div className="flex w-full items-center justify-between gap-3.5">
        <div className="flex items-center gap-3.5">
          <img src={img} alt={name} className="size-8 rounded-full" />
          <div>
            <p className="font-medium text-foreground/90">{name}</p>
            <p className="text-xs font-normal text-foreground/50">{username}</p>
          </div>
        </div>

        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={index}
              className={
                index < rating
                  ? "size-4 fill-yellow-400 text-yellow-400"
                  : "size-4 fill-background text-background"
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
};

function MarqueeDemoVertical() {
  return (
    <div className="relative flex h-[500px] w-full flex-row items-center justify-center overflow-hidden">
      <Marquee pauseOnHover vertical className="[--duration:40s]">
        {firstRow.map((review) => (
          <ReviewCard key={review.username} {...review} />
        ))}
      </Marquee>
      <Marquee
        reverse
        pauseOnHover
        vertical
        className="hidden sm:flex [--duration:40s]"
      >
        {secondRow.map((review) => (
          <ReviewCard key={review.username} {...review} />
        ))}
      </Marquee>
      <Marquee
        pauseOnHover
        vertical
        className="hidden md:flex [--duration:40s]"
      >
        {thirdRow.map((review) => (
          <ReviewCard key={review.username} {...review} />
        ))}
      </Marquee>
      <div className="from-background pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-linear-to-b"></div>
      <div className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t"></div>
    </div>
  );
}

function Testimonials() {
  const { t } = useTranslation();

  return (
    <section
      id="testimonials"
      className="flex flex-col items-center justify-center gap-10 pb-10 w-full relative"
    >
      <div className="border-b w-full h-full p-10 md:p-14">
        <div className="max-w-xl mx-auto flex flex-col items-center justify-center gap-2">
          <h2 className="text-3xl md:text-4xl font-medium tracking-tighter text-center text-balance">
            {t("landingpage.testimonials.title")}
          </h2>
          <p className="text-muted-foreground text-center text-balance font-medium">
            {t("landingpage.testimonials.subtitle")}
          </p>
        </div>
      </div>
      <div className="h-full">
        <div className="px-10">
          <MarqueeDemoVertical />
        </div>
      </div>
    </section>
  );
}

export default Testimonials;
