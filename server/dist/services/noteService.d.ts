export interface Note {
    id: string;
    user_id: string;
    title: string;
    content: string;
    created_at: string;
    updated_at: string;
    is_reminder: boolean;
    reminder_type: 'now' | 'later' | 'todo' | null;
    section: 'now' | 'later' | 'todo' | 'general';
}
export interface CreateNoteInput {
    user_id: string;
    title: string;
    content: string;
    is_reminder?: boolean;
    reminder_type?: 'now' | 'later' | 'todo' | null;
    section?: 'now' | 'later' | 'todo' | 'general';
}
export interface UpdateNoteInput {
    title?: string;
    content?: string;
    is_reminder?: boolean;
    reminder_type?: 'now' | 'later' | 'todo' | null;
    section?: 'now' | 'later' | 'todo' | 'general';
}
export declare const getNotesByUserId: (userId: string) => Promise<Note[]>;
export declare const getNoteById: (noteId: string, userId: string) => Promise<Note | null>;
export declare const getNotesBySection: (userId: string, section: string) => Promise<Note[]>;
export declare const createNote: (noteData: CreateNoteInput) => Promise<Note>;
export declare const updateNote: (noteId: string, noteData: UpdateNoteInput) => Promise<Note | null>;
export declare const deleteNote: (noteId: string) => Promise<boolean>;
export declare const searchNotes: (userId: string, searchTerm: string) => Promise<Note[]>;
//# sourceMappingURL=noteService.d.ts.map