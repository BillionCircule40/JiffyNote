import React, { useEffect, useRef, useState } from 'react';
import Header from './calendar/Header';
import Sidebar from './calendar/Sidebar';
import TimeGridView from './calendar/TimeGridView';
import MonthView from './calendar/MonthView';
import YearView from './calendar/YearView';
import EventModal from './calendar/EventModal';
import NotesView from './components/NotesView';
import NoteEditor from './components/NoteEditor';
import PlannerView, { type PlannerEvent, type PlannerPlan, type PlannerPlanDraft } from './components/PlannerView';
import AuthPage from './pages/AuthPage';
import SettingsPage from './pages/SettingsPage';
import { CalendarEvent, EventDraft, EVENT_COLORS, ViewMode } from './calendar/types';
import { addDays, addMonths, startOfDay, startOfWeek } from './calendar/dateUtils';
import { ThemeProvider } from './context/ThemeContext';
import authService, { User } from './services/authService';
import plannerApiService, { normalizePlannerPlans } from './services/plannerApiService';
import syncService from './services/syncService';
import {
  deleteRecurringOccurrence,
  expandRecurringEvents,
  getDefaultRepeatSettings,
  resetPrioritySelection,
  type RecurringDeleteScope,
} from './services/eventService';
import {
  burnForMissed,
  checkProof,
  findMissedOccurrences,
  loadProofState,
  occurrenceKey,
  saveProofState,
  type BurnRecord,
  type ProofState,
} from './services/proofService';

const PROOF_ENFORCEMENT_INTERVAL_MS = 60 * 1000;
// Played back to back whenever an event's proof deadline is missed.
const MISSED_EVENT_VIDEO_IDS = ['rhW7Ts1wDEY', 'q88agSZnvng'];
// YouTube plays the video in the path first, then each id in `playlist`.
const MISSED_EVENT_VIDEO_URL = `https://www.youtube.com/embed/${MISSED_EVENT_VIDEO_IDS[0]}?autoplay=1&playlist=${MISSED_EVENT_VIDEO_IDS.slice(1).join(',')}`;

const STORAGE_KEY = 'jiffynote.events';
const NOTES_STORAGE_KEY = 'jiffynote.notes';
const PLANNER_STORAGE_KEY = 'jiffynote.plans';
const LEGACY_PLANNER_OWNER_KEY = 'jiffynote.plans.legacyOwner';

// Events live in the browser for now; swap these two for DataBaseQueries later.
function userStorageKey(key: string, userId?: string): string {
  return userId ? `${key}.${userId}` : key;
}

function loadEvents(userId?: string): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(userStorageKey(STORAGE_KEY, userId));
    const parsed = raw ? (JSON.parse(raw) as CalendarEvent[]) : [];
    return parsed.map((event) => ({
      ...event,
      priority: typeof event.priority === 'number' ? event.priority : 5,
    }));
  } catch {
    return [];
  }
}

function saveEvents(events: CalendarEvent[], userId?: string): void {
  try {
    localStorage.setItem(userStorageKey(STORAGE_KEY, userId), JSON.stringify(events));
  } catch {
    // storage unavailable (private mode etc.) - events stay in memory only
  }
}

export interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  section: 'now' | 'later' | 'todo' | 'general';
}

function loadNotes(userId?: string): Note[] {
  try {
    const raw = localStorage.getItem(userStorageKey(NOTES_STORAGE_KEY, userId));
    const parsed = raw ? (JSON.parse(raw) as Note[]) : [];
    // Ensure all notes have section property (default to 'general')
    return parsed.map(note => ({
      ...note,
      section: note.section || 'general'
    }));
  } catch {
    return [];
  }
}

function saveNotes(notes: Note[], userId?: string): void {
  try {
    localStorage.setItem(userStorageKey(NOTES_STORAGE_KEY, userId), JSON.stringify(notes));
  } catch {
    // storage unavailable (private mode etc.) - notes stay in memory only
  }
}

