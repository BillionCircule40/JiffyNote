import React from 'react';
import { Note } from '../App';

interface NotesViewProps {
  notes: Note[];
  onAddNote: (note: Omit<Note, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onDeleteNote: (id: string) => void;
}

const NotesView: React.FC<NotesViewProps> = ({ notes, onAddNote, onUpdateNote, onDeleteNote }) => {
  const handleCreateNote = () => {
    onAddNote({
      title: '',
      content: '',
      //is_reminder: false,
      //reminder_type: 'todo',
    });
  };

  const handleDeleteNote = (id: string) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      onDeleteNote(id);
    }
  };

  if (notes.length === 0) {
    return (
      <div className="notes-view">
        <div className="notes-header">
          <h2>Notes</h2>
          <button className="create-note-btn" onClick={handleCreateNote}>
            + Create Note
          </button>
        </div>
        <div className="notes-grid">
          <div className="empty-state">
            <p>No notes yet. Click "Create Note" to add your first note.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="notes-view">
      <div className="notes-header">
        <h2>Notes ({notes.length})</h2>
        <button className="create-note-btn" onClick={handleCreateNote}>
          + Create Note
        </button>
      </div>
      <div className="notes-grid">
        {notes.map((note) => (
          <div key={note.id} className="note-card" onClick={() => onUpdateNote(note.id, {})}>
            <h3 className="note-card-title">{note.title || '(No title)'}</h3>
            <p className="note-card-content">{note.content || 'No content'}</p>
            <div className="note-card-meta">
              <span className="note-card-date">
                {new Date(note.updated_at).toLocaleDateString()}
              </span>
              {/* {note.is_reminder && (
                <span className="note-card-reminder">
                  {note.reminder_type.charAt(0).toUpperCase() + note.reminder_type.slice(1)}
                </span>
              )} */}
              <button
                className="delete-note-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteNote(note.id);
                }}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotesView;
