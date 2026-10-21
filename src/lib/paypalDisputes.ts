import { createHash } from 'node:crypto';
import { canonicalJson, verifyChain } from './audit/chain';
import { decisionBasis } from './decisionBasis';
import { textPdf } from './evidencePdf';
import { draftAudit, type PayPalMessageDraft, type StoredDraft } from './ai/drafts';
import { DomainError } from './orchestrator';
import { PayPalError, type PayPalClient } from './paypal/client';
import type { StoredPayPalDispute, StoredTx, TransactionRepository } from './repository';

export type DisputeClient = Pick<PayPalClient, 'listDisputes' | 'getDispute' | 'provideEvidence' | 'sendDisputeMessage' | 'escalateDispute'>;
export type PayPalCase = Awaited<ReturnType<DisputeClient['getDispute']>>;
export interface DisputeDeps { repo: TransactionRepository; paypal: DisputeClient; now: () => string; actor: string; simulated: boolean }
const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const labels = (deps: DisputeDeps) => ({ source: 'disputes_api', ...(deps.simulated ? { simulated: true } : {}) });
const validText = (s: unknown, max: number) => typeof s === 'string' && s.length > 0 && s.length <= max;

function belongsToDeal(detail: PayPalCase, tx: StoredTx): void {
  if (!validText(detail.id, 200) || !validText(detail.status, 100) || !validText(detail.reason, 500) ||
      (detail.stage !== undefined && !validText(detail.stage, 100)) ||
      !Array.isArray(detail.actions) || detail.actions.length > 40 || detail.actions.some(a => !validText(a, 100)) ||
      !tx.paypalCaptureId || !detail.sellerTransactionIds.includes(tx.paypalCaptureId)) {
    throw new DomainError('DISPUTE_MISMATCH', 'PayPal case does not match this captured deal');
  }
}

function store(detail: PayPalCase, tx: StoredTx, deps: DisputeDeps): StoredPayPalDispute {
  belongsToDeal(detail, tx);
  return deps.repo.savePayPalDispute({ txId: tx.id, disputeId: detail.id, status: detail.status,
    stage: detail.stage ?? 'UNKNOWN', reason: detail.reason, actions: detail.actions, updatedAt: deps.now() }, deps.simulated);
}

function failure(txId: string, action: string, error: unknown, deps: DisputeDeps, disputeId?: string): void {
  deps.repo.appendAuditEvent({ txId, ts: deps.now(), actor: deps.actor, type: 'PAYPAL_DISPUTE_ACTION_FAILED', payload: {
    ...labels(deps), action, disputeId: disputeId ?? null,
    code: error instanceof PayPalError ? error.code : error instanceof DomainError ? error.code : 'DISPUTE_ACTION_FAILED',
    issue: error instanceof PayPalError ? error.issue ?? null : null,
    debug_id: error instanceof PayPalError ? error.debugId ?? null : null,
  } });
}

// Discovery policy, not a guarantee of PayPal eligibility for every dispute category.
export const PAYPAL_DISPUTE_WINDOW_DAYS = 180;
export const PAYPAL_DISPUTE_MAX_POLL_CALLS = 50;

