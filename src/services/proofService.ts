import Anthropic from '@anthropic-ai/sdk';
import type { CalendarEvent } from '../calendar/types';
import { expandRecurringEvents } from './eventService';

// The literal key "test" skips every network call: verification always passes,
// proofs are judged by a local rule, and burns are only logged.
export const TEST_API_KEY = 'test';

export const ANTHROPIC_MODEL = 'claude-opus-5-5';
export const GOOGLE_MODEL = 'gemini-3.8-flash';

export type AiProvider = 'test' | 'anthropic' | 'google';

export interface ProofSettings {
  apiKey: string | null;
  provider: AiProvider | null;
  verifiedAt: string | null;
  graceHours: number;
  burnTokensPerMiss: number;
  monthlyBurnCap: number;
  // Real keys only spend money on burns when this is on. The test key never does.
  realBurnEnabled: boolean;
}

export interface ProofSubmission {
  id: string;
  occurrenceKey: string;
  submittedAt: string;
  text: string;
  imageDataUrl?: string;
  accepted: boolean;
  reason: string;
}

export interface BurnRecord {
  id: string;
  occurrenceKey: string;
  eventTitle: string;
  at: string;
  tokens: number;
  simulated: boolean;
  provider: AiProvider;
  note: string;
}

export interface ProofState {
  settings: ProofSettings;
  // eventId -> ISO time proof became required. Occurrences that ended earlier are never penalized.
  requiredSince: Record<string, string>;
  submissions: ProofSubmission[];
  burns: BurnRecord[];
}

export const DEFAULT_PROOF_SETTINGS: ProofSettings = {
  apiKey: null,
  provider: null,
  verifiedAt: null,
  graceHours: 24,
  burnTokensPerMiss: 20000,
  monthlyBurnCap: 200000,
  realBurnEnabled: false,
};

const PROOF_STORAGE_KEY = 'jiffynote.proof';
// Only look this far back for missed occurrences, so old recurring events can't pile up burns.
const LOOKBACK_DAYS = 30;

function storageKey(userId?: string): string {
  return userId ? `${PROOF_STORAGE_KEY}.${userId}` : PROOF_STORAGE_KEY;
}

export function emptyProofState(): ProofState {
  return { settings: { ...DEFAULT_PROOF_SETTINGS }, requiredSince: {}, submissions: [], burns: [] };
}

export function loadProofState(userId?: string): ProofState {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return emptyProofState();
    const parsed = JSON.parse(raw) as Partial<ProofState>;
    return {
      settings: { ...DEFAULT_PROOF_SETTINGS, ...(parsed.settings ?? {}) },
      requiredSince: parsed.requiredSince ?? {},
      submissions: parsed.submissions ?? [],
      burns: parsed.burns ?? [],
    };
  } catch {
    return emptyProofState();
  }
}

export function saveProofState(state: ProofState, userId?: string): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    // Storage full or blocked: state stays in memory for this session.
  }
}

export function occurrenceKey(eventId: string, occurrenceStart: Date | string): string {
  return `${eventId}@${new Date(occurrenceStart).toISOString()}`;
}

export function detectProvider(apiKey: string): AiProvider | null {
  const key = apiKey.trim();
  if (key === TEST_API_KEY) return 'test';
  if (key.startsWith('sk-ant-')) return 'anthropic';
  if (key.startsWith('AIza')) return 'google';
  return null;
}

function anthropicClient(apiKey: string): Anthropic {
  // The key belongs to the person using this browser and never leaves it except to Anthropic.
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

// @google/genai ships only as an ES module, so it is loaded on demand.
async function googleClient(apiKey: string) {
  const { GoogleGenAI } = await import('@google/genai');
  return new GoogleGenAI({ apiKey });
}

function errorMessage(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) return 'The API key was rejected.';
  if (error instanceof Anthropic.PermissionDeniedError) return 'The API key lacks permission for this request.';
  if (error instanceof Anthropic.RateLimitError) return 'Rate limited by the provider. Try again shortly.';
  if (error instanceof Anthropic.APIConnectionError) return 'Could not reach the provider.';
  if (error instanceof Anthropic.APIError) return error.message;
  return error instanceof Error ? error.message : String(error);
}

export interface VerifyResult {
  ok: boolean;
  provider: AiProvider | null;
  error?: string;
}

export async function verifyApiKey(apiKey: string): Promise<VerifyResult> {
  const key = apiKey.trim();
  const provider = detectProvider(key);
  if (!provider) {
    return { ok: false, provider: null, error: 'Unrecognized key. Use an Anthropic (sk-ant-…) or Google (AIza…) key, or "test".' };
  }

  try {
    if (provider === 'anthropic') {
      await anthropicClient(key).models.list({ limit: 1 });
    } else if (provider === 'google') {
      await (await googleClient(key)).models.list({ config: { pageSize: 1 } });
    }
    return { ok: true, provider };
  } catch (error) {
    return { ok: false, provider, error: errorMessage(error) };
  }
}

