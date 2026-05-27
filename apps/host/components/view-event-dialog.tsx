"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import { DateCard } from "@/components/common/date-card";
import Logo from "@/components/common/logo";
import "../i18n";
import EventStatusChip, { EventStatus } from "./event-status-chip";

interface Event {
  id: string;
  venue_id: string;
  title: string;
  description: string;
  start_date_time: string;
  end_date_time: string;
  tags: string[];
  picture?: string;
  tickets_sold?: number;
  status: string;
  venue_name?: string;
}

interface ViewEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
}

export function ViewEventDialog({
  isOpen,
  onClose,
  event,
}: ViewEventDialogProps) {
  const { t } = useTranslation();

  if (!event) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Event Picture */}
        <div className="relative w-full h-[20vh] overflow-hidden rounded-t-lg">
          {event.picture ? (
            <>
              <Image
                src={event.picture}
                alt={event.title}
                fill
                className="object-cover"
              />
              <div className="absolute bottom-4 right-4 z-10">
                <EventStatusChip status={event.status as EventStatus} />
              </div>
            </>
          ) : (
            <>
              <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                <Logo className="w-20 h-20 opacity-20" />
              </div>
              <div className="absolute bottom-4 right-4 z-10">
                <EventStatusChip status={event.status as EventStatus} />
              </div>
            </>
          )}
        </div>

        <DialogHeader>
          <DialogTitle className="sr-only">
            {t("eventDialog.viewTitle")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("eventDialog.viewDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 p-6 pt-0">
          {/* Title/Venue/Description/Tags and Date Card */}
          <div className="flex gap-6">
            {/* Left Column: Title, Venue, Description and Tags */}
            <div className="flex-1 space-y-4">
              {/* Title and Venue */}
              <div>
                <h2 className="text-2xl font-bold">{event.title}</h2>
                <p className="text-base text-muted-foreground mt-2">
                  {t("eventDialog.at")} {event.venue_name || "N/A"}
                </p>
              </div>

              {/* Description */}
              <div>
                <p className="text-base whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {event.tags.map((tag, index) => (
                  <Badge key={index} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Right Column: Date Card */}
            <div className="shrink-0">
              <DateCard dateString={event.start_date_time} />
            </div>
          </div>

          {/* Tickets Sold */}
          <div className="grid gap-4">
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground text-sm">
                  {t("eventDialog.fields.ticketsSold")}
                </Label>
                <span className="text-sm font-medium">
                  {event.tickets_sold ?? 0}
                </span>
              </div>
            </div>

            {/* Avatar List of Guests */}
            {(event.tickets_sold ?? 0) > 0 && (
              <div className="grid gap-2">
                <Label className="text-muted-foreground text-sm">
                  {t("eventDialog.fields.guests")}
                </Label>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {Array.from({
                      length: Math.min(event.tickets_sold ?? 0, 5),
                    }).map((_, i) => (
                      <Avatar
                        key={i}
                        className="h-8 w-8 border-2 border-background"
                      >
                        <AvatarImage
                          src={`https://i.pravatar.cc/150?img=${i + 1}`}
                        />
                        <AvatarFallback>G{i + 1}</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  {(event.tickets_sold ?? 0) > 5 && (
                    <span className="text-sm text-muted-foreground">
                      +{(event.tickets_sold ?? 0) - 5}{" "}
                      {t("eventDialog.fields.more")}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
