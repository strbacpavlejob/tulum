import { motion } from "framer-motion";
import { IconMapPin } from "@tabler/icons-react";
import Image from "next/image";

interface MarkerProps {
  image?: string;
  size?: "sm" | "md" | "xl";
}

const sizeConfig = {
  sm: {
    outer: "w-8 h-8",
    inner: "w-6 h-6 m-1",
    border: "border-2",
    icon: "w-3 h-3",
  },
  md: {
    outer: "w-12 h-12",
    inner: "w-10 h-10 m-1",
    border: "border-2",
    icon: "w-5 h-5",
  },
  xl: {
    outer: "w-20 h-20",
    inner: "w-16 h-16 m-2",
    border: "border-4",
    icon: "w-8 h-8",
  },
};

const Marker = ({ image, size = "xl" }: MarkerProps) => {
  const config = sizeConfig[size];

  return (
    <div className="flex items-center justify-center rounded-full ">
      <div className="relative w-full h-full flex items-center justify-center">
        <motion.div
          className={`absolute inset-0 ${config.outer} rounded-full bg-primary`}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className={`absolute inset-0 ${config.outer} rounded-full bg-primary`}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 0, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
        />
        {image ? (
          <motion.div
            className={`absolute inset-0 ${config.inner} rounded-full ${config.border} border-primary overflow-hidden bg-background`}
          >
            <Image
              src={image}
              alt="Marker"
              className="w-full h-full object-cover"
              width={200}
              height={200}
            />
          </motion.div>
        ) : (
          <motion.div
            className={`absolute inset-0 ${config.inner} rounded-full bg-muted flex items-center justify-center transition-all hover:bg-muted/80 hover:scale-105`}
          >
            <IconMapPin className={`${config.icon} text-muted-foreground/40`} />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Marker;
