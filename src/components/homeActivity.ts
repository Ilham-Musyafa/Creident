import type { StoredTx } from '../lib/repository';
import type { AuditEvent } from '../lib/audit/chain';
import { activityFeed, type ActivityItem, type Role } from './view';
import { displayItemName } from './displayItemName';

export interface HomeActivityItem extends ActivityItem { dealId: string; item: string }

/** Party IDs match Home's existing role-relevant deals. Reviewers can read every deal page. */
export function recentHomeActivity(
  deals: readonly Pick<StoredTx, 'id' | 'item' | 'buyerId' | 'sellerId'>[],
  role: Role,
  readEvents: (id: string) => readonly AuditEvent[],
): HomeActivityItem[] {
  return deals
    .filter(deal => role === 'reviewer' || (role === 'buyer' ? deal.buyerId === role : deal.sellerId === role))
    .flatMap(deal => {
      const events = readEvents(deal.id);
      return activityFeed([...events], events.length).map(event => ({ ...event, dealId: deal.id, item: displayItemName(deal.item) }));
    })
    .sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts) || a.dealId.localeCompare(b.dealId) || b.seq - a.seq)
    .slice(0, 5);
}
