function Cluster({ count }: { count: number }) {
  let size = 20,
    bg = "bg-primary/60",
    opacity = 0.35;
  if (count >= 750) {
    size = 80;
    bg = "bg-primary";
    opacity = 1;
  } else if (count >= 100) {
    size = 60;
    bg = "bg-primary/90";
    opacity = 0.9;
  } else if (count >= 50) {
    size = 40;
    bg = "bg-primary/80";
    opacity = 0.75;
  } else if (count >= 25) {
    size = 32;
    bg = "bg-primary/75";
    opacity = 0.65;
  } else if (count >= 10) {
    size = 28;
    bg = "bg-primary/70";
    opacity = 0.55;
  } else if (count >= 5) {
    size = 24;
    bg = "bg-primary/65";
    opacity = 0.45;
  }
  return (
    <div
      className={`flex items-center justify-center rounded-full  bg-foreground/25   text-primary-foreground font-bold shadow-lg border-2 border-background backdrop-blur-sm rounded-full border shadow-xl ${bg} border-solid border-1 opacity-[${opacity}]`}
      style={{
        width: size * 2,
        height: size * 2,
        fontSize: size * 0.32 * 2,
      }}
    >
      {count}
    </div>
  );
}

export default Cluster;
