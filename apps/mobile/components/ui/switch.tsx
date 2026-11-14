import { cn } from '@/lib/utils';
import * as SwitchPrimitives from '@rn-primitives/switch';
import { Platform } from 'react-native';

// The template's colours (bg-primary, bg-input, bg-background) aren't
// defined in this app, so the switch drew nothing; it uses the app's own,
// as ui/button does (BUG-050).
function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitives.Root>) {
  return (
    <SwitchPrimitives.Root
      className={cn(
        'flex h-6 w-10 shrink-0 flex-row items-center rounded-full border border-transparent px-0.5',
        Platform.select({
          web: 'peer inline-flex outline-none transition-all disabled:cursor-not-allowed',
        }),
        props.checked
          ? 'bg-light-color dark:bg-dark-color'
          : 'bg-light-gray5 dark:bg-dark-gray5',
        props.disabled && 'opacity-50',
        className
      )}
      {...props}>
      <SwitchPrimitives.Thumb
        className={cn(
          'size-5 rounded-full bg-white shadow-sm shadow-black/20 transition-transform',
          Platform.select({
            web: 'pointer-events-none block ring-0',
          }),
          props.checked ? 'translate-x-4' : 'translate-x-0'
        )}
      />
    </SwitchPrimitives.Root>
  );
}

export { Switch };
