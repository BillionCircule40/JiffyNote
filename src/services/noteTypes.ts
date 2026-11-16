// Note types for the storage service
export interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_reminder: boolean;
  reminder_type: 'now' | 'later' | 'todo' | null;
  section: 'now' | 'later' | 'todo' | 'general';
}

export interface NoteDraft {
  id?: string;
  title: string;
  content: string;
  is_reminder?: boolean;
  reminder_type?: 'now' | 'later' | 'todo' | null;
  section?: 'now' | 'later' | 'todo' | 'general';
}
