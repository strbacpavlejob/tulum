"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Download, RefreshCw } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import type { VenueContactForm } from "./venue-form";

interface VenueContactSectionProps {
  hasExistingContact: boolean;
  handleDeleteContact: () => Promise<void>;
  isDeletingContact: boolean;
  contactForm: VenueContactForm;
  setContactForm: Dispatch<SetStateAction<VenueContactForm>>;
  isImportingContact: boolean;
  handleImportContactFromInstagram: () => Promise<void>;
}

export function VenueContactSection({
  hasExistingContact,
  handleDeleteContact,
  isDeletingContact,
  contactForm,
  setContactForm,
  isImportingContact,
  handleImportContactFromInstagram,
}: VenueContactSectionProps) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">
          {t("venueDialog.fields.contact") || "Contact Information"}
        </Label>
        {hasExistingContact && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDeleteContact}
            disabled={isDeletingContact}
          >
            {isDeletingContact
              ? (t("venueDialog.buttons.removingContact") ?? "Removing…")
              : (t("venueDialog.buttons.removeContact") ?? "Remove Contact")}
          </Button>
        )}
      </div>

      {/* Phone Number */}
      <div className="grid gap-2">
        <Label htmlFor="contact_phone">
          {t("venueDialog.fields.phoneNumber") || "Phone Number"}
        </Label>
        <Input
          id="contact_phone"
          placeholder="+1234567890"
          value={contactForm.phone_number}
          onChange={(e) =>
            setContactForm((prev) => ({
              ...prev,
              phone_number: e.target.value,
            }))
          }
        />
      </div>

      {/* Contact Method Toggles */}
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            { key: "is_phone", label: "Phone" },
            { key: "is_viber", label: "Viber" },
            { key: "is_sms", label: "SMS" },
            { key: "is_whatsapp", label: "WhatsApp" },
          ] as const
        ).map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <Switch
              id={`contact_${key}`}
              size="sm"
              checked={contactForm[key]}
              onCheckedChange={(v) =>
                setContactForm((prev) => ({ ...prev, [key]: v }))
              }
            />
            <Label htmlFor={`contact_${key}`}>{label}</Label>
          </div>
        ))}
      </div>

      {/* Instagram */}
      <div className="grid gap-2">
        <div className="flex items-center gap-2">
          <Switch
            id="contact_is_instagram"
            size="sm"
            checked={contactForm.is_instagram}
            onCheckedChange={(v) =>
              setContactForm((prev) => ({
                ...prev,
                is_instagram: v,
                instagram_handle: v ? prev.instagram_handle : "",
              }))
            }
          />
          <Label htmlFor="contact_is_instagram">Instagram</Label>
        </div>
        {contactForm.is_instagram && (
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground text-sm">@</span>
            <Input
              placeholder="instagram_handle"
              value={contactForm.instagram_handle}
              onChange={(e) =>
                setContactForm((prev) => ({
                  ...prev,
                  instagram_handle: e.target.value,
                }))
              }
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0"
              disabled={
                isImportingContact || !contactForm.instagram_handle.trim()
              }
              onClick={handleImportContactFromInstagram}
            >
              {isImportingContact ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isImportingContact
                ? (t("venueDialog.buttons.importingContact") ?? "Importing…")
                : (t("venueDialog.buttons.importContact") ?? "Import")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
