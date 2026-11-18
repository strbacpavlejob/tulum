"use client";

import { useState } from "react";

interface ImageValidation {
  valid: boolean;
  error?: string;
}

/**
 * A picture chosen for upload and its preview: a file is checked with
 * `validate`, kept for the upload and shown as a data URL. A file that fails
 * the check is refused with an alert.
 */
export function useImageFile(validate: (file: File) => ImageValidation) {
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleFileChange = async (file: File | null) => {
    if (!file) {
      setImageFile(null);
      setPicturePreview(null);
      return;
    }

    // Validate image
    const validation = validate(file);
    if (!validation.valid) {
      alert(validation.error);
      setImageFile(null);
      setPicturePreview(null);
      return;
    }

    // Store the file for later upload
    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPicturePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return {
    picturePreview,
    setPicturePreview,
    imageFile,
    setImageFile,
    handleFileChange,
  };
}
