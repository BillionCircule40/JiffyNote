import type { CalendarEvent } from '../calendar/types';

export type RepeatFrequency = 'weekly' | 'monthly' | 'yearly' | 'custom';
export type RepeatEndMode = 'never' | 'after' | 'onDate';

export interface EventRepeatSettings {
  enabled: boolean;
  frequency: RepeatFrequency;
  daysOfWeek: number[];
  endMode: RepeatEndMode;
  occurrences: number;
  endDate: string | null;
  excludedDates?: string[];
}

export type RecurringDeleteScope = 'occurrence' | 'following';

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const PRIORITY_OPTIONS = Array.from({ length: 9 }, (_, index) => index + 1);

export function resetPrioritySelection(): number[] {
  return [...PRIORITY_OPTIONS];
}

export function togglePrioritySelection(selectedPriorities: number[], priority: number): number[] {
  const normalized = [...new Set(selectedPriorities.map((value) => Number(value)).filter((value) => value >= 1 && value <= 9))];
  const isSelected = normalized.includes(priority);

  if (isSelected) {
    return normalized.filter((value) => value !== priority);
  }

  return [...normalized, priority].sort((a, b) => a - b);
}

export function focusPrioritySelection(priority: number): number[] {
  return [Number(priority)];
}

export function getDefaultRepeatSettings(): EventRepeatSettings {
  return {
    enabled: false,
    frequency: 'weekly',
    daysOfWeek: [],
    endMode: 'never',
    occurrences: 1,
    endDate: null,
    excludedDates: [],
  };
}

export function summarizeRepeatSettings(settings: EventRepeatSettings): string {
  if (!settings.enabled) {
    return 'Does not repeat';
  }

  const selectedDays = settings.daysOfWeek.length
    ? settings.daysOfWeek.map((day) => WEEKDAY_LABELS[day]).join(', ')
    : 'selected days';

  const endText = settings.endMode === 'after'
    ? ` for ${settings.occurrences} occurrences`
    : settings.endMode === 'onDate'
      ? ` until ${settings.endDate ?? 'selected date'}`
      : ' forever';

  if (settings.frequency === 'custom') {
    return `Repeats custom on ${selectedDays}${endText}`;
  }

  const frequencyText = settings.frequency.charAt(0).toUpperCase() + settings.frequency.slice(1);

  return settings.daysOfWeek.length
    ? `Repeats ${frequencyText.toLowerCase()} on ${selectedDays}${endText}`
    : `Repeats ${frequencyText.toLowerCase()}${endText}`;
}

function atStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function localDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function deleteRecurringOccurrence(
  events: CalendarEvent[],
  eventId: string,
  occurrenceDate: Date,
  scope: RecurringDeleteScope
): CalendarEvent[] {
  const occurrenceDay = atStartOfDay(occurrenceDate);

  return events.flatMap((event) => {
    if (event.id !== eventId || !event.repeat?.enabled) {
      return event.id === eventId ? [] : [event];
    }

    if (scope === 'occurrence') {
      const occurrenceKey = localDateKey(occurrenceDay);
      const excludedDates = [...new Set([...(event.repeat.excludedDates ?? []), occurrenceKey])];
      return [{ ...event, repeat: { ...event.repeat, excludedDates } }];
    }

    const anchor = new Date(event.start);
    if (occurrenceDay.getTime() <= atStartOfDay(anchor).getTime()) {
      return [];
    }

    const lastDate = new Date(occurrenceDay);
    lastDate.setDate(lastDate.getDate() - 1);
    return [{
      ...event,
      repeat: {
        ...event.repeat,
        endMode: 'onDate',
        endDate: localDateKey(lastDate),
      },
    }];
  });
}

function addOccurrenceMonths(anchor: Date, monthOffset: number): Date {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth() + monthOffset, 1);
  const lastDay = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth() + 1, 0).getDate();
  firstOfMonth.setDate(Math.min(anchor.getDate(), lastDay));
  firstOfMonth.setHours(anchor.getHours(), anchor.getMinutes(), anchor.getSeconds(), anchor.getMilliseconds());
  return firstOfMonth;
}

function addOccurrenceYears(anchor: Date, yearOffset: number): Date {
  const targetYear = anchor.getFullYear() + yearOffset;
  const lastDay = new Date(targetYear, anchor.getMonth() + 1, 0).getDate();
  return new Date(
    targetYear,
    anchor.getMonth(),
    Math.min(anchor.getDate(), lastDay),
    anchor.getHours(),
    anchor.getMinutes(),
    anchor.getSeconds(),
    anchor.getMilliseconds()
  );
}

/** Expands recurring events that start inside [rangeStart, rangeEnd). */
export function expandRecurringEvents(
  events: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date
): CalendarEvent[] {
  const rangeStartDay = atStartOfDay(rangeStart).getTime();
  const rangeEndDay = atStartOfDay(rangeEnd).getTime();
  const expanded: CalendarEvent[] = [];

  events.forEach((event) => {
    const anchor = new Date(event.start);
    const anchorEnd = new Date(event.end);
    if (Number.isNaN(anchor.getTime()) || Number.isNaN(anchorEnd.getTime())) {
      return;
    }

    const repeat = event.repeat;
    if (!repeat?.enabled) {
      if (anchor.getTime() >= rangeStartDay && anchor.getTime() < rangeEndDay) {
        expanded.push(event);
      }
      return;
    }

    const endLimit = repeat.endMode === 'onDate' && repeat.endDate
      ? new Date(`${repeat.endDate}T00:00:00`)
      : null;
    const maxOccurrences = repeat.endMode === 'after' ? Math.max(1, repeat.occurrences) : Infinity;
    const duration = anchorEnd.getTime() - anchor.getTime();
    let occurrenceCount = 0;
    let monthOffset = 0;
    let yearOffset = 0;
    let candidate = new Date(anchor);
    const selectedWeekdays = repeat.daysOfWeek.length ? repeat.daysOfWeek : [anchor.getDay()];

    if (repeat.frequency === 'custom') {
      while (!selectedWeekdays.includes(candidate.getDay())) {
        candidate.setDate(candidate.getDate() + 1);
      }
    }

    while (candidate.getTime() < rangeEndDay) {
      if (occurrenceCount >= maxOccurrences) break;
      if (endLimit && atStartOfDay(candidate).getTime() > endLimit.getTime()) break;

      const isExcluded = repeat.excludedDates?.includes(localDateKey(candidate)) ?? false;
      if (candidate.getTime() >= rangeStartDay && !isExcluded) {
        expanded.push({
          ...event,
          start: candidate.toISOString(),
          end: new Date(candidate.getTime() + duration).toISOString(),
        });
      }
      occurrenceCount += 1;

      if (repeat.frequency === 'weekly') {
        candidate = new Date(candidate);
        candidate.setDate(candidate.getDate() + 7);
      } else if (repeat.frequency === 'monthly') {
        monthOffset += 1;
        candidate = addOccurrenceMonths(anchor, monthOffset);
      } else if (repeat.frequency === 'yearly') {
        yearOffset += 1;
        candidate = addOccurrenceYears(anchor, yearOffset);
      } else {
        candidate = new Date(candidate);
        candidate.setDate(candidate.getDate() + 1);
        while (
          candidate.getTime() < rangeEndDay &&
          !selectedWeekdays.includes(candidate.getDay())
        ) {
          candidate.setDate(candidate.getDate() + 1);
        }
      }
    }
  });

  return expanded;
}

export function matchesPriorityRange(priority: number, minPriority: number, maxPriority: number): boolean {
  return priority >= minPriority && priority <= maxPriority;
}
