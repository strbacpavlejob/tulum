import { OrbitingCircles } from "@/components/ui/orbiting-circles";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type OrbitCircle = {
  avatar: string;
  name: string;
  radius?: number;
  duration?: number;
  size?: number;
  reverse?: boolean;
  path?: boolean;
  speed?: number;
};

const orbitConfigs: {
  pathStyle: React.CSSProperties;
  circles: OrbitCircle[];
}[] = [
  // Inner orbit
  {
    pathStyle: {
      width: "200px",
      height: "200px",
      left: "calc(50% - 100px)",
      top: "calc(50% - 100px)",
    },
    circles: [
      {
        avatar: "https://i.pravatar.cc/150?img=1",
        name: "Sarah",
        radius: 98,
        duration: 20,
        size: 60,
        reverse: true,
        path: false,
      },
      {
        avatar: "https://i.pravatar.cc/150?img=2",
        name: "Michael",
        radius: 98,
        duration: 20,
        size: 60,
        reverse: true,
        path: false,
      },
      {
        avatar: "https://i.pravatar.cc/150?img=3",
        name: "Emma",
        radius: 98,
        duration: 20,
        size: 60,
        reverse: true,
        path: false,
      },
    ],
  },
  // Middle orbit
  {
    pathStyle: {
      width: "320px",
      height: "320px",
      left: "calc(50% - 160px)",
      top: "calc(50% - 160px)",
    },
    circles: [
      {
        avatar: "https://i.pravatar.cc/150?img=4",
        name: "David",
        radius: 156.8,
        duration: 40,
        size: 60,
        path: false,
      },
      {
        avatar: "https://i.pravatar.cc/150?img=5",
        name: "Jessica",
        radius: 156.8,
        duration: 40,
        size: 60,
        path: false,
      },
      {
        avatar: "https://i.pravatar.cc/150?img=6",
        name: "Alex",
        radius: 156.8,
        duration: 40,
        size: 60,
        path: false,
      },
    ],
  },
  // Outer orbit
  {
    pathStyle: {
      width: "460px",
      height: "460px",
      left: "calc(50% - 230px)",
      top: "calc(50% - 230px)",
    },
    circles: [
      {
        avatar: "https://i.pravatar.cc/150?img=7",
        name: "Chris",
        radius: 225.4,
        duration: 40,
        size: 60,
        reverse: true,
        path: false,
      },
      {
        avatar: "https://i.pravatar.cc/150?img=8",
        name: "Lisa",
        radius: 100,
        size: 40,
        reverse: true,
        speed: 2,
      },
      {
        avatar: "https://i.pravatar.cc/150?img=9",
        name: "Tom",
        radius: 225.4,
        duration: 40,
        size: 60,
        reverse: true,
        path: false,
      },
    ],
  },
];

export function AnimatedOrbitingCircles() {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <div className="relative flex h-full w-full items-center justify-center scale-[0.6]">
        {orbitConfigs.map((orbit, i) => (
          <div key={i}>
            {/* Orbit circle path */}
            <div
              className="pointer-events-none absolute inset-0"
              style={orbit.pathStyle}
            >
              <div className="size-full rounded-full border border-black/[0.07] dark:border-white/[0.07] bg-gradient-to-b from-black/[0.05] from-0% via-transparent via-[54.76%] dark:from-white/[0.03] dark:via-transparent" />
            </div>
            {/* Orbiting avatars */}
            {orbit.circles.map((circle, j) => (
              <OrbitingCircles key={j} {...circle}>
                <div className="flex items-center justify-center w-full h-full">
                  <Avatar
                    className="border-2 border-primary/20 shadow-lg"
                    style={{ width: circle.size, height: circle.size }}
                  >
                    <AvatarImage src={circle.avatar} alt={circle.name} />
                    <AvatarFallback>
                      {circle.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </OrbitingCircles>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
