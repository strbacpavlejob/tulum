import { EventSummary } from "./event";

export interface Profile {
  id: string;
  name: string;
  age: number;
  bio: string;
  images: string[];
  distance?: number;
  hobbies: string[];
  event: EventSummary;
}
