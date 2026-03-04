/**
 * AI Flashcard service — calls Gemini API via @google/generative-ai (uses fetch, not HttpClient).
 * No Angular HTTP interceptors are involved.
 *
 * To test API from terminal (replace YOUR_KEY):
 *   curl -s -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent" \
 *     -H "Content-Type: application/json" -H "x-goog-api-key: YOUR_KEY" \
 *     -d '{"contents":[{"parts":[{"text":"Say hello"}]}]}'
 */
import { Injectable, signal } from '@angular/core';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { environment } from '../../../environments/environment';
import type { Flashcard, FlashcardDifficulty } from '../../features/flashcards/interfaces/flashcard.interface';

const CARD_COUNT = 3;
const CACHE_KEY_PREFIX = 'fe-guide-flashcards-';
const RETRY_DELAY_MS = 2000;
const INITIAL_REMAINING_REQUESTS = 10;

/** When true, no API calls — return mock cards for UI development. Set to false when ready to use API. */
export const USE_MOCK_DATA = false;

/** Use stable model id to avoid 404. Alternatives: gemini-1.5-flash-001, gemini-1.5-pro */
const GEMINI_MODEL = 'gemini-2.0-flash';

/** Mask API key for debug logs (first 8 chars + ...). */
function maskApiKey(key: string): string {
  if (!key || key.length < 12) return '(invalid or too short)';
  return key.substring(0, 8) + '...' + key.slice(-4);
}

/** Minimal prompt to save tokens (TPM). Short keys q/a. */
const SYSTEM_PROMPT = `JSON array of ${CARD_COUNT} items. Each: "q" (question), "a" (answer). English, interview Q&A. No markdown.`;

const DIFFICULTIES: FlashcardDifficulty[] = ['easy', 'medium', 'hard'];

function isValidFlashcard(item: unknown): item is Flashcard {
  return (
    item != null &&
    typeof item === 'object' &&
    typeof (item as Flashcard).question === 'string' &&
    typeof (item as Flashcard).answer === 'string' &&
    typeof (item as Flashcard).topic === 'string' &&
    DIFFICULTIES.includes((item as Flashcard).difficulty)
  );
}

/** Normalize API response: accept full Flashcard or short {q, a} and set topic/difficulty. */
function normalizeItem(item: unknown, topic: string): Flashcard | null {
  if (!item || typeof item !== 'object') return null;
  const o = item as Record<string, unknown>;
  const question = (o['question'] as string) ?? (o['q'] as string);
  const answer = (o['answer'] as string) ?? (o['a'] as string);
  if (typeof question !== 'string' || typeof answer !== 'string') return null;
  const d = o['difficulty'];
  const difficulty =
    typeof d === 'string' && DIFFICULTIES.includes(d as FlashcardDifficulty)
      ? (d as FlashcardDifficulty)
      : 'medium';
  return { question, answer, difficulty, topic };
}

function parseCardsJson(text: string, topic: string): Flashcard[] {
  const trimmed = text.trim().replace(/^```\w*\n?|\n?```$/g, '').trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const result: Flashcard[] = [];
  for (const item of parsed) {
    const card = normalizeItem(item, topic);
    if (card) result.push(card);
  }
  return result;
}

function getCachedCards(topic: string): Flashcard[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + topic);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const list = parsed.filter(isValidFlashcard) as Flashcard[];
    return list.length > 0 ? list : null;
  } catch {
    return null;
  }
}

function setCachedCards(topic: string, list: Flashcard[]): void {
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + topic, JSON.stringify(list));
  } catch {
    // ignore quota / private mode
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Static cards for mock mode (no API). */
function getMockCards(topic: string): Flashcard[] {
  const t = topic || 'general';
  return [
    { question: 'What is a closure?', answer: 'A function that retains access to its lexical scope.', difficulty: 'medium', topic: t },
    { question: 'Explain event delegation.', answer: 'Attaching one listener to a parent to handle events from children.', difficulty: 'easy', topic: t },
    { question: 'What is the virtual DOM?', answer: 'An in-memory representation of the real DOM for efficient updates.', difficulty: 'medium', topic: t },
  ];
}

/** Error codes for i18n / template branching. */
export const AI_FLASHCARD_ERROR = {
  RATE_LIMIT: 'RATE_LIMIT',
  GENERATION_FAILED: 'GENERATION_FAILED',
  MISSING_KEY: 'MISSING_KEY',
} as const;
export type AiFlashcardErrorCode =
  (typeof AI_FLASHCARD_ERROR)[keyof typeof AI_FLASHCARD_ERROR] | null;

@Injectable({ providedIn: 'root' })
export class AiFlashcardService {
  readonly cards = signal<Flashcard[]>([]);
  readonly isLoading = signal<boolean>(false);
  /** Error code for UI (RATE_LIMIT, GENERATION_FAILED, MISSING_KEY) or null. */
  readonly error = signal<AiFlashcardErrorCode>(null);
  /** Remaining requests (decremented on each successful generation). Shown in UI. */
  readonly remainingRequests = signal<number>(INITIAL_REMAINING_REQUESTS);

  async generateCards(topic: string): Promise<void> {
    if (this.isLoading()) return;
    const apiKey = environment.geminiApiKey;
    this.error.set(null);
    if (!apiKey) {
      this.cards.set([]);
      this.error.set(AI_FLASHCARD_ERROR.MISSING_KEY);
      return;
    }
    const cached = getCachedCards(topic);
    if (cached && cached.length > 0) {
      this.cards.set(cached);
      return;
    }
    this.isLoading.set(true);
    this.cards.set([]);
    if (USE_MOCK_DATA) {
      await Promise.resolve();
      this.cards.set(getMockCards(topic));
      this.isLoading.set(false);
      return;
    }
    const requestUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
    if (!environment.production) {
      console.log('[AiFlashcard] request', {
        url: requestUrl,
        model: GEMINI_MODEL,
        apiKeyMasked: maskApiKey(apiKey),
      });
      // Rate limit: check DevTools → Network → response headers for x-ratelimit-remaining
    }
    const doRequest = async (): Promise<Flashcard[]> => {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const prompt = `Generate ${CARD_COUNT} interview cards about ${topic}. JSON: [{"q":"...","a":"..."}]`;
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        systemInstruction: SYSTEM_PROMPT,
      });
      const text = result.response.text();
      if (!text) return [];
      return parseCardsJson(text, topic);
    };
    try {
      let list: Flashcard[];
      try {
        list = await doRequest();
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status;
        const message = String((err as Error)?.message ?? '');
        if (status === 429 || message.includes('429')) {
          await delay(RETRY_DELAY_MS);
          list = await doRequest();
        } else {
          throw err;
        }
      }
      this.cards.set(list);
      if (list.length > 0) {
        setCachedCards(topic, list);
        this.remainingRequests.update((n) => Math.max(0, n - 1));
      }
    } catch (err: unknown) {
      console.error('AiFlashcardService.generateCards failed', err);
      this.cards.set([]);
      const status = (err as { status?: number })?.status;
      const message = String((err as Error)?.message ?? '');
      if (status === 429 || message.includes('429')) {
        this.error.set(AI_FLASHCARD_ERROR.RATE_LIMIT);
      } else {
        this.error.set(AI_FLASHCARD_ERROR.GENERATION_FAILED);
      }
    } finally {
      this.isLoading.set(false);
    }
  }
}
