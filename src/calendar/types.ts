export type ViewMode = 'day' | 'week' | 'month';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO date-time
  end: string; // ISO date-time
  color: string;
}

// The event currently open in the editor. `id` is missing for a new event.
export interface EventDraft {
  id?: string;
  title: string;
  start: Date;
  end: Date;
  color: string;
}

export const EVENT_COLORS = ['#039be5', '#33b679', '#f4511e', '#8e24aa', '#f6bf26', '#616161'];
