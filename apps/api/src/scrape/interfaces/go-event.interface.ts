export interface GoTag {
  id: string;
  name: string;
}

export interface GoEvent {
  id: number;
  category: string;
  name: string;
  description: string;
  host: string;
  latitude: number;
  longitude: number;
  start_timestamp: number;
  location_name: string;
  action: 'buy_ticket' | string;
  image_url: string;
  thumb_url: string;
  tags: GoTag[];
  host_id: number;
  ticket_url: string;
}
