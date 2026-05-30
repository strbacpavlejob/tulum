export interface Event {
  id: string;
  venue_id: string;
  title: string;
  description: string;
  start_date_time: string;
  end_date_time: string;
  tags: string[];
  picture?: string;
  status: 'draft' | 'active' | 'cancelled';
  scraper?: string;
  tickets_sold?: number;
  venue_name?: string;
  created_at?: string;
  updated_at?: string;
}
