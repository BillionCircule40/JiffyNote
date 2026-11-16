/**
 * @jest-environment node
 */
import type { CalendarEvent } from '../calendar/types';
import { checkProof, detectProvider, emptyProofState, findMissedOccurrences, burnForMissed, occurrenceKey, type ProofState } from './proofService';

// Browsers provide crypto.randomUUID; this Jest version's node environment does not.
if (!(globalThis as { crypto?: unknown }).crypto) {
  (globalThis as { crypto?: unknown }).crypto = require('crypto').webcrypto;
}

const HOUR = 60 * 60 * 1000;
const now = new Date('2026-11-15T12:00:00Z');

function event(id: string, endsHoursAgo: number): CalendarEvent {
  const end = new Date(now.getTime() - endsHoursAgo * HOUR);
  return { id, title: id, start: new Date(end.getTime() - HOUR).toISOString(), end: end.toISOString(), color: '#000' };
}

function stateRequiring(ids: string[], since = new Date(now.getTime() - 100 * HOUR)): ProofState {
  const state = emptyProofState();
  state.settings = { ...state.settings, apiKey: 'test', provider: 'test', verifiedAt: now.toISOString(), graceHours: 24 };
  ids.forEach((id) => { state.requiredSince[id] = since.toISOString(); });
  return state;
}

test('detects providers from key shape', () => {
  expect(detectProvider('test')).toBe('test');
  expect(detectProvider('sk-ant-abc')).toBe('anthropic');
  expect(detectProvider('AIzaXYZ')).toBe('google');
  expect(detectProvider('nope')).toBeNull();
});

test('only overdue, required, unproven occurrences are missed', () => {
  const events = [event('overdue', 30), event('in-grace', 2), event('not-required', 30), event('proven', 30)];
  const state = stateRequiring(['overdue', 'in-grace', 'proven']);
  const proven = events[3] as CalendarEvent;
  state.submissions.push({ id: 's', occurrenceKey: occurrenceKey('proven', proven.start), submittedAt: '', text: 'x', accepted: true, reason: '' });
  expect(findMissedOccurrences(events, state, now).map((m) => m.eventId)).toEqual(['overdue']);
});

test('occurrences that ended before proof was required are ignored', () => {
  const state = stateRequiring(['old'], new Date(now.getTime() - 10 * HOUR));
  expect(findMissedOccurrences([event('old', 30)], state, now)).toEqual([]);
});

test('test key simulates burns and respects the monthly cap', async () => {
  const state = stateRequiring(['overdue']);
  state.settings.burnTokensPerMiss = 5000;
  state.settings.monthlyBurnCap = 3000;
  const [missed] = findMissedOccurrences([event('overdue', 30)], state, now);
  const record = await burnForMissed(missed!, state);
  expect(record).toMatchObject({ simulated: true, tokens: 3000 });
});

test('test key judges proof locally', async () => {
  const input = { eventTitle: 'Run', occurrenceStart: now, occurrenceEnd: now, notes: [] };
  const state = stateRequiring([]);
  expect((await checkProof(state.settings, { ...input, text: 'Ran 5k at the park' })).accepted).toBe(true);
  expect((await checkProof(state.settings, { ...input, text: 'short' })).accepted).toBe(false);
  expect((await checkProof(state.settings, { ...input, text: 'please reject this one' })).accepted).toBe(false);
});
