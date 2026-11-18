import * as Linking from "expo-linking";
import { VenueContact } from "@/types/event";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { MessageCircle, Phone, Send } from "lucide-react-native";
import { Modal, Pressable, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/ui/text";

export function normalizePhone(raw: string): string {
  return raw.replace(/[^+0-9]/g, "");
}

export function openPhone(phone: string) {
  Linking.openURL(`tel:${normalizePhone(phone)}`);
}

export function openSms(phone: string) {
  Linking.openURL(`sms:${normalizePhone(phone)}`);
}

export function openViber(phone: string) {
  Linking.openURL(`viber://chat?number=${normalizePhone(phone)}`).catch(() =>
    Linking.openURL(`tel:${normalizePhone(phone)}`),
  );
}

export function openWhatsapp(phone: string) {
  const number = normalizePhone(phone).replace(/^\+/, "");
  Linking.openURL(`https://wa.me/${number}`).catch(() =>
    Linking.openURL(`tel:${normalizePhone(phone)}`),
  );
}

export function openInstagramDm(handle: string) {
  const username = handle.replace(/^@/, "");
  Linking.openURL(`instagram://user?username=${username}`).catch(() =>
    Linking.openURL(`https://instagram.com/${username}`),
  );
}

export interface ReservationModalProps {
  visible: boolean;
  contact: VenueContact;
  onClose: () => void;
  onConfirm: () => void;
}

export function ReservationModal({
  visible,
  contact,
  onClose,
  onConfirm,
}: ReservationModalProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [contacted, setContacted] = useState(false);

  const contactMethods: {
    key: string;
    label: string;
    icon: React.ReactNode;
    onPress: () => void;
  }[] = [];

  if (contact.isPhone) {
    contactMethods.push({
      key: "phone",
      label: t("call"),
      icon: <Phone size={20} color={theme.color} />,
      onPress: () => {
        openPhone(contact.phoneNumber);
        setContacted(true);
      },
    });
  }
  if (contact.isSms) {
    contactMethods.push({
      key: "sms",
      label: t("sms"),
      icon: <MessageCircle size={20} color={theme.color} />,
      onPress: () => {
        openSms(contact.phoneNumber);
        setContacted(true);
      },
    });
  }
  if (contact.isViber) {
    contactMethods.push({
      key: "viber",
      label: t("viber"),
      icon: <Send size={20} color="#7360f2" />,
      onPress: () => {
        openViber(contact.phoneNumber);
        setContacted(true);
      },
    });
  }
  if (contact.isWhatsapp) {
    contactMethods.push({
      key: "whatsapp",
      label: t("whatsapp"),
      icon: <MessageCircle size={20} color="#25d366" />,
      onPress: () => {
        openWhatsapp(contact.phoneNumber);
        setContacted(true);
      },
    });
  }
  if (contact.isInstagram && contact.instagramHandle) {
    const handle = contact.instagramHandle;
    contactMethods.push({
      key: "instagram",
      label: t("instagramDm"),
      icon: <Send size={20} color="#e1306c" />,
      onPress: () => {
        openInstagramDm(handle);
        setContacted(true);
      },
    });
  }

  const methodLabels = contactMethods.map((m) => m.label).join(", ");

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: theme.gray5 + "99",
          justifyContent: "flex-end",
        }}
        onPress={onClose}
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
            {t("reservationRequired")}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: theme.gray6,
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            {t("reservationDescription", { methods: methodLabels })}
          </Text>

          {/* Contact method buttons */}
          <View style={{ gap: 10 }}>
            {contactMethods.map((m) => (
              <TouchableOpacity
                key={m.key}
                onPress={m.onPress}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: theme.background,
                  borderWidth: 1,
                  borderColor: theme.gray3,
                }}
              >
                {m.icon}
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: theme.colorStrong,
                  }}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Confirm button — enabled once user has tapped a contact method */}
          <TouchableOpacity
            onPress={contacted ? onConfirm : undefined}
            style={{
              padding: 16,
              borderRadius: 50,
              alignItems: "center",
              backgroundColor: contacted ? theme.color : theme.gray3,
              marginTop: 4,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: contacted ? theme.background : theme.gray6,
              }}
            >
              {contacted ? t("madeReservationAttend") : t("contactVenueFirst")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={{ alignItems: "center" }}>
            <Text className="text-sm text-light-gray6 dark:text-dark-gray6">
              {t("cancel")}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
