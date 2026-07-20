import { cn } from "@/lib/utils";
import { Platform, TextInput } from "react-native";

function Input({
  className,
  ...props
}: React.ComponentProps<typeof TextInput>) {
  const isDisabled = props.editable === false;

  return (
    <TextInput
      className={cn(
        // Layout
        "h-10 w-full min-w-0 rounded-2xl border px-3 py-1 text-base leading-5 sm:h-9",

        // App theme
        "bg-light-backgroundCard dark:bg-dark-backgroundAccent",
        "border-light-input dark:border-dark-input",
        "text-light-colorStrong dark:text-dark-colorStrong",
        "placeholder:text-light-colorMuted/50 dark:placeholder:text-dark-colorMuted/50",

        // Shadow
        "shadow-sm shadow-light-shadowColor dark:shadow-dark-shadowColor",

        // Disabled
        isDisabled && "opacity-50",

        Platform.select({
          web: cn(
            "outline-none transition-[color,box-shadow] md:text-sm",
            "selection:bg-light-primary selection:text-light-primaryForeground",
            "dark:selection:bg-dark-primary dark:selection:text-dark-primaryForeground",

            // Focus
            "focus-visible:border-light-colorFocus",
            "dark:focus-visible:border-dark-colorFocus",
            "focus-visible:ring-2",
            "focus-visible:ring-light-color025",
            "dark:focus-visible:ring-dark-color025",

            // Invalid
            "aria-invalid:border-light-destructive",
            "dark:aria-invalid:border-dark-destructive",
            "aria-invalid:ring-light-red4/40",
            "dark:aria-invalid:ring-dark-red4/40",

            // Disabled web behaviour
            isDisabled &&
              "disabled:pointer-events-none disabled:cursor-not-allowed",
          ),

          native: cn(
            "selection:bg-light-primary dark:selection:bg-dark-primary",
          ),
        }),

        className,
      )}
      placeholderTextColor={undefined}
      {...props}
    />
  );
}

export { Input };