export interface ProofCheckInput {
  eventTitle: string;
  occurrenceStart: Date;
  occurrenceEnd: Date;
  notes: string[];
  text: string;
  imageDataUrl?: string;
}

export interface ProofVerdict {
  accepted: boolean;
  reason: string;
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    accepted: { type: 'boolean' },
    reason: { type: 'string' },
  },
  required: ['accepted', 'reason'],
  additionalProperties: false,
};

function buildJudgePrompt(input: ProofCheckInput): string {
  const notes = input.notes.length ? `\nLinked notes:\n${input.notes.map((n) => `- ${n}`).join('\n')}` : '';
  return [
    'You check whether a calendar task was actually completed, based on the proof the user submitted.',
    `Task: "${input.eventTitle}"`,
    `Scheduled: ${input.occurrenceStart.toLocaleString()} to ${input.occurrenceEnd.toLocaleString()}`,
    notes,
    '',
    `User's written proof: ${input.text.trim() || '(none)'}`,
    input.imageDataUrl ? 'An image was attached as proof (above).' : 'No image was attached.',
    '',
    'Accept only if the proof plausibly and specifically shows this task was done. Reject vague, unrelated, or empty proof.',
    'Give a one-sentence reason addressed to the user.',
  ].join('\n');
}

function splitDataUrl(dataUrl: string): { mediaType: string; data: string } | null {
  const match = /^data:(image\/(?:png|jpeg|gif|webp));base64,(.+)$/.exec(dataUrl);
  if (!match || !match[1] || !match[2]) return null;
  return { mediaType: match[1], data: match[2] };
}

function parseVerdict(raw: string | undefined): ProofVerdict {
  try {
    const parsed = JSON.parse(raw ?? '') as Partial<ProofVerdict>;
    if (typeof parsed.accepted === 'boolean') {
      return { accepted: parsed.accepted, reason: String(parsed.reason ?? '') };
    }
  } catch {
    // fall through
  }
  return { accepted: false, reason: 'The checker returned an unreadable verdict. Try submitting again.' };
}

// Test-mode rule, so the flow can be exercised without a real key:
// proof containing the word "reject" fails; otherwise an image or 10+ characters of text passes.
function judgeLocally(input: ProofCheckInput): ProofVerdict {
  const text = input.text.trim();
  if (/\breject\b/i.test(text)) return { accepted: false, reason: 'Test mode: proof contained "reject", so it was rejected.' };
  if (input.imageDataUrl) return { accepted: true, reason: 'Test mode: image proof accepted.' };
  if (text.length >= 10) return { accepted: true, reason: 'Test mode: written proof accepted.' };
  return { accepted: false, reason: 'Test mode: add at least 10 characters of detail or an image.' };
}

async function judgeWithAnthropic(apiKey: string, input: ProofCheckInput): Promise<ProofVerdict> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  const image = input.imageDataUrl ? splitDataUrl(input.imageDataUrl) : null;
  if (image) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: image.mediaType as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp', data: image.data },
    });
  }
  content.push({ type: 'text', text: buildJudgePrompt(input) });

  const response = await anthropicClient(apiKey).beta.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { format: { type: 'json_schema', schema: VERDICT_SCHEMA } },
    messages: [{ role: 'user', content }],
  });

  if (response.stop_reason === 'refusal') {
    return { accepted: false, reason: 'The checker declined to evaluate this proof.' };
  }
  const text = response.content.find((block) => block.type === 'text');
  return parseVerdict(text && text.type === 'text' ? text.text : undefined);
}

async function judgeWithGoogle(apiKey: string, input: ProofCheckInput): Promise<ProofVerdict> {
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  const image = input.imageDataUrl ? splitDataUrl(input.imageDataUrl) : null;
  if (image) parts.push({ inlineData: { mimeType: image.mediaType, data: image.data } });
  parts.push({ text: buildJudgePrompt(input) });

  const response = await (await googleClient(apiKey)).models.generateContent({
    model: GOOGLE_MODEL,
    contents: [{ role: 'user', parts }],
    config: { responseMimeType: 'application/json', responseJsonSchema: VERDICT_SCHEMA },
  });
  return parseVerdict(response.text);
}

export async function checkProof(settings: ProofSettings, input: ProofCheckInput): Promise<ProofVerdict> {
  if (!settings.apiKey || !settings.provider || !settings.verifiedAt) {
    return { accepted: false, reason: 'Add and verify an API key in Settings before submitting proof.' };
  }
  try {
    if (settings.provider === 'test') return judgeLocally(input);
    if (settings.provider === 'anthropic') return await judgeWithAnthropic(settings.apiKey, input);
    return await judgeWithGoogle(settings.apiKey, input);
  } catch (error) {
    return { accepted: false, reason: `Proof check failed: ${errorMessage(error)}` };
  }
}