/** Bound dispute reads per invocation; known open cases are age-exempt and get priority. */
export async function syncPayPalDisputes(deps: DisputeDeps) {
  type Result = { txId: string; cases: number; error?: string; debug_id?: string; deferred?: boolean };
  const results = new Map<string, Result>();
  const mode = deps.simulated ? 'simulated' : 'sandbox';
  const cutoff = new Date(Date.parse(deps.now()) - PAYPAL_DISPUTE_WINDOW_DAYS * 86_400_000).toISOString();
  const known = deps.repo.listPayPalDisputes();
  const resolved = new Set(known.filter(c => c.status === 'RESOLVED').map(c => c.disputeId));
  const attempted = new Set<string>();
  let calls = 0;
  const matchesMode = (tx: StoredTx) => tx.captured && !!tx.paypalCaptureId && /^(SIM|DEMO)-/.test(tx.paypalCaptureId) === deps.simulated;
  const resultFor = (txId: string) => {
    if (!results.has(txId)) results.set(txId, { txId, cases: 0 });
    return results.get(txId)!;
  };
  const onError = (tx: StoredTx, error: unknown, disputeId?: string) => {
    failure(tx.id, 'sync', error, deps, disputeId);
    Object.assign(resultFor(tx.id), {
      error: error instanceof PayPalError ? error.issue ?? error.code : 'DISPUTE_SYNC_FAILED',
      ...(error instanceof PayPalError && error.debugId ? { debug_id: error.debugId } : {}),
    });
  };
  const refresh = async (id: string, tx: StoredTx) => {
    if (!validText(id, 200)) {
      onError(tx, new DomainError('INVALID_DISPUTE', 'PayPal returned an invalid case id'));
      return;
    }
    if (attempted.has(id) || resolved.has(id)) return;
    if (calls >= PAYPAL_DISPUTE_MAX_POLL_CALLS) { resultFor(tx.id).deferred = true; return; }
    attempted.add(id);
    deps.repo.recordDisputePollAttempt(mode, 'case', id);
    calls++;
    try {
      const detail = await deps.paypal.getDispute(id);
      if (detail.id !== id) throw new DomainError('DISPUTE_MISMATCH', 'PayPal returned another case');
      store(detail, tx, deps);
      resultFor(tx.id).cases++;
    } catch (error) { onError(tx, error, id); }
  };
  // Persisted attempt order rotates even when clocks tie, a provider fails, or the app restarts.
  const caseAttempts = deps.repo.disputePollAttempts(mode, 'case');
  const open = deps.repo.openPayPalDisputeRefs().sort((a, b) =>
    (caseAttempts.get(a.disputeId) ?? 0) - (caseAttempts.get(b.disputeId) ?? 0) || a.disputeId.localeCompare(b.disputeId));
  for (const c of open) {
    const tx = deps.repo.loadTransaction(c.txId);
    if (tx && matchesMode(tx)) await refresh(c.disputeId, tx);
  }

  const captureAttempts = deps.repo.disputePollAttempts(mode, 'capture');
  const recent = deps.repo.capturedTransactions(cutoff).filter(matchesMode).sort((a, b) =>
    (captureAttempts.get(a.paypalCaptureId!) ?? 0) - (captureAttempts.get(b.paypalCaptureId!) ?? 0) || a.id.localeCompare(b.id));
  for (const tx of recent) {
    const result = resultFor(tx.id);
    if (calls >= PAYPAL_DISPUTE_MAX_POLL_CALLS) { result.deferred = true; continue; }
    deps.repo.recordDisputePollAttempt(mode, 'capture', tx.paypalCaptureId!);
    calls++;
    try {
      const listed = await deps.paypal.listDisputes({ disputedTransactionId: tx.paypalCaptureId });
      for (const id of new Set(listed.map(d => d.id))) await refresh(id, tx);
    } catch (error) { onError(tx, error); }
  }
  return [...results.values()];
}

export function disputeDocument(txId: string, repo: TransactionRepository) {
  const tx = repo.loadTransaction(txId);
  if (!tx) throw new DomainError('NOT_FOUND', 'Transaction not found');
  const evidence = repo.loadEvidence(txId);
  const basis = decisionBasis(tx.termsJson, evidence);
  if (!tx.termsHash || basis.termsHash !== tx.termsHash) throw new DomainError('TERMS_CHANGED', 'Locked terms no longer match their recorded hash');
  const events = repo.readEvents(txId);
  const chain = verifyChain(events);
  if (!chain.ok) throw new DomainError('AUDIT_INVALID', 'The audit chain must verify before evidence is sent');
  const submissions = events.filter(event => event.type === 'EVIDENCE_SUBMITTED');
  if (submissions.length !== evidence.length || evidence.some(item => {
    const submitted = submissions.find(event => event.payload.evidenceId === item.id);
    return !submitted || submitted.actor !== item.submittedBy || submitted.payload.kind !== item.kind || submitted.payload.contentHash !== hash(item.content);
  })) throw new DomainError('EVIDENCE_CHANGED', 'Evidence no longer matches the audited submissions');
  const decisions = repo.loadDecisions(txId);
  const lines = [
    'HalcyVault dispute evidence - text-only demo document',
    'Text uses ASCII rendering; SHA-256 hashes cover the original UTF-8 data.',
    `Deal: ${txId}`, `Item: ${tx.item}`, `Amount: ${tx.amount} ${tx.currency}`,
    `Terms hash: ${basis.termsHash}`, `Audit head: ${chain.head}`, `Evidence digest: ${basis.evidenceDigest}`,
    `Tracking: ${tx.trackingNumber ?? 'Not submitted'}`,
    `Locked terms: ${canonicalJson(JSON.parse(tx.termsJson))}`,
    ...evidence.flatMap(e => [`Evidence ${e.id} | ${e.submittedBy} | ${e.kind}`, `sha256: ${hash(e.content)}`, `Content: ${e.content}`]),
    ...decisions.flatMap(d => [`Decision: ${d.outcome} | Reviewer: ${d.reviewerId}`, `Reviewer reason: ${d.reason}`]),
    ...(decisions.length ? [] : ['Human decision: none recorded']),
  ];
  return { file: textPdf(lines, true), basis, headHash: chain.head,
    manifest: { ...basis, item: tx.item, amount: tx.amount, currency: tx.currency, tracking: tx.trackingNumber ?? null, decisions } };
}

/** A person-approved note (typed or from an AI draft, DESIGN 6.1) sent with a message or evidence. */
export interface DisputeNote { text: string; draft?: StoredDraft<PayPalMessageDraft> }

/** The app, not the AI, appends the record identifiers so they are always exact. */
export function noteWithRecord(text: string, termsHash: string, headHash: string): string {
  return `${text.trim()}\n\nHalcyVault record: terms hash ${termsHash}, audit head ${headHash}.`;
}

