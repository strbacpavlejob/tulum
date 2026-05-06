import Marker from "./common/marker";
import { Ripple } from "./ui/ripple";

function BoostedEvent() {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden [mask-image:linear-gradient(to_top,transparent_10%,#000_100%)] transition-all duration-300 ease-out group-hover:scale-105">
      <Ripple mainCircleSize={20} mainCircleOpacity={0.5} numCircles={5} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-20 h-20">
        <Marker size="xl" />
      </div>
    </div>
  );
}

export default BoostedEvent;
