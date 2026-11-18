import type { Dispatch, SetStateAction } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "@/hooks/useAppTheme";

interface DeleteAccountDialogProps {
  showDeleteAlert: boolean;
  deletingAccount: boolean;
  setShowDeleteAlert: Dispatch<SetStateAction<boolean>>;
  handleDeleteAccount: () => Promise<void>;
}

export function DeleteAccountDialog({
  showDeleteAlert,
  deletingAccount,
  setShowDeleteAlert,
  handleDeleteAccount,
}: DeleteAccountDialogProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  return (
    <AlertDialog
      open={showDeleteAlert}
      onOpenChange={(open) => {
        // Stays open while the account is being deleted.
        if (!deletingAccount) setShowDeleteAlert(open);
      }}
    >
      {/* Colors come from the theme: this app's Tailwind config has no
            bg-background or bg-destructive, so the dialog was see-through. */}
      <AlertDialogContent
        style={{
          backgroundColor: theme.backgroundPopover,
          borderColor: theme.border,
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle style={{ color: theme.colorStrong }}>
            {t("deleteAlertTitle")}
          </AlertDialogTitle>

          <AlertDialogDescription style={{ color: theme.colorMuted }}>
            {t("deleteAlertDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={deletingAccount}
            style={{
              borderColor: theme.border,
              backgroundColor: theme.backgroundStrong,
            }}
          >
            <Text style={{ color: theme.colorStrong }}>{t("cancel")}</Text>
          </AlertDialogCancel>

          {/* A plain Button: AlertDialogAction would close the dialog
                before the deletion has finished. */}
          <Button
            disabled={deletingAccount}
            onPress={() => {
              void handleDeleteAccount();
            }}
            style={{ backgroundColor: theme.destructive }}
          >
            {deletingAccount ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : null}

            <Text style={{ color: "#fff" }}>
              {deletingAccount ? t("deletingAccount") : t("confirm")}
            </Text>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
