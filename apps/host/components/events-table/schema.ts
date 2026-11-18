import { z } from "zod";
import { EventStatus } from "../event-status-chip";

export const schema = z.object({
  id: z.number(),
  eventId: z.string(),
  header: z.string(),
  venue: z.string(),
  status: z.enum(EventStatus),
  views: z.string(),
  bookmarks: z.string(),
  tickets: z.string(),
  conversionRate: z.string(),
});

/** One row of the dashboard's events table. */
export type EventRow = z.infer<typeof schema>;
