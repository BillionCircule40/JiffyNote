import type { PlannerEvent, PlannerPlan } from '../components/PlannerView';
import { apiRequest } from './apiService';

let pendingSync: Promise<void> = Promise.resolve();

const normalizeEvent = (value: unknown, planId: string, index: number): PlannerEvent | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const event = value as Record<string, unknown>;
  const validDays = Array.isArray(event.daysOfWeek)
    ? event.daysOfWeek.filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6)
    : [];
  const legacyDay = Number(event.dayOfWeek);
  const daysOfWeek = Array.from(new Set(validDays.length > 0
    ? validDays
    : Number.isInteger(legacyDay) && legacyDay >= 0 && legacyDay <= 6 ? [legacyDay] : []))
    .sort((first, second) => first - second);
  if (daysOfWeek.length === 0) {
    return null;
  }

  return {
    id: typeof event.id === 'string' ? event.id : `${planId}-event-${index}`,
    title: typeof event.title === 'string' ? event.title : 'Untitled event',
    dayOfWeek: daysOfWeek[0] ?? 0,
    daysOfWeek,
    startTime: typeof event.startTime === 'string' ? event.startTime : '09:00',
    endTime: typeof event.endTime === 'string' ? event.endTime : '10:00',
    color: typeof event.color === 'string' ? event.color : '#039be5',
    noteIds: Array.isArray(event.noteIds) ? event.noteIds.filter((noteId): noteId is string => typeof noteId === 'string') : [],
  };
};

export const normalizePlannerPlans = (value: unknown): PlannerPlan[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<PlannerPlan[]>((normalized, valueAtIndex, planIndex) => {
    if (!valueAtIndex || typeof valueAtIndex !== 'object' || Array.isArray(valueAtIndex)) {
      return normalized;
    }

    const rawPlan = valueAtIndex as Record<string, unknown>;
    const id = typeof rawPlan.id === 'string' ? rawPlan.id : `legacy-plan-${planIndex}`;
    const legacyEvent = normalizeEvent({
      id: `${id}-legacy-event`,
      title: rawPlan.title,
      dayOfWeek: rawPlan.dayOfWeek,
      startTime: rawPlan.startTime,
      endTime: rawPlan.endTime,
      color: rawPlan.color,
    }, id, 0);
    const events = Array.isArray(rawPlan.events)
      ? rawPlan.events
        .map((event, eventIndex) => normalizeEvent(event, id, eventIndex))
        .filter((event): event is PlannerEvent => event !== null)
      : legacyEvent ? [legacyEvent] : [];
    const recurrence = rawPlan.recurrence === 'weekly'
      || rawPlan.recurrence === 'biweekly'
      || rawPlan.recurrence === 'monthly'
      || rawPlan.recurrence === 'yearly'
      ? rawPlan.recurrence
      : null;

    normalized.push({
      id,
      title: typeof rawPlan.title === 'string' ? rawPlan.title : 'Untitled Plan',
      description: typeof rawPlan.description === 'string' ? rawPlan.description : '',
      color: typeof rawPlan.color === 'string' ? rawPlan.color : '#039be5',
      events,
      ...(recurrence ? { recurrence } : {}),
    });
    return normalized;
  }, []);
};

const clonePlans = (plans: PlannerPlan[]): PlannerPlan[] => normalizePlannerPlans(plans);

const plannerApiService = {
  getPlans: async (): Promise<PlannerPlan[]> => normalizePlannerPlans(await apiRequest<unknown>('/plans')),

  replacePlans: (plans: PlannerPlan[]): Promise<PlannerPlan[]> => {
    const snapshot = clonePlans(plans);
    const request = pendingSync.then(() => apiRequest<PlannerPlan[]>('/plans', {
      method: 'PUT',
      body: JSON.stringify(snapshot),
    }));
    pendingSync = request.then(() => undefined, () => undefined);
    return request;
  },
};

export default plannerApiService;