import {
  focusPrioritySelection,
  getDefaultRepeatSettings,
  matchesPriorityRange,
  resetPrioritySelection,
  summarizeRepeatSettings,
  togglePrioritySelection,
} from './eventService';

describe('eventService', () => {
  it('returns a disabled repeat config by default', () => {
    const config = getDefaultRepeatSettings();

    expect(config.enabled).toBe(false);
    expect(config.frequency).toBe('weekly');
  });

  it('summarizes a weekly repeat using the selected weekdays', () => {
    const summary = summarizeRepeatSettings({
      enabled: true,
      frequency: 'weekly',
      daysOfWeek: [2, 4],
      endMode: 'after',
      occurrences: 6,
      endDate: null,
    });

    expect(summary).toContain('Tue');
    expect(summary).toContain('Thu');
    expect(summary).toContain('6');
  });

  it('keeps events visible only inside the selected priority range', () => {
    expect(matchesPriorityRange(4, 3, 7)).toBe(true);
    expect(matchesPriorityRange(8, 3, 7)).toBe(false);
  });

  it('toggles a single priority on and off without removing the rest', () => {
    expect(togglePrioritySelection([1, 2, 3, 4, 5, 6, 7, 8, 9], 5)).toEqual([1, 2, 3, 4, 6, 7, 8, 9]);
    expect(togglePrioritySelection([1, 2, 3, 4, 6, 7, 8, 9], 5)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('focuses the calendar on one priority and resets to all priorities', () => {
    expect(focusPrioritySelection(4)).toEqual([4]);
    expect(resetPrioritySelection()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
