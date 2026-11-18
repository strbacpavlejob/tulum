import { GuestReport, GuestReportStatus } from "@/lib/api-client";

export const STATUSES: GuestReportStatus[] = [
  "pending",
  "in_review",
  "resolved",
  "rejected",
];

export const URGENT_REASONS = new Set<GuestReport["reason"]>([
  "harassment",
  "underage",
  "unsafe_meeting",
]);
