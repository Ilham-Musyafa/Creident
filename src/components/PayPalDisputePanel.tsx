import { paypalDisputeLabel, type PayPalDisputeLabelKind } from '../lib/paypalDisputeLabels';
import { Card, Notice, SectionTitle } from './layoutPrimitives';
import { KeyValue } from './ui';
import { ActionButton, PayPalDisputeActions } from './client';
import { PayPalMessageDraft } from './OutboundDrafts';
import { shortDate, type Role } from './view';
import type { StoredPayPalDispute, StoredTx } from '../lib/repository';

export function PayPalDisputeCode({ kind, code }: { kind: PayPalDisputeLabelKind; code: string }) {
  return <span title={code} className="[overflow-wrap:anywhere]">{paypalDisputeLabel(kind, code)}</span>;
}

export function PayPalDisputePanel({ tx, cases, role, simulatedMode, reviewerAllowed = true }: {
  tx: StoredTx; cases: StoredPayPalDispute[]; role: Role; simulatedMode: boolean; reviewerAllowed?: boolean;
}) {
  if (!tx.captured && !cases.length) return null;
  const canAct = role === 'seller' || (role === 'reviewer' && reviewerAllowed);
  const canSimulate = simulatedMode && tx.status === 'COMPLETED' && tx.item.startsWith('[Demo]') && !cases.length;
  return <section className="min-w-0 space-y-3" aria-label="PayPal dispute">
    <SectionTitle>PayPal dispute</SectionTitle>
    {cases.length === 0 && <Notice>No PayPal case has been detected for this deal. A reviewer can check for cases; the deadline check also looks at completed payments.</Notice>}
    {role === 'reviewer' && reviewerAllowed && <ActionButton path="/api/paypal/disputes/sync" role="reviewer" label="Check PayPal disputes" variant="ghost" fullWidth/>}
    {canSimulate && <Card>
      <p className="mb-3 text-sm text-muted">Demo only. Open a case for this completed example deal without contacting PayPal or moving money.</p>
      {role === 'buyer' || (role === 'reviewer' && reviewerAllowed)
        ? <ActionButton path={`/api/transactions/${tx.id}/paypal-dispute/simulate`} role={role} label="Open demo PayPal case" variant="ghost" fullWidth/>
        : <Notice>Switch to Buyer in Settings to open a demo PayPal case.</Notice>}
    </Card>}
    {cases.map(c => <div key={c.disputeId} className="min-w-0 space-y-3">
      {c.disputeId.startsWith('SIM-') && <Notice tone="warning">Demo PayPal case. Nothing is sent to PayPal.</Notice>}
      <KeyValue items={[
        { label: 'Case id', value: <span className="break-all">{c.disputeId}</span> },
        { label: 'Status', value: <PayPalDisputeCode kind="status" code={c.status}/> },
        { label: 'Stage', value: <PayPalDisputeCode kind="stage" code={c.stage}/> },
        { label: 'Reason', value: <PayPalDisputeCode kind="reason" code={c.reason}/> },
        { label: 'Last checked', value: shortDate(c.updatedAt) },
        { label: 'Actions PayPal offers', value: <ul className="space-y-1">{c.actions.length ? c.actions.map(action => <li key={action}><PayPalDisputeCode kind="action" code={action}/></li>) : <li>None yet</li>}</ul> },
      ]}/>
      {c.status !== 'RESOLVED' && canAct && <PayPalDisputeActions txId={tx.id} disputeId={c.disputeId} role={role} actions={c.actions}/>}
      {c.status !== 'RESOLVED' && canAct && (c.actions.includes('send_message') || c.actions.includes('provide_evidence')) && <PayPalMessageDraft txId={tx.id} disputeId={c.disputeId} role={role} evidenceStage={c.actions.includes('provide_evidence')}/>}
      {c.status !== 'RESOLVED' && !canAct && <Notice>Only the seller or a reviewer can send evidence or ask PayPal to step in.</Notice>}
    </div>)}
    {cases.length > 0 && <Notice>PayPal controls the case and offered actions. Changes may take a few minutes to appear. A resolved case resumes the deal's previous state; this notification does not infer a refund or release.</Notice>}
  </section>;
}
