export declare const getEventNoteAttachmentsByEventId: (eventId: string) => Promise<any[]>;
export declare const getEventNoteAttachmentsByNoteId: (noteId: string) => Promise<any[]>;
export declare const createEventNoteAttachment: (eventId: string, noteId: string) => Promise<boolean>;
export declare const deleteEventNoteAttachment: (eventId: string, noteId: string) => Promise<boolean>;
export declare const deleteAttachmentsByEventId: (eventId: string) => Promise<boolean>;
export declare const deleteAttachmentsByNoteId: (noteId: string) => Promise<boolean>;
//# sourceMappingURL=attachmentService.d.ts.map