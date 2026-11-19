import { cn } from '@/lib/utils';
import { Platform, View } from 'react-native';

function Skeleton({
  className,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      className={cn(
        'bg-accent rounded-md',
        // On native, NativeWind's animate- classes write Reanimated values during
        // render, and Reanimated warns about every write.
        Platform.select({ web: 'animate-pulse' }),
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
