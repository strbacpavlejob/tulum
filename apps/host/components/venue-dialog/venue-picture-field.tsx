"use client";

import { ImageUpload } from "@/components/common/image-upload";
import { Button } from "@/components/ui/button";
import { Instagram, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

interface VenuePictureFieldProps {
  handleFileChange: (file: File | null) => Promise<void>;
  picturePreview: string | null;
  isEditing: boolean;
  instagramHandle: string | null;
  isRefreshingInstagram: boolean;
  handleRefreshInstagramPicture: () => Promise<void>;
}

export function VenuePictureField({
  handleFileChange,
  picturePreview,
  isEditing,
  instagramHandle,
  isRefreshingInstagram,
  handleRefreshInstagramPicture,
}: VenuePictureFieldProps) {
  const { t } = useTranslation();
  return (
    <>
      {/* Picture Upload */}
      <ImageUpload
        type="venue"
        label={t("venueDialog.fields.picture") || "Picture"}
        description={
          t("venueDialog.fields.pictureDescription") ||
          "Upload a picture of the venue (optional)"
        }
        onFileChange={handleFileChange}
        preview={picturePreview}
      />

      {/* Refresh picture from Instagram (only when venue has instagram contact) */}
      {isEditing && instagramHandle && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit gap-2"
          disabled={isRefreshingInstagram}
          onClick={handleRefreshInstagramPicture}
        >
          {isRefreshingInstagram ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Instagram className="h-4 w-4" />
          )}
          {isRefreshingInstagram
            ? (t("venueDialog.buttons.refreshingInstagram") ?? "Refreshing…")
            : (t("venueDialog.buttons.refreshInstagram") ??
              `Refresh picture from @${instagramHandle}`)}
        </Button>
      )}
    </>
  );
}
