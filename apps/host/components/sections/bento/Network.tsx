import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { faker } from "@faker-js/faker";
import Logo from "@/components/common/logo";
import { cn } from "@/lib/utils";

export default function Network({ className }: { className?: string }) {
  const dots = [
    {
      top: "42%",
      left: "10%",
      avatar: `https://i.pravatar.cc/150?img=${faker.number.int({ min: 1, max: 70 })}`,
    },
    {
      top: "31%",
      left: "24%",
      avatar: `https://i.pravatar.cc/150?img=${faker.number.int({ min: 1, max: 70 })}`,
    },
    {
      top: "79%",
      left: "39%",
      avatar: `https://i.pravatar.cc/150?img=${faker.number.int({ min: 1, max: 70 })}`,
    },
    {
      top: "24%",
      left: "75%",
      avatar: `https://i.pravatar.cc/150?img=${faker.number.int({ min: 1, max: 70 })}`,
    },
    {
      top: "57%",
      left: "95%",
      avatar: `https://i.pravatar.cc/150?img=${faker.number.int({ min: 1, max: 70 })}`,
    },
    {
      top: "80%",
      left: "81%",
      avatar: `https://i.pravatar.cc/150?img=${faker.number.int({ min: 1, max: 70 })}`,
    },
  ];

  return (
    <div
      data-slot="card-content"
      className={cn(
        "flex-col gap-4 bg-background flex items-center justify-center overflow-hidden rounded-lg p-0 aspect-video",
        className,
      )}
    >
      <div className="group relative flex aspect-16/9 w-full items-center justify-center">
        <div className="text-muted-foreground/20 h-full w-full">
          <svg
            width="512"
            height="256"
            viewBox="0 0 512 256"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="fade-top relative !h-full !w-full"
          >
            <path
              d="M254.884 128.439L386 53M254.884 128.439L201.555 210.908M254.884 128.439L122.687 71.6579M254.884 128.439L194.795 -24.3298M254.884 128.439L414 215M254.884 128.439L487.682 146.015M386 53L194.795 -24.3298M386 53L487.682 146.015M386 53L454.633 -18.922M201.555 210.908L414 215M201.555 210.908L122.687 71.6579M201.555 210.908L52.5 103.5M201.555 210.908L144 289.771M201.555 210.908H-49.9724M414 215L487.682 146.015M414 215L144 289.771M414 215L323.187 365.479M414 215L563.434 333.082M122.687 71.6579L52.5 103.5M122.687 71.6579L194.795 -24.3298M194.795 -24.3298L52.5 103.5M194.795 -24.3298L454.633 -18.922M194.795 -24.3298H-9.50954L52.5 103.5M52.5 103.5L-49.9724 210.908M487.682 146.015L614.552 365.479M487.682 146.015L679.2 188.425L454.633 -18.922M144 289.771L-49.9724 210.908"
              stroke="currentColor"
            ></path>
          </svg>
        </div>
        <div className="bg-background/20 absolute top-1/2 left-1/2 z-1 -translate-x-1/2 -translate-y-1/2 rounded-full p-2 transition-transform duration-300 group-hover:scale-110">
          <div className="glass-5 bg-background relative z-10 rounded-full p-3 shadow">
            <div
              data-slot="beam"
              className="relative after:content-[''] after:absolute after:inset-0 after:rounded-full after:scale-200 after:bg-radial after:from-brand/10 dark:after:from-brand/30 after:from-10% after:to-brand/0 after:to-60%"
            >
              <Logo className="h-8 w-8 text-brand" />
            </div>
          </div>
        </div>
        {dots.map((dot, index) => (
          <div
            key={index}
            className="glass-4 bg-background ring-background/50 absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full p-1.5 ring-secondary-300 ring-4 transition-transform duration-300 group-hover:scale-110"
            style={{ top: dot.top, left: dot.left }}
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={dot.avatar} alt={`User ${index + 1}`} />
              <AvatarFallback>U{index + 1}</AvatarFallback>
            </Avatar>
          </div>
        ))}
        <div
          data-slot="glow"
          className="absolute w-full top-[50%] pointer-events-none z-10 scale-x-[1.5] opacity-20 transition-all duration-300 group-hover:opacity-30"
        >
          <div className="from-brand-foreground/50 to-brand-foreground/0 absolute left-1/2 h-[256px] w-[60%] -translate-x-1/2 scale-[2.5] rounded-[50%] bg-radial from-10% to-60% opacity-20 sm:h-[512px] dark:opacity-100 -translate-y-1/2"></div>
          <div className="from-brand/30 to-brand-foreground/0 absolute left-1/2 h-[128px] w-[40%] -translate-x-1/2 scale-200 rounded-[50%] bg-radial from-10% to-60% opacity-20 sm:h-[256px] dark:opacity-100 -translate-y-1/2"></div>
        </div>
      </div>
    </div>
  );
}
