import React, { useState, useEffect } from 'react';
import { Note } from '../App';

interface NoteSectionProps {
  sectionId: 'now' | 'later' | 'todo' | 'general';
  title: string;
  color: string;
  notes: Note[];
  onEditNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onAttachNote?: ((noteId: string) => void) | undefined;
  onDragStart: (noteId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, sectionId: 'now' | 'later' | 'todo' | 'general') => void;
}

const NoteSection: React.FC<NoteSectionProps> = ({ 
  sectionId, 
  title, 
  color, 
  notes, 
  onEditNote, 
  onDeleteNote,
  onAttachNote,
  onDragStart,
  onDragOver,
  onDrop
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    // Reset drag state when notes change
    setIsDragOver(false);
  }, [notes]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
    onDragOver(e);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    onDrop(e, sectionId);
  };

  const handleDeleteNote = (id: string) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      onDeleteNote(id);
    }
  };

  const isSectionEmpty = notes.length === 0;

  return (
    <div 
      className={`note-section ${isDragOver ? 'drag-over' : ''}`}
      style={{ borderColor: color }}
      data-section={sectionId}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="section-header">
        <h3>{title}</h3>
        <span className="note-count">{notes.length}</span>
      </div>
      <div className="section-content">
        {isSectionEmpty ? (
          <div className="empty-section">
            Drop notes here
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className={`note-card priority-${note.section}`}
              draggable
              onDragStart={() => onDragStart(note.id)}
              onClick={() => onEditNote(note.id)}
            >
              <h3 className="note-card-title">{note.title || '(No title)'}</h3>
              <p className="note-card-content">{note.content || 'No content'}</p>
              <div className="note-card-meta">
                <span className="note-card-date">
                  {new Date(note.updated_at).toLocaleDateString()}
                </span>
                <div className="note-card-actions">
                  <button
                    className="attach-note-btn"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAttachNote?.(note.id);
                    }}
                  >
                    Attach
                  </button>
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
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NoteSection;
