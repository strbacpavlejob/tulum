import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import React from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, TouchableOpacity } from "react-native";
import { useNearbyEventPrompt } from "./use-nearby-event-prompt";

/**
 * "You're at Maskenbal. Join?" for a guest at an event they haven't joined
 * (QR-8), or the offer to look for it while the location isn't allowed yet.
 * A sheet at the bottom of the feed, like the reservation prompt.
 */
export function NearbyEventPrompt() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { prompt, locating, findMyEvent, join, dismiss, close } =
    useNearbyEventPrompt();

  if (!prompt) return null;

  const content =
    prompt.kind === "join"
      ? {
          title: t("nearbyJoinTitle", { event: prompt.event.title }),
          body: t("nearbyJoinBody"),
          primary: t("nearbyJoinCta"),
          onPrimary: join,
          onClose: dismiss,
        }
      : prompt.kind === "ask"
        ? {
            title: t("nearbyAskTitle"),
            body: t("nearbyAskBody"),
            primary: locating ? t("nearbyLocating") : t("nearbyAskCta"),
            onPrimary: () => void findMyEvent(),
            onClose: dismiss,
          }
        : {
            title: t("nearbyNoneTitle"),
            body: t("nearbyNoneBody"),
            primary: t("nearbyOk"),
            onPrimary: close,
            onClose: close,
          };
  const hasNotNow = prompt.kind !== "none-here";

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={content.onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: theme.gray5 + "99",
          justifyContent: "flex-end",
        }}
        onPress={content.onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: theme.backgroundStrong,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            gap: 16,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: theme.colorStrong,
              textAlign: "center",
            }}
          >
            {content.title}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: theme.gray6,
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            {content.body}
          </Text>
          <TouchableOpacity
            onPress={locating ? undefined : content.onPrimary}
            disabled={locating}
            style={{
              padding: 16,
              borderRadius: 50,
              alignItems: "center",
              backgroundColor: locating ? theme.gray3 : theme.color,
              marginTop: 4,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: locating ? theme.gray6 : theme.background,
              }}
            >
              {content.primary}
            </Text>
          </TouchableOpacity>
          {hasNotNow ? (
            <TouchableOpacity
              onPress={content.onClose}
              style={{ alignItems: "center" }}
            >
              <Text className="text-sm text-light-gray6 dark:text-dark-gray6">
                {t("nearbyNotNow")}
              </Text>
            </TouchableOpacity>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
