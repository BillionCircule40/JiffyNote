import {
  expandRecurringEvents,
  deleteRecurringOccurrence,
  focusPrioritySelection,
  getDefaultRepeatSettings,
  matchesPriorityRange,
  resetPrioritySelection,
  summarizeRepeatSettings,
  togglePrioritySelection,
} from './eventService';

describe('eventService', () => {
  const recurringEvent = {
    id: 'event-1',
    title: 'Planning',
    start: '2026-11-02T09:00:00.000Z',
    end: '2026-11-02T10:00:00.000Z',
    color: '#039be5',
    priority: 5,
    repeat: {
      enabled: true,
      frequency: 'weekly' as const,
      daysOfWeek: [],
      endMode: 'never' as const,
      occurrences: 1,
      endDate: null,
    },
  };

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

  it('creates weekly occurrences in the requested date range', () => {
    const occurrences = expandRecurringEvents(
      [recurringEvent],
      new Date('2026-11-09T00:00:00.000Z'),
      new Date('2026-11-30T00:00:00.000Z')
    );

    expect(occurrences.map((event) => event.start)).toEqual([
      '2026-11-09T09:00:00.000Z',
      '2026-11-16T09:00:00.000Z',
      '2026-11-23T09:00:00.000Z',
    ]);
  });

  it('honors custom weekdays and the occurrence limit', () => {
    const customEvent = {
      ...recurringEvent,
      repeat: { ...recurringEvent.repeat, frequency: 'custom' as const, daysOfWeek: [1, 3], endMode: 'after' as const, occurrences: 3 },
    };
    const occurrences = expandRecurringEvents(
      [customEvent],
      new Date('2026-11-02T00:00:00.000Z'),
      new Date('2026-11-16T00:00:00.000Z')
    );

    expect(occurrences.map((event) => event.start)).toEqual([
      '2026-11-02T09:00:00.000Z',
      '2026-11-04T09:00:00.000Z',
      '2026-11-09T09:00:00.000Z',
    ]);
  });

  it('counts each selected custom weekday as one occurrence, excluding an unselected anchor', () => {
    const customEvent = {
      ...recurringEvent,
      repeat: {
        ...recurringEvent.repeat,
        frequency: 'custom' as const,
        daysOfWeek: [2, 4],
        endMode: 'after' as const,
        occurrences: 4,
      },
    };
    const occurrences = expandRecurringEvents(
      [customEvent],
      new Date('2026-11-02T00:00:00.000Z'),
      new Date('2026-11-16T00:00:00.000Z')
    );

    expect(occurrences.map((event) => new Date(event.start).getDate())).toEqual([3, 5, 10, 12]);
  });

  it('deletes one occurrence without removing later instances', () => {
    const updated = deleteRecurringOccurrence(
      [recurringEvent],
      recurringEvent.id,
      new Date('2026-11-09T09:00:00.000Z'),
      'occurrence'
    );
    const occurrences = expandRecurringEvents(
      updated,
      new Date(2026, 10, 2),
      new Date(2026, 10, 24)
    );

    expect(updated).toHaveLength(1);
    expect(occurrences.map((event) => new Date(event.start).getDate())).toEqual([2, 16, 23]);
  });

  it('ends a recurring series before the selected occurrence', () => {
    const updated = deleteRecurringOccurrence(
      [recurringEvent],
      recurringEvent.id,
      new Date('2026-11-16T09:00:00.000Z'),
      'following'
    );
    const occurrences = expandRecurringEvents(
      updated,
      new Date(2026, 10, 2),
      new Date(2026, 10, 30)
    );

    expect(updated[0]?.repeat?.endDate).toBe('2026-11-15');
    expect(occurrences.map((event) => new Date(event.start).getDate())).toEqual([2, 9]);
  });

  it('creates monthly and yearly occurrences and includes the repeat end date', () => {
    const monthlyEvent = {
      ...recurringEvent,
      repeat: { ...recurringEvent.repeat, frequency: 'monthly' as const, endMode: 'onDate' as const, endDate: '2027-01-02' },
    };
    const monthlyOccurrences = expandRecurringEvents(
      [monthlyEvent],
      new Date('2026-11-25T00:00:00.000Z'),
      new Date('2027-02-01T00:00:00.000Z')
    );
    const yearlyOccurrences = expandRecurringEvents(
      [{
        ...recurringEvent,
        repeat: { ...recurringEvent.repeat, frequency: 'yearly' as const },
      }],
      new Date('2026-12-01T00:00:00.000Z'),
      new Date('2027-12-01T00:00:00.000Z')
    );

    expect(monthlyOccurrences.map((event) => event.start)).toEqual([
      '2026-12-02T09:00:00.000Z',
      '2027-01-02T09:00:00.000Z',
    ]);
    expect(yearlyOccurrences).toHaveLength(1);
    expect(new Date(yearlyOccurrences[0]!.start).getFullYear()).toBe(2027);
    expect(new Date(yearlyOccurrences[0]!.start).getMonth()).toBe(10);
    expect(new Date(yearlyOccurrences[0]!.start).getDate()).toBe(2);
    expect(new Date(yearlyOccurrences[0]!.start).getHours()).toBe(new Date(recurringEvent.start).getHours());
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
