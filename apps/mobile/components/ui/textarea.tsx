import { cn } from "@/lib/utils";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { cssInterop } from "nativewind";
import { Platform, TextInput } from "react-native";

// The className support NativeWind gives TextInput.
cssInterop(BottomSheetTextInput, {
  className: { target: "style", nativeStyleToProp: { textAlign: true } },
});

type TextareaProps = React.ComponentProps<typeof TextInput> & {
  /**
   * For fields inside a @gorhom/bottom-sheet sheet, which only moves up with
   * the keyboard for its own input. Browsers handle the keyboard themselves.
   */
  inBottomSheet?: boolean;
};

function Textarea({
  className,
  inBottomSheet = false,
  multiline = true,
  numberOfLines = Platform.select({ web: 2, native: 8 }),
  placeholderClassName,
  ...props
}: TextareaProps) {
  const isDisabled = props.editable === false;
  const Field = (
    inBottomSheet && Platform.OS !== "web" ? BottomSheetTextInput : TextInput
  ) as typeof TextInput;

  return (
    <Field
      className={cn(
        // Layout
        "min-h-16 w-full rounded-2xl border px-3 py-2 text-base md:text-sm",

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
            "field-sizing-content resize-y outline-none",
            "transition-[color,box-shadow]",

            // Selection
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

            // Disabled web behavior
            isDisabled &&
              "disabled:pointer-events-none disabled:cursor-not-allowed",
          ),

          // On native selection: only moves the text color to selectionColor;
          // a selection:bg- class becomes the background.
          native:
            "selection:text-light-primary dark:selection:text-dark-primary",
        }),

        className,
      )}
      placeholderClassName={cn(
        "text-light-colorMuted/50 dark:text-dark-colorMuted/50",
        placeholderClassName,
      )}
      multiline={multiline}
      numberOfLines={numberOfLines}
      textAlignVertical="top"
      {...props}
    />
  );
}

export { Textarea };
