import type { RefObject } from "react";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { submitBugReport } from "@/lib/api";
import { toast } from "sonner-native";
import { Send } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMemo, useState } from "react";
import { renderSheetBackdrop } from "./SheetBackdrop";
import { useAuth } from "@clerk/expo";

interface BugReportSheetProps {
  bugSheetRef: RefObject<BottomSheetModal | null>;
}

export function BugReportSheet({ bugSheetRef }: BugReportSheetProps) {
  const [bugText, setBugText] = useState("");
  const [sendingBug, setSendingBug] = useState(false);
  const bugSnapPoints = useMemo(() => ["45%"], []);
  const { getToken } = useAuth();
  const { t } = useTranslation();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <BottomSheetModal
      ref={bugSheetRef}
      snapPoints={bugSnapPoints}
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
          {t("reportBug")}
        </Text>

        <Textarea
          inBottomSheet
          value={bugText}
          onChangeText={setBugText}
          placeholder={t("bugReportPlaceholder")}
          className="max-h-[140px] flex-1"
        />

        <Button
          disabled={!bugText.trim() || sendingBug}
          onPress={async () => {
            const description = bugText.trim();

            if (!description || sendingBug) {
              return;
            }

            setSendingBug(true);

            try {
              const token = await getToken();

              await submitBugReport(token ?? undefined, {
                description,
                additional_info: null,
              });

              setBugText("");
              bugSheetRef.current?.close();
              toast.success(t("bugReportSent"));
            } catch (error) {
              console.error("Failed to send bug report", error);

              // A toast, not Alert.alert: Alert.alert does nothing on web.
              // The draft stays in the sheet for another try.
              toast.error(t("sendFailed"), {
                description: t("bugReportNotSent"),
              });
            } finally {
              setSendingBug(false);
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