function loadPlans(userId?: string): PlannerPlan[] {
  try {
    let raw = localStorage.getItem(PLANNER_STORAGE_KEY);
    if (userId) {
      raw = localStorage.getItem(`${PLANNER_STORAGE_KEY}.${userId}`);
      if (raw) {
        return normalizePlannerPlans(JSON.parse(raw));
      }

      const legacyOwner = localStorage.getItem(LEGACY_PLANNER_OWNER_KEY);
      if (legacyOwner && legacyOwner !== userId) {
        return [];
      }

      if (localStorage.getItem(PLANNER_STORAGE_KEY) && !legacyOwner) {
        localStorage.setItem(LEGACY_PLANNER_OWNER_KEY, userId);
      }
    }
    return raw ? normalizePlannerPlans(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

function savePlansLocally(plans: PlannerPlan[], userId: string): void {
  try {
    localStorage.setItem(`${PLANNER_STORAGE_KEY}.${userId}`, JSON.stringify(plans));
  } catch {
    // storage unavailable (private mode etc.) - plans stay in memory only
  }
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => authService.getCurrentUser());
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem('jiffynote.guest') === 'true');
  const [authOpen, setAuthOpen] = useState(() => !authService.getCurrentUser() && localStorage.getItem('jiffynote.guest') !== 'true');
  const [cloudReadyUserId, setCloudReadyUserId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [view, setView] = useState<ViewMode>('week');
  const [events, setEvents] = useState<CalendarEvent[]>(() => loadEvents(authService.getCurrentUser()?.id));
  const [notes, setNotes] = useState<Note[]>(() => loadNotes(authService.getCurrentUser()?.id));
  const [plans, setPlans] = useState<PlannerPlan[]>(loadPlans);
  const [plannerReadyUserId, setPlannerReadyUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [noteDraft, setNoteDraft] = useState<{ id?: string; title: string; content: string; date: string; section: 'now' | 'later' | 'todo' | 'general' } | null>(null);
  const [plannerDraft, setPlannerDraft] = useState<PlannerPlanDraft | null>(null);
  const [selectedPlannerId, setSelectedPlannerId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'calendar' | 'notes' | 'planner'>('calendar');
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [priorityRange, setPriorityRange] = useState<number[]>(resetPrioritySelection());
  // Tagged with its owner so a user switch never writes one user's proof data under another's key.
  const [proofStore, setProofStore] = useState<{ userId: string | undefined; state: ProofState }>(() => {
    const userId = authService.getCurrentUser()?.id;
    return { userId, state: loadProofState(userId) };
  });
  const [burnNotice, setBurnNotice] = useState<BurnRecord | null>(null);
  const [missedVideoOpen, setMissedVideoOpen] = useState(false);
  const proofState = proofStore.state;
  const eventsRef = useRef(events);
  eventsRef.current = events;
  const proofStoreRef = useRef(proofStore);
  proofStoreRef.current = proofStore;
  const enforcingRef = useRef(false);

  const updateProofState = (update: (state: ProofState) => ProofState) => {
    setProofStore((current) => ({ ...current, state: update(current.state) }));
  };

  useEffect(() => {
    if (proofStore.userId !== currentUser?.id) {
      setProofStore({ userId: currentUser?.id, state: loadProofState(currentUser?.id) });
      return;
    }
    saveProofState(proofStore.state, proofStore.userId);
  }, [proofStore, currentUser?.id]);

  useEffect(() => {
    let cancelled = false;

    const enforce = async () => {
      if (enforcingRef.current) return;
      enforcingRef.current = true;
      try {
        const owner = proofStoreRef.current.userId;
        let state = proofStoreRef.current.state;
        for (const missed of findMissedOccurrences(eventsRef.current, state)) {
          const record = await burnForMissed(missed, state);
          if (cancelled || proofStoreRef.current.userId !== owner) return;
          if (!record) continue;
          state = { ...state, burns: [...state.burns, record] };
          setProofStore((current) => current.userId === owner
            ? { ...current, state: { ...current.state, burns: [...current.state.burns, record] } }
            : current);
          setBurnNotice(record);
          setMissedVideoOpen(true);
        }
      } finally {
        enforcingRef.current = false;
      }
    };

    void enforce();
    const timer = window.setInterval(() => void enforce(), PROOF_ENFORCEMENT_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!burnNotice) return;
    const timer = window.setTimeout(() => setBurnNotice(null), 10000);
    return () => window.clearTimeout(timer);
  }, [burnNotice]);

  useEffect(() => saveEvents(events, currentUser?.id), [events, currentUser?.id]);
  useEffect(() => saveNotes(notes, currentUser?.id), [notes, currentUser?.id]);

  useEffect(() => {
    if (!currentUser) {
      setCloudReadyUserId(null);
      return;
    }

    if (authService.isLocalSession()) {
      setEvents(loadEvents(currentUser.id));
      setNotes(loadNotes(currentUser.id));
      setCloudReadyUserId(null);
      return;
    }

    let active = true;
    setCloudReadyUserId(null);
    void syncService.getSnapshot().then((snapshot) => {
      if (active) {
        setEvents(snapshot.events);
        setNotes(snapshot.notes);
        setCloudReadyUserId(currentUser.id);
      }
    }).catch((error: unknown) => {
      console.error('Unable to load account calendar data:', error);
    });

    return () => {
      active = false;
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser || cloudReadyUserId !== currentUser.id) {
      return;
    }

    void syncService.replaceSnapshot(events, notes).catch((error: unknown) => {
      console.error('Unable to sync calendar data:', error);
    });
  }, [cloudReadyUserId, currentUser?.id, events, notes]);
  useEffect(() => {
    if (!currentUser) {
      setPlannerReadyUserId(null);
      setPlans(loadPlans());
      return;
    }

    if (authService.isLocalSession()) {
      const localPlans = loadPlans(currentUser.id);
      setPlans(localPlans);
      setPlannerReadyUserId(null);
      return;
    }

    let active = true;
    const legacyPlans = loadPlans(currentUser.id);
    setPlannerReadyUserId(null);
    setPlans([]);

    const loadUserPlans = async () => {
      try {
        const remotePlans = await plannerApiService.getPlans();
        const mergedPlans = new Map(legacyPlans.map((plan) => [plan.id, plan]));
        remotePlans.forEach((plan) => mergedPlans.set(plan.id, plan));
        const mergedPlanList = Array.from(mergedPlans.values());
        const plansToUse = legacyPlans.length > 0
          ? await plannerApiService.replacePlans(mergedPlanList)
          : remotePlans;
        if (active) {
          if (legacyPlans.length > 0) {
            localStorage.removeItem(PLANNER_STORAGE_KEY);
          }
          setPlans(plansToUse);
        }
      } catch (error) {
        console.error('Unable to load planner data from the database:', error);
        if (active) {
          setPlans(legacyPlans);
        }
      } finally {
        if (active) {
          setPlannerReadyUserId(currentUser.id);
        }
      }
    };

    void loadUserPlans();
    return () => {
      active = false;
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    if (authService.isLocalSession()) {
      savePlansLocally(plans, currentUser.id);
      return;
    }

    if (plannerReadyUserId !== currentUser.id) {
      return;
    }

    savePlansLocally(plans, currentUser.id);
    void plannerApiService.replacePlans(plans).catch((error: unknown) => {
      console.error('Unable to save planner data to the database:', error);
    });
  }, [currentUser, plannerReadyUserId, plans]);

  useEffect(() => {
    if (currentUser) {
      return;
    }

    try {
      localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(plans));
    } catch {
      // Guest planner data stays in memory if browser storage is unavailable.
    }
  }, [currentUser?.id, plans]);

  useEffect(() => {
    if (!plans.length) {
      setSelectedPlannerId(null);
      return;
    }

    const nextPlan = plans.find((plan) => plan.id === selectedPlannerId);
    if (!selectedPlannerId || !nextPlan) {
      const firstPlan = plans[0];
      if (firstPlan) {
        setSelectedPlannerId(firstPlan.id);
      }
    }
  }, [plans, selectedPlannerId]);

  const handleAuthenticated = async (user: User) => {
    if (authService.isLocalSession()) {
      const accountEvents = new Map(loadEvents(user.id).map((event) => [event.id, event]));
      events.forEach((event) => accountEvents.set(event.id, event));
      const accountNotes = new Map(loadNotes(user.id).map((note) => [note.id, note]));
      notes.forEach((note) => accountNotes.set(note.id, note));
      const mergedEvents = Array.from(accountEvents.values());
      const mergedNotes = Array.from(accountNotes.values());

      saveEvents(mergedEvents, user.id);
      saveNotes(mergedNotes, user.id);
      savePlansLocally(plans, user.id);
      localStorage.removeItem('jiffynote.guest');
      setEvents(mergedEvents);
      setNotes(mergedNotes);
      setIsGuest(false);
      setAuthOpen(false);
      setCurrentUser(user);
      setSettingsOpen(false);
      return;
    }

    try {
      const snapshot = await syncService.mergeGuestData(events, notes);
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(NOTES_STORAGE_KEY);
        localStorage.removeItem('jiffynote.guest');
      } catch {
        // Account data has already been saved remotely.
      }
      setEvents(snapshot.events);
      setNotes(snapshot.notes);
      setIsGuest(false);
      setAuthOpen(false);
      setCurrentUser(user);
      setSettingsOpen(false);
    } catch (error) {
      authService.logout();
      throw error;
    }
  };

  const handleContinueAsGuest = () => {
    try {
      localStorage.setItem('jiffynote.guest', 'true');
    } catch {
      // The current workspace can still be used for this session.
    }
    setIsGuest(true);
    setAuthOpen(false);
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setEvents(loadEvents());
    setNotes(loadNotes());
    setIsGuest(true);
    try {
      localStorage.setItem('jiffynote.guest', 'true');
    } catch {
      // The guest workspace remains available for this session.
    }
    setSettingsOpen(false);
  };

  // Drag and drop handlers for events
  const handleEventDragStart = (eventId: string) => {
    setDraggedEventId(eventId);
  };

  const handleEventDrop = (e: React.DragEvent, targetDate: Date, targetHour: number) => {
    e.preventDefault();
    if (draggedEventId) {
      const event = events.find(ev => ev.id === draggedEventId);
      if (event) {
        const originalStart = new Date(event.start);
        const originalEnd = new Date(event.end);
        
        // Calculate time difference
        const newStart = new Date(targetDate);
        newStart.setHours(targetHour, originalStart.getMinutes(), 0, 0);
        
        // Calculate duration in minutes
        const durationMinutes = (originalEnd.getTime() - originalStart.getTime()) / 60000;
        
        // Calculate new end time maintaining duration
        const newEnd = new Date(newStart.getTime() + durationMinutes * 60000);
        
        // Update event with new time
        const updatedEvent = {
          ...event,
          start: newStart.toISOString(),
          end: newEnd.toISOString()
        };
        
        setEvents(prev => prev.map(ev => ev.id === draggedEventId ? updatedEvent : ev));
      }
      setDraggedEventId(null);
    }
  };

  const handleEventHorizontalDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    if (draggedEventId) {
      const event = events.find(ev => ev.id === draggedEventId);
      if (event) {
        const originalStart = new Date(event.start);
        const originalEnd = new Date(event.end);
        
        // Get the time from the original event
        const hours = originalStart.getHours();
        const minutes = originalStart.getMinutes();
        
        // Create new dates with the target date but same time
        const newStart = new Date(targetDate);
        newStart.setHours(hours, minutes, 0, 0);
        
        const newEnd = new Date(newStart.getTime() + (originalEnd.getTime() - originalStart.getTime()));
        
        // Update event with new date
        const updatedEvent = {
          ...event,
          start: newStart.toISOString(),
          end: newEnd.toISOString()
        };
        
        setEvents(prev => prev.map(ev => ev.id === draggedEventId ? updatedEvent : ev));
      }
      setDraggedEventId(null);
    }
  };

  const navigate = (direction: -1 | 1) => {
    if (view === 'year') setCurrentDate(addMonths(currentDate, direction * 12));
    else if (view === 'month') setCurrentDate(addMonths(currentDate, direction));
    else setCurrentDate(addDays(currentDate, direction * (view === 'week' ? 7 : 1)));
  };

  const openNewEvent = (start: Date) => {
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setDraft({
      title: '',
      start,
      end,
      color: EVENT_COLORS[0] ?? '#039be5',
      priority: 5,
      repeat: getDefaultRepeatSettings(),
      noteIds: [],
      requiresProof: false,
    });
  };

  const openExistingEvent = (event: CalendarEvent) => {
    const sourceEvent = events.find((storedEvent) => storedEvent.id === event.id) ?? event;
    setDraft({
      id: sourceEvent.id,
      occurrenceStart: new Date(event.start),
      title: sourceEvent.title,
      start: new Date(sourceEvent.start),
      end: new Date(sourceEvent.end),
      color: sourceEvent.color,
      priority: typeof sourceEvent.priority === 'number' ? sourceEvent.priority : 5,
      repeat: sourceEvent.repeat ?? getDefaultRepeatSettings(),
      noteIds: sourceEvent.noteIds ?? [],
      requiresProof: Boolean(proofState.requiredSince[sourceEvent.id]),
    });
  };

  const saveDraft = (d: EventDraft) => {
    const saved: CalendarEvent = {
      id: d.id ?? crypto.randomUUID(),
      title: d.title.trim() || '(No title)',
      start: d.start.toISOString(),
      end: d.end.toISOString(),
      color: d.color,
      priority: d.priority ?? 5,
      repeat: d.repeat ?? getDefaultRepeatSettings(),
      noteIds: d.noteIds ?? [],
    };
    setEvents((prev) => [...prev.filter((e) => e.id !== saved.id), saved]);
    updateProofState((state) => {
      const isRequired = Boolean(state.requiredSince[saved.id]);
      if (Boolean(d.requiresProof) === isRequired) return state;
      const requiredSince = { ...state.requiredSince };
      if (d.requiresProof) requiredSince[saved.id] = new Date().toISOString();
      else delete requiredSince[saved.id];
      return { ...state, requiredSince };
    });
    setDraft(null);
  };

  const deleteEvent = (id: string, scope?: RecurringDeleteScope, occurrenceStart?: Date) => {
    if (scope && occurrenceStart) {
      setEvents((prev) => deleteRecurringOccurrence(prev, id, occurrenceStart, scope));
    } else {
      setEvents((prev) => prev.filter((event) => event.id !== id));
      updateProofState((state) => {
        if (!state.requiredSince[id]) return state;
        const requiredSince = { ...state.requiredSince };
        delete requiredSince[id];
        return { ...state, requiredSince };
      });
    }
    setDraft(null);
  };

  const buildProofProps = (eventDraft: EventDraft) => {
    if (!eventDraft.id) return undefined;
    const eventId = eventDraft.id;
    const occurrenceStart = eventDraft.occurrenceStart ?? eventDraft.start;
    const occurrenceEnd = new Date(occurrenceStart.getTime() + (eventDraft.end.getTime() - eventDraft.start.getTime()));
    const key = occurrenceKey(eventId, occurrenceStart);
    const burn = proofState.burns.find((record) => record.occurrenceKey === key);
    return {
      hasVerifiedKey: Boolean(proofState.settings.verifiedAt),
      graceHours: proofState.settings.graceHours,
      submissions: proofState.submissions.filter((submission) => submission.occurrenceKey === key),
      ...(burn ? { burn } : {}),
      onSubmit: async (text: string, imageDataUrl?: string) => {
        const linkedNotes = notes
          .filter((note) => (eventDraft.noteIds ?? []).includes(note.id))
          .map((note) => `${note.title}: ${note.content}`);
        const verdict = await checkProof(proofState.settings, {
          eventTitle: eventDraft.title,
          occurrenceStart,
          occurrenceEnd,
          notes: linkedNotes,
          text,
          ...(imageDataUrl ? { imageDataUrl } : {}),
        });
        updateProofState((state) => ({
          ...state,
          submissions: [...state.submissions, {
            id: crypto.randomUUID(),
            occurrenceKey: key,
            submittedAt: new Date().toISOString(),
            text,
            ...(imageDataUrl ? { imageDataUrl } : {}),
            accepted: verdict.accepted,
            reason: verdict.reason,
          }],
        }));
        return verdict;
      },
    };
  };

  const quickCreate = () => {
    const start = new Date(currentDate);
    start.setHours(new Date().getHours() + 1, 0, 0, 0);
    openNewEvent(start);
  };

  const addNote = (note: Omit<Note, 'id' | 'created_at' | 'updated_at'>) => {
    const newNote: Note = {
      ...note,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      section: note.section || 'general' // Default to provided section or 'general'
    };
    setNotes((prev) => [...prev, newNote]);
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id ? { ...note, ...updates, updated_at: new Date().toISOString() } : note
      )
    );
  };

  const moveNoteToSection = (noteId: string, newSection: 'now' | 'later' | 'todo' | 'general') => {
    updateNote(noteId, { section: newSection });
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
  };

  const quickCreateNote = () => {
    setNoteDraft({
      title: '',
      content: '',
      date: new Date().toISOString().slice(0, 16),
      section: 'general' // Default section
    });
  };

  const openNoteEditor = (note?: Note) => {
    if (note) {
      setNoteDraft({
        id: note.id,
        title: note.title,
        content: note.content,
        date: note.updated_at.slice(0, 16),
        section: note.section
      });
    } else {
      setNoteDraft({
        title: '',
        content: '',
        date: new Date().toISOString().slice(0, 16),
        section: 'general'
      });
    }
  };

  const saveNoteDraft = (draftData: { id?: string; title: string; content: string; date: string; section: 'now' | 'later' | 'todo' | 'general' }) => {
    if (draftData.id) {
      // Update existing note
      updateNote(draftData.id, {
        title: draftData.title.trim() || '(No title)',
        content: draftData.content,
        section: draftData.section,
        updated_at: new Date().toISOString(),
      });
    } else {
      // Create new note
      addNote({
        title: draftData.title.trim() || '(No title)',
        content: draftData.content,
        section: draftData.section
      });
    }
    setNoteDraft(null);
  };

  const deleteNoteDraft = (id: string) => {
    deleteNote(id);
    setNoteDraft(null);
  };

  const openNewPlan = () => {
    setPlannerDraft({
      title: '',
      description: '',
      color: EVENT_COLORS[0] ?? '#039be5',
    });
  };

  const savePlannerEvent = (event: PlannerEvent) => {
    if (!selectedPlannerId) {
      return;
    }

    setPlans((prev) =>
      prev.map((item) =>
        item.id === selectedPlannerId
          ? {
              ...item,
              events: [
                ...item.events.filter((existing) => existing.id !== event.id),
                { ...event, daysOfWeek: event.daysOfWeek?.length ? event.daysOfWeek : [event.dayOfWeek] },
              ],
            }
          : item
      )
    );
  };

  const movePlannerEvent = (eventId: string, dayOfWeek: number) => {
    if (!selectedPlannerId) {
      return;
    }

    setPlans((prev) =>
      prev.map((plan) => {
        if (plan.id !== selectedPlannerId) {
          return plan;
        }

        return {
          ...plan,
          events: plan.events.map((event) =>
            event.id === eventId ? { ...event, dayOfWeek, daysOfWeek: [dayOfWeek] } : event
          ),
        };
      })
    );
  };

  const savePlannerDraft = (draftPlan: PlannerPlanDraft) => {
    const nextPlan: PlannerPlan = {
      id: draftPlan.id ?? crypto.randomUUID(),
      title: draftPlan.title.trim() || 'Untitled Plan',
      description: draftPlan.description.trim(),
      color: draftPlan.color,
      events: plans.find((plan) => plan.id === draftPlan.id)?.events ?? [],
    };

    setPlans((prev) => {
      const existing = prev.filter((plan) => plan.id !== nextPlan.id);
      return [...existing, nextPlan];
    });
    setSelectedPlannerId(nextPlan.id);
    setPlannerDraft(null);
  };

  const deletePlannerPlan = (id: string) => {
    setPlans((prev) => prev.filter((plan) => plan.id !== id));
    if (selectedPlannerId === id) {
      setSelectedPlannerId(null);
    }
    setPlannerDraft(null);
  };

  const deletePlannerEvent = (id: string) => {
    if (!selectedPlannerId) {
      return;
    }

    setPlans((prev) =>
      prev.map((plan) =>
        plan.id === selectedPlannerId
          ? { ...plan, events: plan.events.filter((event) => event.id !== id) }
          : plan
      )
    );
  };

  const joinPlannerPlan = (plan: PlannerPlan, weekDate: Date) => {
    const weekStart = startOfWeek(weekDate);
    const joinedEvents: CalendarEvent[] = (Array.isArray(plan.events) ? plan.events : []).reduce<CalendarEvent[]>((joined, planEvent) => {
      const selectedDays = Array.isArray(planEvent.daysOfWeek) && planEvent.daysOfWeek.length > 0
        ? planEvent.daysOfWeek
        : [planEvent.dayOfWeek];
      const [startHour = 0, startMinute = 0] = planEvent.startTime.split(':').map(Number);
      const [endHour = 0, endMinute = 0] = planEvent.endTime.split(':').map(Number);
      selectedDays.forEach((dayOfWeek) => {
        const eventDate = addDays(weekStart, dayOfWeek);
        const start = new Date(eventDate);
        const end = new Date(eventDate);
        start.setHours(startHour, startMinute, 0, 0);
        end.setHours(endHour, endMinute, 0, 0);
        joined.push({
          id: crypto.randomUUID(),
          title: planEvent.title,
          start: start.toISOString(),
          end: end.toISOString(),
          color: planEvent.color,
          priority: 5,
          repeat: getDefaultRepeatSettings(),
          noteIds: planEvent.noteIds ?? [],
        });
      });
      return joined;
    }, []);

    setEvents((prev) => [...prev, ...joinedEvents]);
    setCurrentDate(weekStart);
    setView('week');
    setActiveTab('calendar');
  };

  // Drag and drop handlers for notes
  const handleDragStart = (noteId: string) => {
    setDraggedNoteId(noteId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, sectionId: 'now' | 'later' | 'todo' | 'general') => {
    e.preventDefault();
    if (draggedNoteId) {
      moveNoteToSection(draggedNoteId, sectionId);
      setDraggedNoteId(null);
    }
  };

  const handleToggleAccountMenu = () => {
    // Handle account menu toggle logic here
    console.log('Account menu toggled');
  };

  const visibleDays =
    view === 'day'
      ? [currentDate]
      : Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(currentDate), i));

  const priorityEvents = events.filter((event) => {
    const priority = typeof event.priority === 'number' ? event.priority : 5;
    return priorityRange.includes(priority);
  });
  const eventRangeStart = view === 'year'
    ? new Date(currentDate.getFullYear(), 0, 1)
    : view === 'month'
      ? startOfWeek(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1))
      : view === 'day'
        ? startOfDay(currentDate)
        : startOfWeek(currentDate);
  const eventRangeEnd = view === 'year'
    ? new Date(currentDate.getFullYear() + 1, 0, 1)
    : view === 'month'
      ? addDays(eventRangeStart, 42)
      : addDays(eventRangeStart, view === 'day' ? 1 : 7);
  const visibleEvents = expandRecurringEvents(priorityEvents, eventRangeStart, eventRangeEnd);

  if (!currentUser && (!isGuest || authOpen)) {
    return (
      <ThemeProvider>
        <AuthPage
          onAuthenticated={handleAuthenticated}
          onContinueAsGuest={handleContinueAsGuest}
          isGuest={isGuest}
        />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="app">
        <Header
          currentDate={currentDate}
          view={view}
          onToday={() => setCurrentDate(new Date())}
          onPrev={() => navigate(-1)}
          onNext={() => navigate(1)}
          onViewChange={setView}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          onToggleAccountMenu={handleToggleAccountMenu}
          priorityRange={priorityRange}
          onPriorityRangeChange={setPriorityRange}
          currentUser={currentUser}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenAuth={() => setAuthOpen(true)}
          onLogout={handleLogout}
        />
        <div className="app-body">
          {sidebarOpen && (
            <Sidebar
              selectedDate={currentDate}
              onSelectDate={setCurrentDate}
              onCreateEvent={quickCreate}
              onCreateNote={quickCreateNote}
              onCreatePlanner={openNewPlan}
              onTabChange={setActiveTab}
              activeTab={activeTab}
            />
          )}
          {activeTab === 'notes' ? (
            <NotesView 
              notes={notes} 
              onCreateNote={quickCreateNote} 
              onEditNote={(id) => {
                const note = notes.find(n => n.id === id);
                openNoteEditor(note);
              }} 
              onDeleteNote={deleteNote}
              onAttachNote={(noteId) => {
                if (!draft) {
                  return;
                }

                setDraft((current) => current ? {
                  ...current,
                  noteIds: [...new Set([...(current.noteIds ?? []), noteId])],
                } : current);
              }}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ) : activeTab === 'planner' ? (
            <PlannerView
              plans={plans}
              notes={notes}
              selectedPlanId={selectedPlannerId}
              currentDate={currentDate}
              onSelectPlan={setSelectedPlannerId}
              onSaveEvent={savePlannerEvent}
              onSavePlan={(plan) => {
                setPlans((currentPlans) => currentPlans.map((currentPlan) => currentPlan.id === plan.id ? plan : currentPlan));
              }}
              onJoinPlan={joinPlannerPlan}
              onDeletePlan={deletePlannerPlan}
              onDeleteEvent={deletePlannerEvent}
              onMoveEvent={movePlannerEvent}
            />
          ) : (
            <main className="calendar-main">
              {view === 'year' ? (
                <YearView
                  currentDate={currentDate}
                  events={visibleEvents}
                  onMonthClick={(month: Date) => {
                    setCurrentDate(month);
                    setView('month');
                  }}
                  onDayClick={(day: Date) => {
                    setCurrentDate(day);
                    setView('day');
                  }}
                />
              ) : view === 'month' ? (
                <MonthView
                  currentDate={currentDate}
                  events={visibleEvents}
                  onDayClick={(day) => {
                    setCurrentDate(day);
                    setView('day');
                  }}
                  onEventClick={openExistingEvent}
                />
              ) : (
                <TimeGridView
                  days={visibleDays}
                  events={visibleEvents}
                  onSlotClick={openNewEvent}
                  onEventClick={openExistingEvent}
                  onEventDragStart={handleEventDragStart}
                  onEventDrop={handleEventDrop}
                  onEventHorizontalDrop={handleEventHorizontalDrop}
                />
              )}
            </main>
          )}
        </div>
        {draft && (
          <EventModal
            draft={draft}
            availableNotes={notes}
            proof={buildProofProps(draft)}
            onSave={saveDraft}
            onDelete={deleteEvent}
            onClose={() => setDraft(null)}
          />
        )}
        {noteDraft && (
          <NoteEditor
            note={noteDraft}
            onSave={saveNoteDraft}
            onDelete={deleteNoteDraft}
            onClose={() => setNoteDraft(null)}
          />
        )}
        {settingsOpen && (
          <SettingsPage
            currentUser={currentUser}
            onClose={() => setSettingsOpen(false)}
            onLogout={handleLogout}
            onUserUpdated={setCurrentUser}
            proofSettings={proofState.settings}
            burns={proofState.burns}
            onProofSettingsChange={(settings) => updateProofState((state) => ({ ...state, settings }))}
            onSimulateMiss={() => {
              const record: BurnRecord = {
                id: crypto.randomUUID(),
                occurrenceKey: `simulated@${new Date().toISOString()}`,
                eventTitle: 'Test event',
                at: new Date().toISOString(),
                tokens: 0,
                simulated: true,
                provider: 'test',
                note: 'Simulated missed event (test button). Nothing burned.',
              };
              updateProofState((state) => ({ ...state, burns: [...state.burns, record] }));
              setBurnNotice(record);
              setSettingsOpen(false);
              setMissedVideoOpen(true);
            }}
          />
        )}
        {missedVideoOpen && (
          <div className="modal-backdrop missed-video-backdrop" onClick={() => setMissedVideoOpen(false)}>
            <div className="missed-video-panel" role="dialog" aria-modal="true" aria-label="Missed event" onClick={(event) => event.stopPropagation()}>
              <div className="missed-video-header">
                <strong>You missed {burnNotice?.eventTitle ?? 'an event'}</strong>
                <button type="button" className="icon-btn small" onClick={() => setMissedVideoOpen(false)} aria-label="Close video">×</button>
              </div>
              <div className="missed-video-frame">
                <iframe
                  src={MISSED_EVENT_VIDEO_URL}
                  title="Missed event video"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        )}
        {burnNotice && (
          <div className="burn-toast" role="status">
            <strong>Missed proof: {burnNotice.eventTitle}</strong>
            <span>{burnNotice.note}</span>
            <button type="button" className="icon-btn small" onClick={() => setBurnNotice(null)} aria-label="Dismiss">×</button>
          </div>
        )}
        {plannerDraft && (
          <div className="planner-modal-backdrop" onClick={() => setPlannerDraft(null)}>
            <div className="planner-modal" onClick={(event) => event.stopPropagation()}>
              <div className="planner-modal-header">
                <h2>{plannerDraft.id ? 'Edit plan' : 'Create plan'}</h2>
                <button type="button" className="planner-close-btn" onClick={() => setPlannerDraft(null)}>
                  ×
                </button>
              </div>

              <div className="planner-form-grid">
                <label>
                  <span>Title</span>
                  <input
                    value={plannerDraft.title}
                    onChange={(event) => setPlannerDraft({ ...plannerDraft, title: event.target.value })}
                  />
                </label>

                <label>
                  <span>Color</span>
                  <input
                    type="color"
                    value={plannerDraft.color}
                    onChange={(event) => setPlannerDraft({ ...plannerDraft, color: event.target.value })}
                  />
                </label>

                <label className="planner-full-width">
                  <span>Description</span>
                  <textarea
                    rows={3}
                    value={plannerDraft.description}
                    onChange={(event) => setPlannerDraft({ ...plannerDraft, description: event.target.value })}
                  />
                </label>
              </div>

              <div className="planner-actions-row">
                <div className="planner-modal-buttons">
                  {plannerDraft.id && (
                    <button
                      type="button"
                      className="planner-delete-btn"
                      onClick={() => deletePlannerPlan(plannerDraft.id!)}
                    >
                      Delete
                    </button>
                  )}
                  <button type="button" className="outline-btn" onClick={() => setPlannerDraft(null)}>
                    Cancel
                  </button>
                  <button type="button" className="create-btn" onClick={() => savePlannerDraft(plannerDraft)}>
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ThemeProvider>
  );
};

export default App;
