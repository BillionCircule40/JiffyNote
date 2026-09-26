import React, { useState } from 'react';
import { EventDraft, EVENT_COLORS } from './types';
import { fromInputs, toDateInput, toTimeInput } from './dateUtils';

interface EventModalProps {
  draft: EventDraft;
  onSave: (draft: EventDraft) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const EventModal: React.FC<EventModalProps> = ({ draft, onSave, onDelete, onClose }) => {
  const [title, setTitle] = useState(draft.title);
  const [date, setDate] = useState(toDateInput(draft.start));
  const [startTime, setStartTime] = useState(toTimeInput(draft.start));
  const [endTime, setEndTime] = useState(toTimeInput(draft.end));
  const [color, setColor] = useState(draft.color);

  const start = fromInputs(date, startTime);
  const end = fromInputs(date, endTime);
  const invalid = end <= start;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (invalid) return;
    onSave({ ...draft, title, start, end, color });
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
        <div className="modal-row">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          <span>–</span>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
        {invalid && <div className="modal-error">End time must be after start time.</div>}
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
        <div className="modal-actions">
          {draft.id && (
            <button type="button" className="text-btn danger" onClick={() => onDelete(draft.id as string)}>
              Delete
            </button>
          )}
          <button type="submit" className="primary-btn" disabled={invalid}>
            Save
          </button>
        </div>
      </form>
    </div>
  );
};

export default EventModal;
