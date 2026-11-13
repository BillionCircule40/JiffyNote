export type RepeatFrequency = 'weekly' | 'monthly' | 'yearly' | 'custom';
export type RepeatEndMode = 'never' | 'after' | 'onDate';

export interface EventRepeatSettings {
  enabled: boolean;
  frequency: RepeatFrequency;
  daysOfWeek: number[];
  endMode: RepeatEndMode;
  occurrences: number;
  endDate: string | null;
}

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

export function matchesPriorityRange(priority: number, minPriority: number, maxPriority: number): boolean {
  return priority >= minPriority && priority <= maxPriority;
}
