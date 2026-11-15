import type { CalendarEvent } from '../calendar/types';
import type { Note } from '../App';
import { apiRequest } from './apiService';
import type { EventRepeatSettings } from './eventService';

interface DatabaseEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  color: string | null;
  priority: number | null;
  repeat_options: EventRepeatSettings | null;
}

interface DatabaseNote {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  section: Note['section'] | null;
}

interface SnapshotResponse {
  events: DatabaseEvent[];
  notes: DatabaseNote[];
  attachments: Array<{ event_id: string; note_id: string }>;
}

export interface AccountSnapshot {
  events: CalendarEvent[];
  notes: Note[];
}

let pendingSync: Promise<void> = Promise.resolve();

const fromDatabase = (snapshot: SnapshotResponse): AccountSnapshot => {
  const noteIdsByEvent = new Map<string, string[]>();
  snapshot.attachments.forEach(({ event_id, note_id }) => {
    noteIdsByEvent.set(event_id, [...(noteIdsByEvent.get(event_id) ?? []), note_id]);
  });

  return {
    events: snapshot.events.map((event) => ({
      id: event.id,
      title: event.title,
      start: event.start_time,
      end: event.end_time,
      color: event.color ?? '#039be5',
      priority: event.priority ?? 5,
      ...(event.repeat_options ? { repeat: event.repeat_options } : {}),
      noteIds: noteIdsByEvent.get(event.id) ?? [],
    })),
    notes: snapshot.notes.map((note) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      created_at: note.created_at,
      updated_at: note.updated_at,
      section: note.section ?? 'general',
    })),
  };
};

const sendSnapshot = async (
  events: CalendarEvent[],
  notes: Note[],
  mode: 'merge' | 'replace',
): Promise<AccountSnapshot> => {
  const response = await apiRequest<SnapshotResponse>('/sync/snapshot', {
    method: 'PUT',
    body: JSON.stringify({ mode, events, notes }),
  });
  return fromDatabase(response);
};

const syncService = {
  getSnapshot: async (): Promise<AccountSnapshot> => {
    const response = await apiRequest<SnapshotResponse>('/sync/snapshot');
    return fromDatabase(response);
  },

  mergeGuestData: (events: CalendarEvent[], notes: Note[]): Promise<AccountSnapshot> =>
    sendSnapshot(events, notes, 'merge'),

  replaceSnapshot: (events: CalendarEvent[], notes: Note[]): Promise<AccountSnapshot> => {
    const snapshotEvents = events.map((event) => ({ ...event, noteIds: [...(event.noteIds ?? [])] }));
    const snapshotNotes = notes.map((note) => ({ ...note }));
    const request = pendingSync.then(() => sendSnapshot(snapshotEvents, snapshotNotes, 'replace'));
    pendingSync = request.then(() => undefined, () => undefined);
    return request;
  },
};

export default syncService;
