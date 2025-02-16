
export interface SupportTicket {
  id?: string;
  user_id: string;
  name: string;
  email: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at?: string;
  updated_at?: string;
}
