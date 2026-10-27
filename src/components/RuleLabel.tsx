import { RULE_COPY } from './ruleCopy';

export function RuleLabel({ rule }: { rule: string }) {
  const entry = RULE_COPY.find(item => item.id === rule);
  return entry ? <span className="inline-flex flex-wrap items-center gap-2 text-sm"><span>{entry.title}</span><span className="rounded-full bg-surface-2 px-2 py-1 text-xs font-semibold text-heading">{entry.id}</span></span> : <span>No rule recorded</span>;
}
