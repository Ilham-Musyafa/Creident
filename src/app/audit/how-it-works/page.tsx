import { TechnicalDetails } from '../../../components/TechnicalDetails';
import { Card, SectionTitle } from '../../../components/layout';
import { latestCheckpoint } from '../../../lib/audit/checkpointFiles';
import { shortDate } from '../../../components/view';
import { data, getRole } from '../../_server';
import { RecordsShell } from '../../../components/RecordsShell';

export const dynamic = 'force-dynamic';

export default async function HowVerificationWorksPage() {
  const role = await getRole();
  const ctx = data();
  const chains = new Map(ctx.db.prepare('SELECT id FROM transactions ORDER BY id').all()
    .map(row => [String(row.id), ctx.repo.readEvents(String(row.id))] as const));
  const published = latestCheckpoint(chains);
  const sealed = published.available && published.result.valid ? published.result : null;

  return (
    <RecordsShell role={role} title="How verification works" back="/audit">
      <div className="records-explainer mx-auto max-w-2xl space-y-2 text-sm leading-relaxed text-text">
        <SectionTitle>What is checked</SectionTitle>
        <Card>
          <p>Each saved step links to the one before it. Record checks look for changed, missing or reordered steps.</p>
          <TechnicalDetails>          <p>Every step of a deal (terms, payment, shipping, evidence, decisions) is saved with a fingerprint. Each fingerprint also covers the step before it, so the steps form a chain.</p>
          <p className="mt-2">If a step is changed, deleted or moved, its fingerprint no longer matches and the record shows which step failed.</p></TechnicalDetails>
        </Card>

        <SectionTitle>Where it is checked</SectionTitle>
        <Card>
          <p>Each record is checked again on this server every time you open Records.</p>
        </Card>

        <SectionTitle>What this does not prove</SectionTitle>
        <Card>
          <p>The platform runs this database. Its owner could replace saved steps. A check on the same server cannot rule that out. Someone who keeps a trusted signed copy published elsewhere can compare it to detect later changes; it does not stop rewriting.</p>
          <TechnicalDetails>          <p>The platform runs this database. Someone with full control of it could rewrite every step and recompute all fingerprints, and a check on the same server would still pass.</p>
          <p className="mt-2">A <strong className="text-heading">sealed copy</strong> closes that gap: a signed list of each record's latest fingerprint, published outside this server. Anyone holding it can spot a later rewrite. It makes rewriting detectable, not impossible.</p>
</TechnicalDetails>
          <p className="mt-3 rounded-[12px] bg-surface-2 p-3 text-sm font-semibold text-heading">
            {sealed ? `Latest sealed copy: ${shortDate(sealed.createdAt)}. Records are also checked against it.`
              : published.available ? `A sealed copy exists but could not be checked: ${published.result.valid ? '' : published.result.reason}`
              : 'No sealed copy has been published yet, so records are verified on this server only.'}
          </p>
        </Card>

        <SectionTitle>Check it yourself</SectionTitle>
        <Card>
          <p>Open a deal record, tap <strong className="text-heading">⋯</strong> and choose <strong className="text-heading">Download as CSV</strong> to save its steps and check values.</p><TechnicalDetails>          <p>Open a deal record, tap <strong className="text-heading">⋯</strong> and choose <strong className="text-heading">Download as CSV</strong>. The file lists every step with its fingerprint and the fingerprint of the step before it.</p></TechnicalDetails>
        </Card>
      </div>
    </RecordsShell>
  );
}
