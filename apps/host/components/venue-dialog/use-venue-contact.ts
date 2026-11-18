"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import * as api from "@/lib/api-client";
import { EMPTY_CONTACT_FORM, type VenueContactForm } from "./venue-form";

/**
 * The venue's contact while the dialog edits it: loaded when the dialog opens
 * on a venue, imported from its Instagram profile, or removed.
 */
export function useVenueContact(isOpen: boolean, venueId: string | undefined) {
  const { t } = useTranslation();
  const [instagramHandle, setInstagramHandle] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState<VenueContactForm>({
    ...EMPTY_CONTACT_FORM,
  });
  const [hasExistingContact, setHasExistingContact] = useState(false);
  const [isDeletingContact, setIsDeletingContact] = useState(false);
  const [isImportingContact, setIsImportingContact] = useState(false);

  // Fetch venue contact when editing
  useEffect(() => {
    if (!isOpen || !venueId) return;

    let cancelled = false;
    api
      .getVenueContact(venueId)
      .then((contact: unknown) => {
        if (cancelled) return;
        const c = contact as {
          instagram_handle?: string | null;
          phone_number?: string;
          is_phone?: boolean;
          is_viber?: boolean;
          is_sms?: boolean;
          is_whatsapp?: boolean;
          is_instagram?: boolean;
        } | null;
        if (c) {
          setHasExistingContact(true);
          setInstagramHandle(c.instagram_handle ?? null);
          setContactForm({
            phone_number: c.phone_number ?? "",
            is_phone: c.is_phone ?? false,
            is_viber: c.is_viber ?? false,
            is_sms: c.is_sms ?? false,
            is_whatsapp: c.is_whatsapp ?? false,
            instagram_handle: c.instagram_handle ?? "",
            is_instagram: c.is_instagram ?? !!c.instagram_handle,
          });
        } else {
          setHasExistingContact(false);
          setInstagramHandle(null);
          setContactForm({ ...EMPTY_CONTACT_FORM });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setInstagramHandle(null);
          setHasExistingContact(false);
        }
      });

    return () => {
      cancelled = true;
      setInstagramHandle(null);
      setHasExistingContact(false);
    };
  }, [isOpen, venueId]);

  const handleImportContactFromInstagram = async () => {
    if (!venueId || !contactForm.instagram_handle.trim()) return;
    setIsImportingContact(true);
    try {
      const contact = await api.importContactFromInstagram(
        venueId,
        contactForm.instagram_handle.trim(),
      );
      setContactForm({
        phone_number: contact.phone_number ?? "",
        is_phone: contact.is_phone ?? false,
        is_viber: contact.is_viber ?? false,
        is_sms: contact.is_sms ?? false,
        is_whatsapp: contact.is_whatsapp ?? false,
        instagram_handle:
          contact.instagram_handle ?? contactForm.instagram_handle,
        is_instagram: contact.is_instagram ?? true,
      });
      setHasExistingContact(true);
      setInstagramHandle(
        contact.instagram_handle ?? contactForm.instagram_handle,
      );
      toast.success(
        t("venueDialog.toast.contactImported") ??
          "Contact imported from Instagram",
      );
    } catch (err) {
      toast.error(
        (err as Error).message ??
          t("venueDialog.toast.contactImportError") ??
          "Failed to import contact from Instagram",
      );
    } finally {
      setIsImportingContact(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!venueId) return;
    setIsDeletingContact(true);
    try {
      await api.deleteVenueContact(venueId);
      setHasExistingContact(false);
      setInstagramHandle(null);
      setContactForm({ ...EMPTY_CONTACT_FORM });
      toast.success("Contact removed");
    } catch {
      toast.error("Failed to remove contact");
    } finally {
      setIsDeletingContact(false);
    }
  };

  return {
    instagramHandle,
    contactForm,
    setContactForm,
    hasExistingContact,
    setHasExistingContact,
    isDeletingContact,
    isImportingContact,
    handleImportContactFromInstagram,
    handleDeleteContact,
  };
}
