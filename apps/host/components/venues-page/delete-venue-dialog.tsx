"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";

interface DeleteVenueDialogProps {
  venueToDelete: string | null;
  setVenueToDelete: Dispatch<SetStateAction<string | null>>;
  handleDeleteConfirm: () => Promise<void>;
}

export function DeleteVenueDialog({
  venueToDelete,
  setVenueToDelete,
  handleDeleteConfirm,
}: DeleteVenueDialogProps) {
  const { t } = useTranslation();
  return (
    <AlertDialog
      open={venueToDelete !== null}
      onOpenChange={(open) => !open && setVenueToDelete(null)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("dashboard.venuesPage.deleteConfirmation.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("dashboard.venuesPage.deleteConfirmation.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {t("dashboard.venuesPage.deleteConfirmation.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDeleteConfirm}
          >
            {t("dashboard.venuesPage.deleteConfirmation.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
