import type { DatabaseSync } from 'node:sqlite';
import { openDatabase } from '../../../lib/db';
import { PayPalClient } from '../../../lib/paypal/client';
import { createSimulatedPayPal, payPalMode, type PaymentGateway, type SimulatedGateway } from '../../../lib/paypal/simulated';
import { TransactionRepository } from '../../../lib/repository';
import { getTimeConfig, type TimeConfig } from '../../../lib/timeConfig';
import type { AiEvidenceProvider } from '../../../lib/ai/evidence';

export interface ApiContext {
  db: DatabaseSync;
  repo: TransactionRepository;
  paypal?: PayPalClient;
  simulatedPayPal?: SimulatedGateway;
  now: () => string;
  time: TimeConfig;
  aiProvider?: AiEvidenceProvider;
  aiEnv?: Record<string, string | undefined>;
}

let instance: ApiContext | null = null;
let testInstance: ApiContext | null = null;

export function seedDemoUsers(db: DatabaseSync): void {
  const insert = db.prepare('INSERT OR IGNORE INTO users (id, role, display_name) VALUES (?, ?, ?)');
  for (const role of ['buyer', 'seller', 'reviewer'] as const) insert.run(role, role, `Demo ${role}`);
}

export function getApiContext(): ApiContext {
  if (testInstance) return testInstance;
  if (!instance) {
    const db = openDatabase();
    seedDemoUsers(db);
    instance = { db, repo: new TransactionRepository(db), now: () => new Date().toISOString(), time: getTimeConfig() };
  }
  return instance;
}

export function setApiContextForTests(context: ApiContext | null): void {
  if (process.env.NODE_ENV !== 'test') throw new Error('Test context is only available in tests');
  testInstance = context;
}

export function getPayPal(context: ApiContext): PayPalClient {
  if (context.paypal) return context.paypal;
  const clientId = process.env.PP_ID;
  const clientSecret = process.env.PP_SECRET;
  const baseUrl = process.env.PP_URL;
  if (!clientId || !clientSecret || baseUrl !== 'https://api-m.sandbox.paypal.com') {
    throw new ApiSetupError('Sandbox PP_ID, PP_SECRET, and PP_URL are required for payment actions');
  }
  context.paypal = new PayPalClient({ baseUrl, clientId, clientSecret });
  return context.paypal;
}

/** Client for money steps: the labelled simulation when PAYPAL_MODE=simulated, else Sandbox. */
export function getPaymentGateway(context: ApiContext): PaymentGateway {
  if (payPalMode() !== 'simulated') return getPayPal(context);
  context.simulatedPayPal ??= createSimulatedPayPal(context.repo.listPayPalDisputes().filter(c => c.disputeId.startsWith('SIM-')).map(c => ({
    id: c.disputeId, status: c.status, stage: c.stage, reason: c.reason, actions: c.actions, outcome: undefined,
    sellerTransactionIds: [context.repo.loadTransaction(c.txId)!.paypalCaptureId!],
  })));
  return context.simulatedPayPal;
}

export function isSimulatedPayPal(): boolean {
  return payPalMode() === 'simulated';
}

export class ApiSetupError extends Error {}

export function getDisputeGateway(context: ApiContext) {
  if (!isSimulatedPayPal()) return getPayPal(context);
  getPaymentGateway(context);
  return context.simulatedPayPal!;
}
