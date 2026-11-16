import { Note } from '../App';

export interface SearchFilters {
  query: string;
  dateFrom?: Date;
  dateTo?: Date;
  section?: 'all' | 'now' | 'later' | 'todo' | 'general';
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  section?: 'all' | 'now' | 'later' | 'todo' | 'general';
}

/**
 * Search notes by title, content, and date range
 */
export function searchNotes(notes: Note[], filters: SearchFilters): Note[] {
  let filtered = notes;

  // Filter by text query (title and content)
  if (filters.query && filters.query.trim()) {
    const query = filters.query.toLowerCase();
    filtered = filtered.filter(note => 
      note.title.toLowerCase().includes(query) || 
      note.content.toLowerCase().includes(query)
    );
  }

  // Filter by date range
  if (filters.dateFrom) {
    filtered = filtered.filter(note => 
      new Date(note.updated_at) >= filters.dateFrom!
    );
  }

  if (filters.dateTo) {
    filtered = filtered.filter(note => 
      new Date(note.updated_at) <= filters.dateTo!
    );
  }

  // Filter by section
  if (filters.section && filters.section !== 'all') {
    filtered = filtered.filter(note => note.section === filters.section);
  }

  return filtered;
}

/**
 * Get search results grouped by section
 */
export function getSearchResultsBySection(notes: Note[], filters: SearchFilters) {
  const filtered = searchNotes(notes, filters);
  
  return {
    now: filtered.filter(n => n.section === 'now'),
    later: filtered.filter(n => n.section === 'later'),
    todo: filtered.filter(n => n.section === 'todo'),
    general: filtered.filter(n => n.section === 'general'),
    total: filtered.length
  };
}

/**
 * Parse date range from string (e.g., "today", "this week", "2024-01-01 to 2024-01-31")
 */
export function parseDateRange(dateString: string): { from?: Date; to?: Date } | null {
  const normalized = dateString.trim().toLowerCase();
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (normalized) {
    case 'today':
      return { from: today, to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) };
    case 'yesterday':
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      return { from: yesterday, to: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1) };
    case 'this week':
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(today.getTime() - daysToMonday * 24 * 60 * 60 * 1000);
      const sunday = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);
      return { from: monday, to: new Date(sunday.getTime() + 24 * 60 * 60 * 1000 - 1) };
    case 'this month':
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: firstDayOfMonth, to: new Date(lastDayOfMonth.getTime() + 24 * 60 * 60 * 1000 - 1) };
    case 'this year':
      const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
      const lastDayOfYear = new Date(now.getFullYear(), 11, 31);
      return { from: firstDayOfYear, to: new Date(lastDayOfYear.getTime() + 24 * 60 * 60 * 1000 - 1) };
    case 'last 7 days':
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { from: sevenDaysAgo, to: now };
    case 'last 30 days':
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 *1000);
      return { from: thirtyDaysAgo, to: now };
    default:
      // Try to parse custom date range (e.g., "2024-01-01 to 2024-01-31")
      const dateRangeRegex = /(\d{4}-\d{2}-\d{2})\s*(?:to|-)\s*(\d{4}-\d{2}-\d{2})/;
      const match = dateString.match(dateRangeRegex);
      if (match && match[1] && match[2]) {
        const from = new Date(match[1]);
        const to = new Date(match[2]);
        return { from, to: new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1) };
      }
      return null;
  }
}

/**
 * Format date for display
 */
export function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Check if a note matches a date filter
 */
export function matchesDateFilter(note: Note, filters: SearchFilters): boolean {
  if (!filters.dateFrom && !filters.dateTo) {
    return true;
  }

  const noteDate = new Date(note.updated_at);

  if (filters.dateFrom && noteDate < filters.dateFrom) {
    return false;
  }

  if (filters.dateTo && noteDate > filters.dateTo) {
    return false;
  }

  return true;
}
