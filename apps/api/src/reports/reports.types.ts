export interface BugRecord {
  id: string;
  user_id: string | null;
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'resolved';
  description: string;
  additional_info?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VenueSuggestionRecord {
  id: string;
  user_id: string | null;
  name: string;
  instagram_handle?: string | null;
  additional_info?: string | null;
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'resolved';
  created_at: string;
  updated_at: string;
}
