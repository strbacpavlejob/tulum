"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDownIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { UseFormSetValue } from "react-hook-form";
import type { EventFormData, EventStatus } from "./event-form";

interface EventStatusButtonProps {
  watchedStatus: EventStatus;
  setValue: UseFormSetValue<EventFormData>;
}

export function EventStatusButton({
  watchedStatus,
  setValue,
}: EventStatusButtonProps) {
  const { t } = useTranslation();
  return (
    <div className="flex">
      <Button
        type="submit"
        variant={
          watchedStatus === "active"
            ? "default"
            : watchedStatus === "cancelled"
              ? "destructive"
              : "secondary"
        }
        className="rounded-r-none border-r-0"
      >
        {t(`eventDialog.buttons.saveAs.${watchedStatus}`)}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant={
              watchedStatus === "active"
                ? "default"
                : watchedStatus === "cancelled"
                  ? "destructive"
                  : "secondary"
            }
            className="rounded-l-none px-2"
          >
            <ChevronDownIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          {(["draft", "active", "cancelled"] as const).map((s) => (
            <DropdownMenuItem
              key={s}
              onClick={() => setValue("status", s)}
              className="flex-col items-start gap-0.5 py-2"
            >
              <span className="flex items-center gap-2 font-medium">
                {watchedStatus === s && <Check className="h-3.5 w-3.5" />}
                {watchedStatus !== s && <span className="w-3.5" />}
                {t(`eventDialog.statuses.${s}`)}
              </span>
              <span className="pl-5 text-xs text-muted-foreground">
                {t(`eventDialog.statuses.descriptions.${s}`)}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
