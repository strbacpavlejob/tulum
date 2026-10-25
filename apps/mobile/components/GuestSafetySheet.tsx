import SettingsRow from "@/components/SettingsRow";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { useAppTheme } from "@/hooks/useAppTheme";
import {
  blockGuest,
  GUEST_REPORT_REASONS,
  reportGuest,
  type GuestReportReason,
} from "@/lib/api";
import { useAuth } from "@clerk/expo";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Ban, Check, Flag } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";

const REASON_LABELS: Record<GuestReportReason, string> = {
  harassment: "reportReasonHarassment",
  inappropriate: "reportReasonInappropriate",
  fake_profile: "reportReasonFakeProfile",
  spam: "reportReasonSpam",
  underage: "reportReasonUnderage",
  unsafe_meeting: "reportReasonUnsafeMeeting",
  other: "reportReasonOther",
};

/** The API keeps up to this many characters of a report's details. */
const DETAILS_MAX_LENGTH = 1000;

type Step = "menu" | "report" | "block";

// One height per step. The report step's list scrolls, and a gorhom sheet
// only scrolls at its top snap point, so each step has just one.
const SNAP_POINTS: Record<Step, string[]> = {
  menu: ["45%"],
  block: ["50%"],
  report: ["90%"],
};

type GuestSafetySheetProps = {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  /** The guest to report or block. */
  guest: { id: string; name: string } | null;
  /** Where it opened: a guest's profile, or the chat with a match. */
  source: "profile" | "chat";
  eventId?: string | null;
  /** From a chat: the report keeps a copy of the chat's last messages. */
  matchId?: number | null;
  /** Called after a block or a report (which blocks too). */
  onBlocked: (guestId: string) => void;
};

/**
 * Report or block another guest (TASK-001). A block works both ways and
 * can't be undone in the app; a report blocks as well, and the Tulum team
 * reviews it.
 */
export default function GuestSafetySheet({
  sheetRef,
  guest,
  source,
  eventId,
  matchId,
  onBlocked,
}: GuestSafetySheetProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { getToken } = useAuth();

  const [step, setStep] = useState<Step>("menu");
  const [reason, setReason] = useState<GuestReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  const snapPoints = useMemo(() => SNAP_POINTS[step], [step]);
  const name = guest?.name ?? "";
  const detailsRequired = reason === "other";
  const canSendReport =
    reason !== null &&
    (!detailsRequired || details.trim().length > 0) &&
    !sending;

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  );

  const reset = () => {
    setStep("menu");
    setReason(null);
    setDetails("");
    setSending(false);
  };

  const done = (message: string) => {
    if (!guest) return;
    sheetRef.current?.dismiss();
    toast.success(message);
    onBlocked(guest.id);
  };

  const handleBlock = async () => {
    if (!guest || sending) return;
    setSending(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("No authentication token available");
      await blockGuest(token, guest.id);
      done(t("guestBlocked", { name }));
    } catch (error) {
      console.error("Failed to block guest", error);
      // A toast, not Alert.alert: Alert.alert does nothing on web.
      toast.error(t("blockFailed"));
      setSending(false);
    }
  };

  const handleReport = async () => {
    if (!guest || !reason || !canSendReport) return;
    setSending(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("No authentication token available");
      await reportGuest(token, {
        reportedUserId: guest.id,
        reason,
        source,
        details: details.trim() || null,
        eventId: eventId ?? null,
        matchId: matchId ?? null,
      });
      done(t("reportSent", { name }));
    } catch (error) {
      console.error("Failed to report guest", error);
      // The answers stay in the sheet for another try.
      toast.error(t("sendFailed"), { description: t("reportNotSent") });
      setSending(false);
    }
  };

  const titleStyle = {
    marginTop: 4,
    marginBottom: 6,
    fontSize: 18,
    fontWeight: "700" as const,
    color: theme.colorStrong,
  };
  const noteStyle = {
    marginBottom: 12,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colorMuted,
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.backgroundPopover }}
      handleIndicatorStyle={{ backgroundColor: theme.gray5 }}
      onDismiss={reset}
    >
      <BottomSheetScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 20,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {step === "menu" ? (
          <View>
            <Text style={titleStyle}>{name}</Text>
            <Text style={noteStyle}>{t("safetySheetNote", { name })}</Text>
            <SettingsRow
              icon={Flag}
              title={t("reportAction")}
              subtitle={t("reportActionHint")}
              onPress={() => setStep("report")}
            />
            <SettingsRow
              icon={Ban}
              title={t("block")}
              subtitle={t("blockActionHint")}
              onPress={() => setStep("block")}
            />
          </View>
        ) : null}

        {step === "block" ? (
          <View>
            <Text style={titleStyle}>{t("blockConfirmTitle", { name })}</Text>
            <Text style={noteStyle}>
              {t("blockConfirmDescription", { name })}
            </Text>
            <Button
              disabled={sending}
              onPress={() => {
                void handleBlock();
              }}
              className="mt-2 w-full gap-2"
              style={{ backgroundColor: theme.destructive }}
            >
              <Ban size={16} color="#fff" />
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
                {t("block")}
              </Text>
            </Button>
            <Button
              variant="ghost"
              disabled={sending}
              onPress={() => setStep("menu")}
              className="mt-2 w-full"
            >
              <Text style={{ fontSize: 16, color: theme.colorStrong }}>
                {t("cancel")}
              </Text>
            </Button>
          </View>
        ) : null}

        {step === "report" ? (
          <View>
            <Text style={titleStyle}>{t("reportTitle", { name })}</Text>
            <Text style={noteStyle}>{t("reportDescription", { name })}</Text>

            {GUEST_REPORT_REASONS.map((value) => {
              const selected = reason === value;
              return (
                <Button
                  key={value}
                  variant="ghost"
                  onPress={() => setReason(value)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  className="mb-0.5 h-auto w-full justify-between rounded-xl px-3 py-3 sm:h-auto"
                  style={
                    selected ? { backgroundColor: theme.color025 } : undefined
                  }
                >
                  <Text
                    style={{
                      flex: 1,
                      textAlign: "left",
                      fontSize: 15,
                      color: selected ? theme.color : theme.colorStrong,
                    }}
                  >
                    {t(REASON_LABELS[value])}
                  </Text>
                  {selected ? <Check size={18} color={theme.color} /> : null}
                </Button>
              );
            })}

            {/* Uncontrolled: with value= the sheet's renders lagged behind
                fast typing and put back the previous text, dropping
                characters on web. It remounts empty after the sheet closes. */}
            <Textarea
              defaultValue={details}
              onChangeText={setDetails}
              maxLength={DETAILS_MAX_LENGTH}
              placeholder={
                detailsRequired
                  ? t("reportDetailsRequired")
                  : t("reportDetailsPlaceholder")
              }
              className="mt-3 min-h-[90px]"
            />

            <Button
              disabled={!canSendReport}
              onPress={() => {
                void handleReport();
              }}
              className="mt-4 w-full gap-2"
              style={{ backgroundColor: theme.destructive }}
            >
              <Flag size={16} color="#fff" />
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
                {t("reportSend")}
              </Text>
            </Button>
            <Button
              variant="ghost"
              disabled={sending}
              onPress={() => setStep("menu")}
              className="mt-2 w-full"
            >
              <Text style={{ fontSize: 16, color: theme.colorStrong }}>
                {t("back")}
              </Text>
            </Button>
          </View>
        ) : null}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
