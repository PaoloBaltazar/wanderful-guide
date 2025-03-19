
export interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  recipient: string;
  created_at: string;
  read: boolean;
  related_id?: string;
  relatedItemExists?: boolean;
}
