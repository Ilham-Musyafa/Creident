import { isFinal } from './types';
import type { Effect, Trigger, TransitionResult, Tx, TxStatus } from './types';

// Pure transition function: no I/O, no clock. Everything time-dependent arrives in the trigger,
// so the same input always gives the same output and every rule can be unit-tested.

const NONE: Effect = { kind: 'NONE' };

function fail(code: string, message: string): TransitionResult {
  return { ok: false, code, message };
}

function move(tx: Tx, status: TxStatus, effect: Effect = NONE, patch: Partial<Tx> = {}): TransitionResult {
  const next: Tx = { ...tx, ...patch, status };
  if (effect.kind === 'PAYPAL_CAPTURE') next.captured = true;
  if (status !== 'FROZEN_EXTERNAL') delete next.frozenFrom;
  return { ok: true, tx: next, effect };
}

function wrongState(tx: Tx, trigger: Trigger, expected: TxStatus[]): TransitionResult {
  return fail(
    'INVALID_STATE',
    `${trigger.type} is not allowed in ${tx.status} (allowed in: ${expected.join(', ')})`,
  );
}

const at = (iso: string): number => {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new Error(`Invalid timestamp: ${iso}`);
  return ms;
};

export function transition(tx: Tx, trigger: Trigger): TransitionResult {
  if (isFinal(tx.status) && trigger.type !== 'EXTERNAL_DISPUTE') {
    return fail('FINAL_STATE', `Transaction is already ${tx.status}`);
  }

  switch (trigger.type) {
    case 'ACCEPT_TERMS':
      if (tx.status !== 'DRAFT') return wrongState(tx, trigger, ['DRAFT']);
      if (!trigger.bothAccepted) return fail('TERMS_NOT_ACCEPTED', 'Both parties must accept the terms');
      return move(tx, 'TERMS_LOCKED');

    case 'START_PAYMENT':
      if (tx.status !== 'TERMS_LOCKED') return wrongState(tx, trigger, ['TERMS_LOCKED']);
      return move(tx, 'AWAITING_APPROVAL', { kind: 'PAYPAL_CREATE_ORDER' });

    case 'BUYER_APPROVED':
      if (tx.status !== 'AWAITING_APPROVAL') return wrongState(tx, trigger, ['AWAITING_APPROVAL']);
      // Tested in the Sandbox: authorize fails with ORDER_NOT_APPROVED before the buyer approves.
      if (!trigger.orderApproved) return fail('ORDER_NOT_APPROVED', 'The buyer has not approved the PayPal order yet');
      return move(tx, 'AUTHORIZED', { kind: 'PAYPAL_AUTHORIZE' });

    case 'SHIP_DEADLINE_PASSED':
      if (tx.status !== 'AUTHORIZED') return wrongState(tx, trigger, ['AUTHORIZED']);
      if (!tx.shipBy) return fail('NO_DEADLINE', 'Transaction has no ship-by deadline');
      if (at(trigger.now) <= at(tx.shipBy)) return fail('DEADLINE_NOT_REACHED', 'Ship-by deadline has not passed');
      return move(tx, 'VOIDED', { kind: 'PAYPAL_VOID' });

    case 'SUBMIT_TRACKING':
      if (tx.status !== 'AUTHORIZED') return wrongState(tx, trigger, ['AUTHORIZED']);
      if (!tx.shipBy) return fail('NO_DEADLINE', 'Transaction has no ship-by deadline');
      if (at(trigger.now) > at(tx.shipBy)) return fail('DEADLINE_PASSED', 'Tracking submitted after the ship-by deadline');
      return move(tx, 'SHIPPED');

    case 'TRACKING_DELIVERED':
      if (tx.status !== 'SHIPPED') return wrongState(tx, trigger, ['SHIPPED']);
      // Delivered to a different destination than agreed goes to review, never straight to inspection.
      return move(tx, trigger.destinationMatches ? 'IN_INSPECTION' : 'UNDER_REVIEW');

    case 'TRACKING_INVALID':
      if (tx.status !== 'SHIPPED') return wrongState(tx, trigger, ['SHIPPED']);
      return move(tx, 'UNDER_REVIEW');

    case 'BUYER_CONFIRM':
      if (tx.status !== 'IN_INSPECTION') return wrongState(tx, trigger, ['IN_INSPECTION']);
      if (trigger.externalDisputeOpen) return fail('EXTERNAL_DISPUTE_OPEN', 'A PayPal dispute is open');
      return move(tx, 'COMPLETED', { kind: 'PAYPAL_CAPTURE' });

    case 'INSPECTION_EXPIRED':
      if (tx.status !== 'IN_INSPECTION') return wrongState(tx, trigger, ['IN_INSPECTION']);
      if (!tx.inspectionUntil) return fail('NO_DEADLINE', 'Transaction has no inspection window');
      if (at(trigger.now) < at(tx.inspectionUntil)) return fail('DEADLINE_NOT_REACHED', 'Inspection window is still open');
      if (trigger.externalDisputeOpen) return fail('EXTERNAL_DISPUTE_OPEN', 'A PayPal dispute is open');
      return move(tx, 'COMPLETED', { kind: 'PAYPAL_CAPTURE' });

    case 'OPEN_DISPUTE':
      if (tx.status !== 'IN_INSPECTION') return wrongState(tx, trigger, ['IN_INSPECTION']);
      if (!tx.inspectionUntil) return fail('NO_DEADLINE', 'Transaction has no inspection window');
      if (at(trigger.now) >= at(tx.inspectionUntil)) return fail('DEADLINE_PASSED', 'Inspection window has closed');
      return move(tx, 'DISPUTED');

    case 'EVIDENCE_COMPLETE':
      if (tx.status !== 'DISPUTED') return wrongState(tx, trigger, ['DISPUTED']);
      return move(tx, 'UNDER_REVIEW');

    case 'DECISION':
      if (tx.status !== 'UNDER_REVIEW') return wrongState(tx, trigger, ['UNDER_REVIEW']);
      if (trigger.outcome === 'RELEASE') return move(tx, 'COMPLETED', { kind: 'PAYPAL_CAPTURE' });
      // Tested in the Sandbox: a captured authorization cannot be voided, only refunded.
      return tx.captured
        ? move(tx, 'REFUNDED', { kind: 'PAYPAL_REFUND' })
        : move(tx, 'VOIDED', { kind: 'PAYPAL_VOID' });

    case 'EXTERNAL_DISPUTE':
      if (tx.status === 'FROZEN_EXTERNAL') return fail('ALREADY_FROZEN', 'Transaction is already frozen');
      return move(tx, 'FROZEN_EXTERNAL', NONE, { frozenFrom: tx.status });

    case 'EXTERNAL_RESOLVED':
      if (tx.status !== 'FROZEN_EXTERNAL' || !tx.frozenFrom) return wrongState(tx, trigger, ['FROZEN_EXTERNAL']);
      return move(tx, tx.frozenFrom);

    case 'CANCEL': {
      const allowed: TxStatus[] = ['DRAFT', 'TERMS_LOCKED', 'AWAITING_APPROVAL'];
      if (!allowed.includes(tx.status)) return wrongState(tx, trigger, allowed);
      // Nothing is reserved before authorization, so cancelling needs no PayPal call.
      return move(tx, 'CANCELLED');
    }

    default: {
      const unknown: never = trigger;
      return fail('UNKNOWN_TRIGGER', `Unknown trigger ${JSON.stringify(unknown)}`);
    }
  }
}
