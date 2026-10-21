import { boundedText, hasExactKeys, isPlainObject, runAssist, type AssistRequest } from './assist';
import { TERMS_SAMPLES } from './termsSamples';
import recorded from './terms-replay.json';
import type { TermsDraft } from './termsFields';
export type { TermsDraft } from './termsFields';
export { descriptionForDraft } from './termsFields';

export const TERMS_UNAVAILABLE = 'AI draft unavailable, fill the form manually';
export const TERMS_PROMPT_VERSION = 'terms-v1';
export const TERMS_SYSTEM = `Draft physical-goods terms from the quoted listing or chat. Return exactly item, condition, includedItems and criteria. item is a title of 1-200 characters; condition is a line of 1-120 characters. includedItems is 1-12 distinct strings of 1-60 characters. criteria is 1-12 distinct strings of 1-120 characters, phrased as checks a buyer can support with a photo or screenshot, such as screen cracks, a serial label, battery-health screenshot, or included items pictured together. Extract only supported details; do not invent condition, accessories or guarantees. Omit all personal names, speaker names, prices, currency amounts, contact details and URLs. Do not draft payment terms or decide a dispute. Trim every string. This is an editable draft, not locked terms.`;

const contactOrPrice = /https?:|www\.|\b[a-z\d-]+(?:\.[a-z\d-]+)*\.[a-z]{2,}\b|\b[^\s@]+@[^\s@]+\b|\p{Sc}|\b(?:USD|IDR|EUR|GBP|JPY|CAD|AUD|SGD|dollars?|euros?|pounds?|rupiah|price|asking|harga|cost|payment|deposit|fee|discount)\b|\bRp\.?\s*\d|\b\d+(?:[.,]\d+)?\s*(?:rb|ribu|jt|juta)\b|\b\d+[.,]\d{2}\b/iu;
const knownPerson = /\b(?:Alice|Bob|John|Jane|Charlie|David|Emma|Michael|Sarah|Robert|Mary)\b|\b[A-Z][a-z]+\s+(?:Example|Doe|Smith|Jones)\b|\b(?:Mr|Mrs|Ms|Dr)\.?\s+[A-Z]|\b(?:my name is|sold by|contact me|seller name|buyer name)\b/i;
const headings = /^(?:item|condition|included items|includes|criteria|checks|phone|camera|listing|seller|buyer|description)$/i;

/** Chat speaker labels are context for rejection, never part of the output or receipt. */
function speakerNames(text: string): string[] {
  return text.split(/\r?\n/).flatMap(line => {
    const match = line.match(/^\s*(?:\[?[\d: .-]+\]?\s*[-–]?\s*)?([\p{L}][\p{L} '\-]{1,50}):/u);
    const name = match?.[1]?.replace(/^(?:seller|buyer)\s+/i, '').trim();
    return name && !headings.test(name) ? [name.toLocaleLowerCase()] : [];
  });
}

export function validateTermsDraft(value: unknown, names: readonly string[] = []): TermsDraft | null {
  if (!isPlainObject(value) || !hasExactKeys(value, ['item', 'condition', 'includedItems', 'criteria'])) return null;
  const safe = (text: unknown, max: number): text is string => boundedText(text, max) && text === text.trim() &&
    !/[\r\n\x00-\x1f]/.test(text) && !contactOrPrice.test(text) && !knownPerson.test(text) &&
    !names.some(name => new RegExp(`(^|[^\\p{L}\\d])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}\\d])`, 'iu').test(text));
  const list = (items: unknown, max: number): items is string[] => Array.isArray(items) && items.length > 0 && items.length <= 12 &&
    items.every(item => safe(item, max)) && new Set(items.map(item => item.toLocaleLowerCase())).size === items.length;
  if (!safe(value.item, 200) || !safe(value.condition, 120) || !list(value.includedItems, 60) || !list(value.criteria, 120)) return null;
  const draft = { item: value.item, condition: value.condition, includedItems: [...value.includedItems], criteria: [...value.criteria] };
  // Keep the signed receipt and editable fields within the existing request byte limit.
  return new TextEncoder().encode(JSON.stringify(draft)).byteLength <= 3000 ? draft : null;
}

export function draftTerms(text: string, options: Pick<AssistRequest<TermsDraft>, 'env' | 'provider'> = {}) {
  const sample = TERMS_SAMPLES.find(sample => sample.text === text.trim());
  const names = speakerNames(text);
  return runAssist({ feature: 'terms', promptVersion: TERMS_PROMPT_VERSION, system: TERMS_SYSTEM,
    data: { listing: text }, userTexts: [text], validate: value => validateTermsDraft(value, names),
    replay: recorded, replayKey: sample?.id, ...options });
}
