import { EventRepeatSettings, getDefaultRepeatSettings } from '../services/eventService';

export type ViewMode = 'day' | 'week' | 'month' | 'year';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO date-time
  end: string; // ISO date-time
  color: string;
  repeat?: EventRepeatSettings;
  noteIds?: string[];
  priority?: number;
}

// The event currently open in the editor. `id` is missing for a new event.
export interface EventDraft {
  id?: string;
  occurrenceStart?: Date;
  title: string;
  start: Date;
  end: Date;
  color: string;
  repeat?: EventRepeatSettings;
  noteIds?: string[];
  priority?: number;
}

export const defaultRepeatSettings = getDefaultRepeatSettings;

export const EVENT_COLORS = ['#039be5', '#33b679', '#f4511e', '#8e24aa', '#f6bf26', '#616161'];

// Section interface for notes organization
export interface NoteSection {
  id: string;
  title: string;
  color: string;
}

export const NOTE_SECTIONS: NoteSection[] = [
  { id: 'now', title: 'Now', color: '#ff6b6b' },
  { id: 'later', title: 'Later', color: '#feca57' },
  { id: 'todo', title: 'To Do', color: '#48dbfb' },
];
