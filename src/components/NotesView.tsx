import React, { useState } from 'react';
import { Note } from '../App';
import NoteSection from './NoteSection';

interface NotesViewProps {
  notes: Note[];
  onCreateNote: () => void;
  onEditNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onDragStart: (noteId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, sectionId: 'now' | 'later' | 'todo' | 'general') => void;
}

// Priority sections for high-priority notes
const PRIORITY_SECTIONS = [
  { id: 'now' as 'now', title: 'Now', color: '#ff6b6b' },
  { id: 'later' as 'later', title: 'Later', color: '#feca57' },
  { id: 'todo' as 'todo', title: 'To Do', color: '#48dbfb' },
];

// Default sections for the kanban board
const DEFAULT_SECTIONS = [
  { id: 'general' as 'general', title: 'General', color: '#5f27cd' },
];

// Section filter options for UI
export const SECTION_FILTERS = [
  { id: 'all' as 'all', label: 'All Notes' },
  ...PRIORITY_SECTIONS.map(s => ({ id: s.id, label: s.title })),
  ...DEFAULT_SECTIONS.map(s => ({ id: s.id, label: s.title })),
];

const NotesView: React.FC<NotesViewProps> = ({ 
  notes, 
  onEditNote, 
  onDeleteNote,
  onDragStart,
  onDragOver,
  onDrop
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'now' | 'later' | 'todo' | 'general'>('all');
  const [priorityNotesExpanded, setPriorityNotesExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');


  // Handle delete for general notes (inline)
  const handleDeleteNote = (id: string) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      onDeleteNote(id);
    }
  };

  // Check if any section has notes
  const hasNotes = notes.length > 0;

  // Search functionality
  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate note counts for each section (filtered)
  const noteCounts = {
    now: filteredNotes.filter(n => n.section === 'now').length,
    later: filteredNotes.filter(n => n.section === 'later').length,
    todo: filteredNotes.filter(n => n.section === 'todo').length,
    general: filteredNotes.filter(n => n.section === 'general').length,
    total: filteredNotes.length
  };

  // Get notes for a specific section (respecting the search box)
  const getSectionNotes = (sectionId: string) => {
    return filteredNotes.filter(note => note.section === sectionId);
  };

  return (
    <div className="notes-view kanban-view">
      <input
        type="search"
        className="notes-search"
        placeholder="Search notes"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* Section Filter Controls */}
      <div className="section-filters">
        <button 
          className={`filter-btn ${selectedFilter === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedFilter('all')}
        >
          All Notes ({noteCounts.total})
        </button>
        <button 
          className={`filter-btn ${selectedFilter === 'now' ? 'active' : ''}`}
          onClick={() => setSelectedFilter('now')}
          style={{ borderColor: '#ff6b6b', color: '#ff6b6b' }}
        >
          Now ({noteCounts.now})
        </button>
        <button 
          className={`filter-btn ${selectedFilter === 'later' ? 'active' : ''}`}
          onClick={() => setSelectedFilter('later')}
          style={{ borderColor: '#feca57', color: '#feca57' }}
        >
          Later ({noteCounts.later})
        </button>
        <button 
          className={`filter-btn ${selectedFilter === 'todo' ? 'active' : ''}`}
          onClick={() => setSelectedFilter('todo')}
          style={{ borderColor: '#48dbfb', color: '#48dbfb' }}
        >
          To Do ({noteCounts.todo})
        </button>
        <button 
          className={`filter-btn ${selectedFilter === 'general' ? 'active' : ''}`}
          onClick={() => setSelectedFilter('general')}
          style={{ borderColor: '#5f27cd', color: '#5f27cd' }}
        >
          General ({noteCounts.general})
        </button>
      </div>

      {/* Priority Notes Section - Now/Later/Todo */}
      <div className="priority-notes-section">
        <div className="section-header-row">
          <h3 className="section-category-title">Priority Notes</h3>
          <button 
            className="collapse-btn"
            onClick={() => setPriorityNotesExpanded(!priorityNotesExpanded)}
            aria-label={priorityNotesExpanded ? "Collapse priority notes" : "Expand priority notes"}
          >
            <span className={`collapse-icon ${priorityNotesExpanded ? 'expanded' : ''}`}>▼</span>
          </button>
        </div>
        <div className={`kanban-boards ${priorityNotesExpanded ? 'expanded' : 'collapsed'}`}>
          {PRIORITY_SECTIONS.map((section) => (
            <NoteSection
              key={section.id}
              sectionId={section.id}
              title={section.title}
              color={section.color}
              notes={getSectionNotes(section.id)}
              onEditNote={onEditNote}
              onDeleteNote={onDeleteNote}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
            />
          ))}
        </div>
      </div>
      
      {/* Notes Section */}
      <div className="general-notes-section">
        <h3 className="section-category-title">Notes</h3>
        <div className="general-notes-grid">
          {getSectionNotes('general')
            .map((note) => (
              <div
                key={note.id}
                className="note-card priority-general"
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
      
      {/* Empty state */}
      {!hasNotes && (
        <div className="empty-state">
          <p>No notes yet. Click "Create Note" to add your first note.</p>
        </div>
      )}
    </div>
  );
};

export default NotesView;