export function tokensBurnedThisMonth(burns: BurnRecord[], now: Date = new Date()): number {
  return burns
    .filter((burn) => {
      const at = new Date(burn.at);
      return at.getFullYear() === now.getFullYear() && at.getMonth() === now.getMonth();
    })
    .reduce((sum, burn) => sum + burn.tokens, 0);
}

const BURN_PROMPT =
  'Write an exhaustive, extremely long essay on the history of calendars and timekeeping. Never summarize or stop early; keep elaborating with new detail.';

async function burnWithAnthropic(apiKey: string, tokens: number): Promise<number> {
  const message = await anthropicClient(apiKey).messages
    .stream({
      model: ANTHROPIC_MODEL,
      max_tokens: tokens,
      output_config: { effort: 'low' },
      messages: [{ role: 'user', content: BURN_PROMPT }],
    })
    .finalMessage();
  return message.usage.output_tokens;
}

async function burnWithGoogle(apiKey: string, tokens: number): Promise<number> {
  const response = await (await googleClient(apiKey)).models.generateContent({
    model: GOOGLE_MODEL,
    contents: BURN_PROMPT,
    config: { maxOutputTokens: tokens },
  });
  return response.usageMetadata?.candidatesTokenCount ?? tokens;
}

export interface MissedOccurrence {
  key: string;
  eventId: string;
  eventTitle: string;
  end: Date;
}

export function findMissedOccurrences(events: CalendarEvent[], state: ProofState, now: Date = new Date()): MissedOccurrence[] {
  const graceMs = Math.max(0, state.settings.graceHours) * 60 * 60 * 1000;
  const accepted = new Set(state.submissions.filter((s) => s.accepted).map((s) => s.occurrenceKey));
  const burned = new Set(state.burns.map((b) => b.occurrenceKey));
  const rangeStart = new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  // expandRecurringEvents works in whole days, so extend one day past now to include today.
  const rangeEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const required = events.filter((event) => state.requiredSince[event.id]);
  return expandRecurringEvents(required, rangeStart, rangeEnd).flatMap((occurrence) => {
    const end = new Date(occurrence.end);
    const since = new Date(state.requiredSince[occurrence.id] as string);
    const key = occurrenceKey(occurrence.id, occurrence.start);
    const overdue = end.getTime() + graceMs <= now.getTime();
    if (!overdue || end < since || accepted.has(key) || burned.has(key)) return [];
    return [{ key, eventId: occurrence.id, eventTitle: occurrence.title, end }];
  });
}

const burnsInFlight = new Set<string>();

// Burns tokens for one missed occurrence, respecting the per-miss amount and monthly cap.
// Returns the record to append, or null if another burn for this occurrence is already running.
export async function burnForMissed(missed: MissedOccurrence, state: ProofState): Promise<BurnRecord | null> {
  if (burnsInFlight.has(missed.key)) return null;
  burnsInFlight.add(missed.key);
  try {
    const { settings } = state;
    const provider: AiProvider = settings.provider ?? 'test';
    const remaining = Math.max(0, settings.monthlyBurnCap - tokensBurnedThisMonth(state.burns));
    const tokens = Math.min(Math.max(0, settings.burnTokensPerMiss), remaining);
    const base = {
      id: crypto.randomUUID(),
      occurrenceKey: missed.key,
      eventTitle: missed.eventTitle,
      at: new Date().toISOString(),
      provider,
    };

    if (tokens === 0) {
      return { ...base, tokens: 0, simulated: true, note: 'Monthly burn cap reached; nothing burned.' };
    }

    const realKey = settings.apiKey && settings.verifiedAt && provider !== 'test';
    if (!realKey || !settings.realBurnEnabled) {
      const why = provider === 'test' || !realKey ? 'test key' : 'real burns are turned off';
      return { ...base, tokens, simulated: true, note: `Simulated (${why}).` };
    }

    try {
      const spent = provider === 'anthropic'
        ? await burnWithAnthropic(settings.apiKey as string, tokens)
        : await burnWithGoogle(settings.apiKey as string, tokens);
      return { ...base, tokens: spent, simulated: false, note: `Burned ${spent.toLocaleString()} output tokens.` };
    } catch (error) {
      return { ...base, tokens: 0, simulated: false, note: `Burn failed: ${errorMessage(error)}` };
    }
  } finally {
    burnsInFlight.delete(missed.key);
  }
}

// Shrinks an uploaded image to fit localStorage and the providers' size limits.
export function readImageAsDataUrl(file: File, maxSide = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a supported image.'));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Image processing is unavailable in this browser.'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
