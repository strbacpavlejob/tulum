import * as api from "@/lib/api-client";
import { processEventImage } from "@/lib/image-utils";
import type { EventFormData } from "./event-form";

interface SaveEventInput {
  data: EventFormData;
  userId: string;
  /** The event being edited; a new event is created without one. */
  eventId?: string;
  imageFile: File | null;
}

/** Creates the event or saves the edited one, with its picture as WebP. */
export async function saveEvent({
  data,
  userId,
  eventId,
  imageFile,
}: SaveEventInput): Promise<void> {
  let processedFile: File | undefined;

  // Process image before upload
  if (imageFile) {
    const processedBlob = await processEventImage(imageFile);
    processedFile = new File([processedBlob], "event-image.webp", {
      type: "image/webp",
    });
  }

  if (eventId) {
    // Update existing event
    const updates = {
      venue_id: data.venue_id,
      title: data.title,
      description: data.description,
      start_date_time: data.start_date_time,
      end_date_time: data.end_date_time,
      tags: data.tags,
      status: data.status,
    };

    await api.updateEvent(eventId, updates, processedFile);
  } else {
    // Create new event
    const newEventData = {
      host_id: userId,
      venue_id: data.venue_id,
      title: data.title,
      description: data.description,
      start_date_time: data.start_date_time,
      end_date_time: data.end_date_time,
      tags: data.tags,
      status: data.status,
    };

    await api.createEvent(newEventData, processedFile);
  }
}
