// AI assist #4 (DESIGN 6.1): outbound drafts.
// - A message to PayPal for the dispute bridge (inquiry message or evidence notes).
// - A courier claim pack for an item the buyer reported damaged in transit.
// The AI only drafts text from the deal's own locked terms, evidence and decision.
// A person approves or edits the text before anything is sent or downloaded; money-moving
// code never reads these drafts.

import type { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { runAssist, isPlainObject, hasExactKeys, boundedText, citesKnownIds, type AssistMeta, type AssistResult } from './assist';
import type { StoredDecision, StoredEvidence, StoredTx } from '../repository';
import type { AiEvidenceProvider } from './evidence';
import replayDrafts from './drafts-replay.json' with { type: 'json' };

export type DraftFeature = 'paypal-message' | 'courier-claim';

export interface PayPalMessageDraft { message: string; citedEvidence: string[] }
export interface CourierClaimDraft {
  subject: string;
  claimedDamage: string;
  body: string;
  timeline: Array<{ when: string; event: string; evidence: string[] }>;
  attachments: string[];
  citedEvidence: string[];
}

export const PAYPAL_MESSAGE_MAX = 1500;
export const COURIER_BODY_MAX = 2500;

const PROMPTS = {
  'paypal-message': {
    version: 'paypal-message-v1',
    system: `You draft a short, factual message from the seller of a peer-to-peer sale to PayPal about a buyer dispute. Use only facts in the data. When you rely on an evidence item, mention its alias (for example B1 or S1) and list every alias you used in citedEvidence. Do not invent facts, dates, amounts, names, links, email addresses or promises. Do not say who is right; ask PayPal to review the locked terms and the recorded evidence. Do not include hashes; the app appends the terms hash and audit head itself. At most ${PAYPAL_MESSAGE_MAX} characters. Output keys: message, citedEvidence.`,
  },
  'courier-claim': {
    version: 'courier-claim-v1',
    system: `You draft a damage claim that the seller of a parcel can send to their courier. The buyer reported the item damaged on delivery. Use only facts in the data. Do not state as fact that the courier caused the damage; describe what was declared at handover and what the buyer reported. Each timeline entry must cite at least one evidence alias (for example B1 or S1); timeline entries without evidence are dropped. List the aliases you used in citedEvidence. attachments lists which recorded items the seller should attach, by alias and short label. Do not invent facts, dates, amounts, names, links or contact details. Output keys: subject, claimedDamage, body, timeline (array of {when, event, evidence}), attachments, citedEvidence.`,
  },
} as const;

export interface DraftContext {
  tx: StoredTx;
  evidence: StoredEvidence[];
  decisions: StoredDecision[];
  disputeType?: string;
  headHash?: string;
}

/** Evidence gets stable, readable aliases (B1, B2 for the buyer, S1 for the seller) instead of internal ids. */
export function evidenceAliases(evidence: StoredEvidence[]): Map<string, StoredEvidence> {
  const aliases = new Map<string, StoredEvidence>();
  const count = { buyer: 0, seller: 0 };
  for (const side of ['buyer', 'seller'] as const) {
    for (const item of evidence.filter((e) => e.submittedBy === side)) {
      aliases.set(`${side === 'buyer' ? 'B' : 'S'}${++count[side]}`, item);
    }
  }
  return aliases;
}

function draftData(ctx: DraftContext) {
  const terms = JSON.parse(ctx.tx.termsJson) as Record<string, unknown>;
  return {
    item: ctx.tx.item,
    amount: `${ctx.tx.amount} ${ctx.tx.currency}`,
    lockedTerms: { condition: terms.condition ?? null, description: terms.description ?? null, criteria: Array.isArray(terms.criteria) ? terms.criteria : [] },
    termsHash: ctx.tx.termsHash,
    auditHead: ctx.headHash ?? null,
    tracking: ctx.tx.trackingNumber ?? null,
    disputeType: ctx.disputeType ?? null,
    evidence: [...evidenceAliases(ctx.evidence)].map(([alias, e]) => ({ alias, side: e.submittedBy, kind: e.kind, content: e.content })),
    decisions: ctx.decisions.map((d) => ({ outcome: d.outcome, reason: d.reason })),
  };
}

const NO_LINKS = /(https?:\/\/|www\.|\b[\w.+-]+@[\w-]+\.[\w.]+\b)/i;
const clean = (value: unknown, max: number, min = 1): value is string => boundedText(value, max, min) && !NO_LINKS.test(value);

export function validatePayPalMessage(value: unknown, aliases: ReadonlySet<string>): PayPalMessageDraft | null {
  if (!isPlainObject(value) || !hasExactKeys(value, ['message', 'citedEvidence'])) return null;
  if (!clean(value.message, PAYPAL_MESSAGE_MAX, 40) || !citesKnownIds(value.citedEvidence, aliases)) return null;
  return { message: value.message.trim(), citedEvidence: value.citedEvidence };
}

export function validateCourierClaim(value: unknown, aliases: ReadonlySet<string>): CourierClaimDraft | null {
  if (!isPlainObject(value) || !hasExactKeys(value, ['subject', 'claimedDamage', 'body', 'timeline', 'attachments', 'citedEvidence'])) return null;
  if (!clean(value.subject, 120, 5) || !clean(value.claimedDamage, 300, 5) || !clean(value.body, COURIER_BODY_MAX, 80) ||
      !Array.isArray(value.timeline) || value.timeline.length > 8 ||
      !Array.isArray(value.attachments) || value.attachments.length > 8 || !value.attachments.every((a) => clean(a, 120)) ||
      !citesKnownIds(value.citedEvidence, aliases)) return null;
  const timeline: CourierClaimDraft['timeline'] = [];
  for (const entry of value.timeline) {
    if (!isPlainObject(entry) || !hasExactKeys(entry, ['when', 'event', 'evidence']) ||
        !clean(entry.when, 40) || !clean(entry.event, 200)) return null;
    // Cite or drop: an entry without a known evidence alias is removed, not trusted.
    if (!citesKnownIds(entry.evidence, aliases, 8) || entry.evidence.length === 0) continue;
    timeline.push({ when: entry.when.trim(), event: entry.event.trim(), evidence: entry.evidence });
  }
  if (timeline.length === 0) return null;
  return {
    subject: value.subject.trim(), claimedDamage: value.claimedDamage.trim(), body: value.body.trim(), timeline,
    attachments: value.attachments.map((a) => (a as string).trim()), citedEvidence: value.citedEvidence,
  };
}

export async function draftFor(feature: 'paypal-message', ctx: DraftContext, options?: DraftOptions): Promise<AssistResult<PayPalMessageDraft>>;
export async function draftFor(feature: 'courier-claim', ctx: DraftContext, options?: DraftOptions): Promise<AssistResult<CourierClaimDraft>>;
export async function draftFor(feature: DraftFeature, ctx: DraftContext, options: DraftOptions = {}) {
  const aliases = new Set(evidenceAliases(ctx.evidence).keys());
  const prompt = PROMPTS[feature];
  return runAssist({
    feature, promptVersion: prompt.version, system: prompt.system, data: draftData(ctx),
    validate: (v) => feature === 'paypal-message' ? validatePayPalMessage(v, aliases) : validateCourierClaim(v, aliases),
    userTexts: [...ctx.evidence.map((e) => e.content), ...ctx.decisions.map((d) => d.reason)],
    replay: options.replay ?? replayDrafts as Record<string, unknown>,
    // Recorded drafts exist only for the labelled demo deals, keyed by feature and item.
    replayKey: `${feature}:${ctx.tx.item}`,
    env: options.env, provider: options.provider,
  });
}

export interface DraftOptions {
  env?: Record<string, string | undefined>;
  provider?: AiEvidenceProvider;
  replay?: Record<string, unknown>;
}

// Drafts are kept server-side so the app can tell whether a person sent the draft
// unchanged or edited it, without trusting the browser.
export interface StoredDraft<T = unknown> { id: string; txId: string; feature: DraftFeature; output: T; meta: AssistMeta; createdAt: string }

export function saveDraft<T>(db: DatabaseSync, txId: string, feature: DraftFeature, output: T, meta: AssistMeta, now: string): StoredDraft<T> {
  const id = randomUUID();
  db.prepare('INSERT INTO ai_drafts (id, tx_id, feature, output_json, meta_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, txId, feature, JSON.stringify(output), JSON.stringify(meta), now);
  return { id, txId, feature, output, meta, createdAt: now };
}

export function loadDraft<T>(db: DatabaseSync, id: string, txId: string, feature: DraftFeature): StoredDraft<T> | null {
  const row = db.prepare('SELECT * FROM ai_drafts WHERE id = ? AND tx_id = ? AND feature = ?').get(id, txId, feature);
  if (!row) return null;
  return { id, txId, feature, output: JSON.parse(String(row.output_json)) as T, meta: JSON.parse(String(row.meta_json)) as AssistMeta, createdAt: String(row.created_at) };
}

/** Audit fields for a draft a person used; the draft text stays out of the log. */
export function draftAudit(draft: StoredDraft, unchanged: boolean) {
  const { feature, mode, model, promptVersion, promptHash, outputHash } = draft.meta;
  return { aiDraft: { draftId: draft.id, feature, mode, model, promptVersion, promptHash, outputHash, accepted: unchanged ? 'unchanged' : 'edited' } };
}
