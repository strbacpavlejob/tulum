import * as z from "zod";

// Form validation schema factory
export const createEventFormSchema = (t: (key: string) => string) =>
  z
    .object({
      venue_id: z.string().min(1, t("eventDialog.validation.venueRequired")),
      title: z.string().min(1, t("eventDialog.validation.titleRequired")),
      description: z
        .string()
        .min(1, t("eventDialog.validation.descriptionRequired")),
      start_date_time: z
        .string()
        .min(1, t("eventDialog.validation.startDateTimeRequired")),
      end_date_time: z
        .string()
        .min(1, t("eventDialog.validation.endDateTimeRequired")),
      tags: z
        .array(z.string())
        .min(1, t("eventDialog.validation.tagsRequired")),
      picture_url: z.string().optional(),
      status: z.enum(["draft", "active", "cancelled"]),
    })
    .refine(
      (data) => {
        if (data.start_date_time && data.end_date_time) {
          return new Date(data.end_date_time) > new Date(data.start_date_time);
        }
        return true;
      },
      {
        message: t("eventDialog.validation.endAfterStart"),
        path: ["end_date_time"],
      },
    );

export type EventFormData = z.infer<ReturnType<typeof createEventFormSchema>>;

export type EventStatus = EventFormData["status"];

/** The form's values for a new event. */
export const EMPTY_EVENT_FORM: EventFormData = {
  venue_id: "",
  title: "",
  description: "",
  start_date_time: "",
  end_date_time: "",
  tags: [],
  picture_url: "",
  status: "draft",
};

/** An event as the events page hands it to the dialog for editing. */
export interface EditableEvent {
  id: string;
  venue_id: string;
  title: string;
  description: string;
  start_date_time: string;
  end_date_time: string;
  tags: string[];
  picture_url?: string;
  status: "draft" | "active" | "cancelled";
  tickets_sold?: number;
  venue_name?: string;
}