export async function actOnPayPalDispute(txId: string, requestedId: string | undefined, operation: 'evidence' | 'escalate', deps: DisputeDeps, note?: DisputeNote) {
  let disputeId = requestedId;
  let failureRecorded = false;
  try {
    const tx = deps.repo.loadTransaction(txId);
    if (!tx?.captured) throw new DomainError('INVALID_STATE', 'A captured deal is required');
    const cases = deps.repo.listPayPalDisputes(txId);
    const chosen = requestedId ? cases.find(c => c.disputeId === requestedId) : cases.find(c => c.status !== 'RESOLVED') ?? cases[0];
    if (!chosen) throw new DomainError('NOT_FOUND', 'No PayPal dispute is stored for this deal. Sync PayPal disputes first.');
    disputeId = chosen.disputeId;
    if (/^SIM-/.test(disputeId) !== deps.simulated) throw new DomainError('MODE_MISMATCH', 'This case belongs to another PayPal mode');
    const detail = await deps.paypal.getDispute(disputeId);
    if (detail.id !== disputeId) throw new DomainError('DISPUTE_MISMATCH', 'PayPal returned another case');
    const current = store(detail, tx, deps);
    if (current.status === 'RESOLVED') throw new DomainError('DISPUTE_RESOLVED', 'This PayPal case is resolved');
    const action = operation === 'escalate' ? 'escalate' : current.actions.includes('provide_evidence') ? 'provide_evidence'
      : current.actions.includes('send_message') ? 'send_message' : null;
    if (!action || !current.actions.includes(action)) throw new DomainError('DISPUTE_ACTION_UNAVAILABLE', 'PayPal does not currently offer this action. Check the case again later.');
    const document = disputeDocument(txId, deps.repo);
    if (note && action === 'escalate') throw new DomainError('INVALID_INPUT', 'A note is sent with a message or evidence, not with an escalation');
    const noteText = note ? noteWithRecord(note.text, document.basis.termsHash, document.headHash) : null;
    const requestId = `hv-dispute-${hash(canonicalJson({ disputeId, action, manifest: action === 'escalate' ? null : document.manifest, note: noteText }))}`;
    const claim = deps.repo.claimAction(txId, action, requestId);
    if (!claim.claimed) {
      if (claim.record.state !== 'success') throw new DomainError('ACTION_PENDING', 'The previous PayPal action needs checking before another attempt');
      return { action, alreadySent: true, simulated: deps.simulated, message: 'This action was already recorded.' };
    }
    try {
      if (action === 'provide_evidence') await deps.paypal.provideEvidence(disputeId, {
        reason: current.reason, notes: noteText ?? `HalcyVault locked evidence. Terms hash ${document.basis.termsHash}. Audit head ${document.headHash}.`,
        trackingNumber: tx.trackingNumber, carrierName: 'HalcyVault demo courier',
        file: { name: 'halcyvault-evidence.pdf', type: 'application/pdf', content: document.file },
      });
      else if (action === 'send_message') await deps.paypal.sendDisputeMessage(disputeId, noteText ??
        `HalcyVault has recorded the locked terms and evidence for this deal. Terms hash: ${document.basis.termsHash}. Audit head: ${document.headHash}. PDF evidence needs the claim stage; it cannot be attached in this inquiry.`);
      else await deps.paypal.escalateDispute(disputeId, 'Please ask PayPal to review this dispute. HalcyVault evidence will be submitted when provide_evidence is offered.');
    } catch (error) {
      // Keep an interrupted/failed action claimed; a blind retry could duplicate a message or escalation.
      failure(txId, action, error, deps, disputeId);
      failureRecorded = true;
      throw error;
    }
    const type = action === 'provide_evidence' ? 'PAYPAL_DISPUTE_EVIDENCE_SENT' : action === 'send_message' ? 'PAYPAL_DISPUTE_MESSAGE_SENT' : 'PAYPAL_DISPUTE_ESCALATED';
    deps.repo.saveSideEffect(requestId, txId, { txId, ts: deps.now(), actor: deps.actor, type,
      payload: { ...labels(deps), disputeId, action, ...document.basis, headHash: document.headHash, pdfHash: hash(document.file),
        ...(noteText ? { noteHash: hash(noteText) } : {}),
        ...(note?.draft ? draftAudit(note.draft, note.text.trim() === note.draft.output.message) : note ? { noteSource: 'typed' } : {}) } });
    let refreshPending = false;
    try { store(await deps.paypal.getDispute(disputeId), tx, deps); } catch { refreshPending = true; }
    return { action, simulated: deps.simulated, refreshPending,
      message: action === 'send_message' ? 'Message sent. PDF evidence needs the claim stage.'
        : action === 'escalate' ? 'Escalated to PayPal claim. PayPal may take a few minutes to offer evidence submission.' : 'HalcyVault evidence PDF sent to PayPal.' };
  } catch (error) {
    // A PayPal send failure was recorded above; local validation and read failures also need an audit trail.
    if (!failureRecorded) failure(txId, operation, error, deps, disputeId);
    throw error;
  }
}
