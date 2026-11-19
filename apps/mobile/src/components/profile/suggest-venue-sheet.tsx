import type { RefObject } from "react";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner-native";
import { submitVenueSuggestion } from "@/lib/api";
import { Send } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMemo, useState } from "react";
import { renderSheetBackdrop } from "./sheet-backdrop";
import { useAuth } from "@clerk/expo";

interface SuggestVenueSheetProps {
  venueSheetRef: RefObject<BottomSheetModal | null>;
}

export function SuggestVenueSheet({ venueSheetRef }: SuggestVenueSheetProps) {
  const [venueName, setVenueName] = useState("");
  const [venueInstagram, setVenueInstagram] = useState("");
  const [venueNotes, setVenueNotes] = useState("");
  const [sendingVenue, setSendingVenue] = useState(false);
  const venueSnapPoints = useMemo(() => ["55%"], []);
  const { getToken } = useAuth();
  const { t } = useTranslation();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <BottomSheetModal
      ref={venueSheetRef}
      snapPoints={venueSnapPoints}
      keyboardBlurBehavior="restore"
      backdropComponent={renderSheetBackdrop}
      backgroundStyle={{
        backgroundColor: theme.backgroundPopover,
      }}
      handleIndicatorStyle={{
        backgroundColor: theme.gray5,
      }}
    >
      <BottomSheetView
        style={{
          flex: 1,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 20,
        }}
      >
        <Text
          style={{
            marginTop: 4,
            marginBottom: 12,
            fontSize: 18,
            fontWeight: "700",
            color: theme.colorStrong,
          }}
        >
          {t("suggestVenue")}
        </Text>

        <Textarea
          inBottomSheet
          value={venueName}
          onChangeText={setVenueName}
          placeholder={t("venueNamePlaceholder")}
          className="mb-2"
        />

        <Textarea
          inBottomSheet
          value={venueInstagram}
          onChangeText={setVenueInstagram}
          placeholder={t("instagramHandlePlaceholder")}
          className="mb-2"
        />

        <Textarea
          inBottomSheet
          value={venueNotes}
          onChangeText={setVenueNotes}
          placeholder={t("additionalInfoPlaceholder")}
          className="max-h-[140px] flex-1"
        />

        <Button
          disabled={sendingVenue}
          onPress={async () => {
            if (sendingVenue) {
              return;
            }

            const name = venueName.trim();

            // Toasts, not Alert.alert: Alert.alert does nothing on web.
            if (!name) {
              toast.error(t("nameRequired"), {
                description: t("pleaseProvideVenueName"),
              });
              return;
            }

            setSendingVenue(true);

            try {
              const token = await getToken();

              await submitVenueSuggestion(token ?? undefined, {
                name,
                // The field asks for the handle without "@"; drop one
                // typed anyway.
                instagram_handle:
                  venueInstagram.trim().replace(/^@+/, "").trim() || null,
                additionalInfo: venueNotes.trim() || null,
              });

              setVenueName("");
              setVenueInstagram("");
              setVenueNotes("");
              venueSheetRef.current?.close();
              toast.success(t("venueSuggestionSent"));
            } catch (error) {
              console.error("Failed to send venue suggestion", error);

              // The draft stays in the sheet for another try.
              toast.error(t("sendFailed"), {
                description: t("venueSuggestionNotSent"),
              });
            } finally {
              setSendingVenue(false);
            }
          }}
          className="mt-4 w-full gap-2"
        >
          <Send size={16} color="#fff" />

          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: "#fff",
            }}
          >
            {t("send")}
          </Text>
        </Button>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
