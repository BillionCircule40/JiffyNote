export interface CalendarEvent {
    id: string;
    user_id: string;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    color: string;
    priority: number;
    is_repeating: boolean;
    repeat_options?: any;
    created_at: string;
    updated_at: string;
}
export interface CreateEventInput {
    user_id: string;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    color?: string;
    priority?: number;
    is_repeating?: boolean;
    repeat_options?: any;
}
export interface UpdateEventInput {
    title?: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    color?: string;
    priority?: number;
    is_repeating?: boolean;
    repeat_options?: any;
}
export declare const getEventsByUserId: (userId: string) => Promise<CalendarEvent[]>;
export declare const getEventById: (eventId: string, userId: string) => Promise<CalendarEvent | null>;
export declare const createEvent: (eventData: CreateEventInput) => Promise<CalendarEvent>;
export declare const updateEvent: (eventId: string, eventData: UpdateEventInput) => Promise<CalendarEvent | null>;
export declare const deleteEvent: (eventId: string) => Promise<boolean>;
export declare const getUpcomingEvents: (userId: string, days?: number) => Promise<CalendarEvent[]>;
//# sourceMappingURL=eventService.d.ts.map