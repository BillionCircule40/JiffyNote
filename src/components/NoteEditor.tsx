import React, { useState, useEffect } from 'react';

interface NoteEditorProps {
  note?: {
    id?: string;
    title: string;
    content: string;
    date: string;
    section: 'now' | 'later' | 'todo' | 'general';
  };
  onSave: (note: {
    id?: string;
    title: string;
    content: string;
    date: string;
    section: 'now' | 'later' | 'todo' | 'general';
  }) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const NoteEditor: React.FC<NoteEditorProps> = ({ note, onSave, onDelete, onClose }) => {
  const isEditing = !!note?.id;
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [date, setDate] = useState(note?.date || new Date().toISOString().slice(0, 16));
  const [section, setSection] = useState(note?.section || 'general');
  // Reminder functionality temporarily disabled for Phase 2 testing
  // const [hasReminder, setHasReminder] = useState(note?.has_reminder || false);
  // const [reminderType, setReminderType] = useState(note?.reminder_type || 'at_start');
  // const [reminderTime, setReminderTime] = useState(note?.reminder_time || '');

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setDate(note.date);
      setSection(note.section);
      //setHasReminder(note.has_reminder);
      // Reminder functionality temporarily disabled for Phase 2 testing
      // setReminderType(note.reminder_type || 'at_start');
      // setReminderTime(note.reminder_time || '');
    } else {
      setTitle('');
      setContent('');
      setDate(new Date().toISOString().slice(0, 16));
      setSection('general');
      //setHasReminder(false);
      // Reminder functionality temporarily disabled for Phase 2 testing
      // setReminderType('at_start');
      // setReminderTime('');
    }
  }, [note]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const noteData = {
      id: note?.id,
      title,
      content,
      date,
      section
    } as const;
    onSave(noteData as { id?: string; title: string; content: string; date: string; section: 'now' | 'later' | 'todo' | 'general' });
    onClose();
  };

  const handleDelete = () => {
    if (isEditing && onDelete && note && note.id !== undefined) {
      onDelete(note.id);
      onClose();
    }
  };

  return (
    <div className="note-editor-overlay">
      <div className="note-editor-modal">
        <h2>{isEditing ? 'Edit Note' : 'Create Note'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter note title"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="content">Content</label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter note content"
              rows={6}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="date">Date</label>
            <input
              type="datetime-local"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="section">Note Type</label>
            <select
              id="section"
              value={section}
              onChange={(e) => setSection(e.target.value as 'now' | 'later' | 'todo' | 'general')}
            >
              <option value="general">General Note (No priority)</option>
              <option value="now">Priority: Now (Current hour)</option>
              <option value="later">Priority: Later (Next few hours)</option>
              <option value="todo">Priority: To Do</option>
            </select>
          </div>

          {/* Reminder functionality temporarily disabled for Phase 2 testing */}
          {/*
          <div className="form-group reminder-section">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={hasReminder}
                onChange={(e) => setHasReminder(e.target.checked)}
              />
              <span>Add Reminder</span>
            </label>

            {hasReminder && (
              <div className="reminder-settings">
                <div className="form-group">
                  <label htmlFor="reminderType">Reminder Type</label>
                  <select
                    id="reminderType"
                    value={reminderType}
                    onChange={(e) => setReminderType(e.target.value)}
                  >
                    <option value="at_start">At note date/time</option>
                    <option value="custom">Custom time</option>
                  </select>
                </div>

                {reminderType === 'custom' && (
                  <div className="form-group">
                    <label htmlFor="reminderTime">Reminder Time</label>
                    <input
                      type="datetime-local"
                      id="reminderTime"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          */}

          <div className="note-editor-actions">
            <button type="button" className="btn cancel-btn" onClick={onClose}>
              Cancel
            </button>
            {isEditing && onDelete && (
              <button type="button" className="btn delete-btn" onClick={handleDelete}>
                Delete
              </button>
            )}
            <button type="submit" className="btn save-btn">
              {isEditing ? 'Update' : 'Create'} Note
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NoteEditor;
