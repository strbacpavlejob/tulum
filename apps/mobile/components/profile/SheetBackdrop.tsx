import { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import type React from "react";

/** The dimmed backdrop behind the profile screen's bottom sheets. */
export const renderSheetBackdrop = (
  props: React.ComponentProps<typeof BottomSheetBackdrop>,
) => (
  <BottomSheetBackdrop
    {...props}
    disappearsOnIndex={-1}
    appearsOnIndex={0}
    opacity={0.5}
  />
);
