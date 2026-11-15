import React, { useEffect, useMemo, useState } from 'react';
import { EventDraft, EVENT_COLORS } from './types';
import { fromInputs, toDateInput, toTimeInput } from './dateUtils';
import {
  EventRepeatSettings,
  getDefaultRepeatSettings,
  summarizeRepeatSettings,
  type RecurringDeleteScope,
} from '../services/eventService';

interface EventNoteItem {
  id: string;
  title: string;
  content?: string;
  section?: string;
}

interface EventModalProps {
  draft: EventDraft;
  availableNotes?: EventNoteItem[];
  onSave: (draft: EventDraft) => void;
  onDelete: (id: string, scope?: RecurringDeleteScope, occurrenceStart?: Date) => void;
  onClose: () => void;
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EventModal: React.FC<EventModalProps> = ({ draft, availableNotes = [], onSave, onDelete, onClose }) => {
  const [title, setTitle] = useState(draft.title);
  const [date, setDate] = useState(toDateInput(draft.start));
  const [startTime, setStartTime] = useState(toTimeInput(draft.start));
  const [endTime, setEndTime] = useState(toTimeInput(draft.end));
  const [color, setColor] = useState(draft.color);
  const [priority, setPriority] = useState(draft.priority ?? 5);
  const [repeatEnabled, setRepeatEnabled] = useState(Boolean(draft.repeat?.enabled));
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'yearly' | 'custom'>(draft.repeat?.frequency ?? 'weekly');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(draft.repeat?.daysOfWeek ?? []);
  const [repeatEndMode, setRepeatEndMode] = useState(draft.repeat?.endMode ?? 'never');
  const [occurrences, setOccurrences] = useState(draft.repeat?.occurrences ?? 1);
  const [endDate, setEndDate] = useState(draft.repeat?.endDate ?? toDateInput(draft.start));
  const [searchText, setSearchText] = useState('');
  const [attachedNoteIds, setAttachedNoteIds] = useState<string[]>(draft.noteIds ?? []);
  const [showAttachments, setShowAttachments] = useState((draft.noteIds ?? []).length > 0);
  const [selectedNote, setSelectedNote] = useState<EventNoteItem | null>(null);
  const [confirmDeleteScope, setConfirmDeleteScope] = useState(false);

  useEffect(() => {
    setTitle(draft.title);
    setDate(toDateInput(draft.start));
    setStartTime(toTimeInput(draft.start));
    setEndTime(toTimeInput(draft.end));
    setColor(draft.color);
    setPriority(draft.priority ?? 5);
    setRepeatEnabled(Boolean(draft.repeat?.enabled));
    setFrequency(draft.repeat?.frequency ?? 'weekly');
    setDaysOfWeek(draft.repeat?.daysOfWeek ?? []);
    setRepeatEndMode(draft.repeat?.endMode ?? 'never');
    setOccurrences(draft.repeat?.occurrences ?? 1);
    setEndDate(draft.repeat?.endDate ?? toDateInput(draft.start));
    setAttachedNoteIds(draft.noteIds ?? []);
    setShowAttachments((draft.noteIds ?? []).length > 0);
    setSelectedNote(null);
    setConfirmDeleteScope(false);
  }, [draft]);

  const start = fromInputs(date, startTime);
  const end = fromInputs(date, endTime);
  const invalid = end <= start;
  const isCustomFrequency = frequency === 'custom';

  const filteredNotes = useMemo(
    () => [...availableNotes]
      .filter((note) => note.title.toLowerCase().includes(searchText.trim().toLowerCase()))
      .sort((a, b) => Number(attachedNoteIds.includes(b.id)) - Number(attachedNoteIds.includes(a.id))),
    [availableNotes, attachedNoteIds, searchText]
  );

  const selectedDays = isCustomFrequency && daysOfWeek.length === 0 ? [new Date(start).getDay()] : daysOfWeek;
  const repeatSummary = summarizeRepeatSettings({
    enabled: repeatEnabled,
    frequency: isCustomFrequency ? 'custom' : frequency,
    daysOfWeek: selectedDays,
    endMode: repeatEndMode,
    occurrences,
    endDate: repeatEndMode === 'onDate' ? endDate : null,
  });

  const toggleDay = (day: number) => {
    setFrequency('custom');
    setDaysOfWeek((current) => {
      if (current.includes(day)) {
        return current.filter((item) => item !== day);
      }
      return [...current, day].sort((a, b) => a - b);
    });
  };

  const toggleAttachedNote = (noteId: string) => {
    setAttachedNoteIds((current) => {
      const next = current.includes(noteId) ? current.filter((id) => id !== noteId) : [...current, noteId];
      setShowAttachments(true);
      return next;
    });
  };

  const openNoteDetails = (note: EventNoteItem) => {
    setSelectedNote((current) => (current && current.id === note.id ? null : note));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (invalid) return;

    const repeatConfig: EventRepeatSettings = repeatEnabled
      ? {
          enabled: true,
          frequency: isCustomFrequency ? 'custom' : frequency,
          daysOfWeek: isCustomFrequency ? selectedDays : [],
          endMode: repeatEndMode,
          occurrences: Math.max(1, occurrences),
          endDate: repeatEndMode === 'onDate' ? endDate : null,
          excludedDates: draft.repeat?.excludedDates ?? [],
        }
      : getDefaultRepeatSettings();

    onSave({
      ...draft,
      title,
      start,
      end,
      color,
      priority,
      repeat: repeatConfig,
      noteIds: attachedNoteIds,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-top">
          <button type="button" className="icon-btn small" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <input
          className="title-input"
          placeholder="Add title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
        <div className="modal-row event-date-row">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="modal-row event-time-row">
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          <span>–</span>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
        {invalid && <div className="modal-error">End time must be after start time.</div>}
        <div className="modal-row priority-row">
          <label htmlFor="event-priority">Priority</label>
          <select id="event-priority" value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
            {Array.from({ length: 9 }, (_, index) => index + 1).map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
        <div className="modal-row colors">
          {EVENT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`color-swatch${c === color ? ' selected' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>

        <div className="repeat-block">
          <button
            type="button"
            className="repeat-toggle-row"
            onClick={() => setRepeatEnabled((current) => !current)}
          >
            <span>Repeat</span>
            <span className={`toggle-switch ${repeatEnabled ? 'on' : ''}`}>
              <span className="toggle-knob" />
            </span>
          </button>

          {repeatEnabled && (
            <div className="repeat-panel">
              <div className="modal-row stacked">
                <label className="field-label">Frequency</label>
                <select value={frequency} onChange={(e) => setFrequency(e.target.value as 'weekly' | 'monthly' | 'yearly' | 'custom')}>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {isCustomFrequency && (
                <div className="modal-row stacked">
                  <label className="field-label">Days</label>
                  <div className="repeat-day-row">
                    {WEEKDAY_NAMES.map((day, index) => (
                      <button
                        key={day}
                        type="button"
                        className={`repeat-day ${daysOfWeek.includes(index) ? 'is-selected' : ''}`}
                        onClick={() => toggleDay(index)}
                      >
                        {day.slice(0, 2)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="modal-row stacked">
                <label className="field-label">Ends</label>
                <select value={repeatEndMode} onChange={(e) => setRepeatEndMode(e.target.value as 'never' | 'after' | 'onDate')}>
                  <option value="never">Never</option>
                  <option value="after">After X occurrences</option>
                  <option value="onDate">On a date</option>
                </select>
                {repeatEndMode === 'after' && (
                  <input
                    type="number"
                    min={1}
                    value={occurrences}
                    onChange={(e) => setOccurrences(Number(e.target.value) || 1)}
                  />
                )}
                {repeatEndMode === 'onDate' && (
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                )}
              </div>

              <div className="repeat-summary">{repeatSummary}</div>
            </div>
          )}
        </div>

        <div className="attachment-block">
          <button type="button" className="attachment-toggle-row" onClick={() => setShowAttachments((current) => !current)}>
            <span>Attached notes</span>
            <span className={`collapse-icon ${showAttachments ? 'expanded' : ''}`} aria-hidden="true">▾</span>
          </button>

          {showAttachments && (
            <>
              <input
                type="search"
                placeholder="Search notes"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <div className="attachment-list-wrapper">
                {filteredNotes.length === 0 ? (
                  <div className="attachment-empty">No notes match this search.</div>
                ) : (
                  <div className="attachment-list">
                    {filteredNotes.map((note) => (
                      <div
                        key={note.id}
                        className={`attachment-item ${attachedNoteIds.includes(note.id) ? 'selected' : ''}`}
                      >
                        <button
                          type="button"
                          className="attachment-note-main"
                          onClick={() => openNoteDetails(note)}
                        >
                          <span>{note.title}</span>
                        </button>
                        <button
                          type="button"
                          className="attachment-state-button"
                          onClick={() => toggleAttachedNote(note.id)}
                        >
                          {attachedNoteIds.includes(note.id) ? 'Linked' : 'Link'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedNote && (
                <div className="attachment-detail-panel">
                  <div className="attachment-detail-header">
                    <strong>{selectedNote.title}</strong>
                    <button type="button" className="detail-close-btn" onClick={() => setSelectedNote(null)}>×</button>
                  </div>
                  <p>{selectedNote.content || 'No note content yet.'}</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-actions">
          {draft.id && (
            draft.repeat?.enabled ? (
              <button
                type="button"
                className="text-btn danger"
                onClick={() => setConfirmDeleteScope((current) => !current)}
              >
                Delete
              </button>
            ) : (
              <button type="button" className="text-btn danger" onClick={() => onDelete(draft.id as string)}>
                Delete
              </button>
            )
          )}
          <button type="submit" className="primary-btn" disabled={invalid}>
            Save
          </button>
        </div>
        {confirmDeleteScope && draft.id && draft.repeat?.enabled && (
          <div className="delete-scope-panel" role="group" aria-label="Delete recurring event">
            <span>Delete this recurring event</span>
            <button
              type="button"
              className="text-btn danger"
              onClick={() => onDelete(draft.id as string, 'occurrence', draft.occurrenceStart ?? draft.start)}
            >
              This event only
            </button>
            <button
              type="button"
              className="text-btn danger"
              onClick={() => onDelete(draft.id as string, 'following', draft.occurrenceStart ?? draft.start)}
            >
              This and following
            </button>
            <button type="button" className="text-btn" onClick={() => setConfirmDeleteScope(false)}>
              Cancel
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default EventModal;
