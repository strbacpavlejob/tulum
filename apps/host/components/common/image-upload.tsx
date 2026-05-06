"use client";

import { useState } from "react";
import Image from "next/image";
import { IconPhoto } from "@tabler/icons-react";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";

interface ImageUploadProps {
  type: "venue" | "event";
  label: string;
  description: string;
  onFileChange: (file: File | null) => void;
  preview: string | null;
  className?: string;
}

export function ImageUpload({
  type,
  label,
  description,
  onFileChange,
  preview,
  className = "",
}: ImageUploadProps) {
  const [internalPreview, setInternalPreview] = useState<string | null>(
    preview,
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setInternalPreview(null);
      onFileChange(null);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setInternalPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Pass file to parent
    onFileChange(file);
  };

  const inputId = `picture-${type}`;
  const isCircular = type === "venue";
  const displayPreview = preview || internalPreview;

  return (
    <Field className={className}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="flex justify-center">
        <div
          onClick={() => document.getElementById(inputId)?.click()}
          className={`cursor-pointer overflow-hidden bg-muted transition-all hover:ring-2 hover:ring-primary hover:ring-offset-2 flex items-center justify-center group ${
            isCircular
              ? "w-32 h-32 rounded-full hover:scale-105"
              : "w-full aspect-video rounded-lg hover:scale-[1.02]"
          }`}
          title={`Click to upload ${type} picture`}
        >
          {displayPreview ? (
            <Image
              src={displayPreview}
              alt="Preview"
              width={isCircular ? 128 : 500}
              height={isCircular ? 128 : 281}
              className="w-full h-full object-cover"
            />
          ) : (
            <IconPhoto
              className={`text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors ${
                isCircular ? "w-12 h-12" : "w-16 h-16"
              }`}
            />
          )}
        </div>
      </div>
      <FieldDescription className="text-center">{description}</FieldDescription>
    </Field>
  );
}
