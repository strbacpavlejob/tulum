export enum EventStatusEnum {
  DRAFT = 'draft',
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
}
export interface Event {
  id: string; // UUID
  venueId: string; // UUID
  title: string;
  description: string;
  startDateTime: Date;
  endDateTime: Date;
  tags: string[];
  status: EventStatusEnum;
  createdAt: Date;
  updatedAt: Date;
  pictureUrl: string | null;
  scraper: string | null;
}
