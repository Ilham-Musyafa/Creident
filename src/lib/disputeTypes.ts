// Why the buyer opened a dispute, and what evidence usually settles that kind of case.
// The type is recorded in the audit log and guides both parties; it does not change the
// rules R1-R7 or the recommendation.

export type DisputeTypeId = 'not_received' | 'not_as_described' | 'damaged' | 'incomplete';

export interface DisputeType {
  id: DisputeTypeId;
  label: string;
  buyer: string[];
  seller: string[];
}

export const DISPUTE_TYPES: DisputeType[] = [
  { id: 'not_received', label: 'Item not received',
    buyer: ['Screenshot of the courier page for this tracking number', 'Note of when you last checked with the courier'],
    seller: ['Courier receipt with the tracking number and date', 'Packing photo with the one-time code'] },
  { id: 'not_as_described', label: 'Not as described',
    buyer: ['Unboxing video from the sealed parcel, code visible', 'Photo of each locked check that fails, such as the serial or model'],
    seller: ['Listing photos that match the locked terms', 'Packing photo or video with the code and serial visible'] },
  { id: 'damaged', label: 'Arrived damaged',
    buyer: ['Photo of the outer parcel before opening', 'First-opening video showing the damage, code visible'],
    seller: ['Packing photos showing protection for fragile parts', 'Photo of the item working before handover to the courier'] },
  { id: 'incomplete', label: 'Parts or accessories missing',
    buyer: ['Unboxing video showing everything in the parcel', 'The locked term that lists the missing part'],
    seller: ['Packing photo with every listed part laid out', 'Courier receipt with the parcel weight, if shown'] },
];

export function isDisputeType(value: unknown): value is DisputeTypeId {
  return typeof value === 'string' && DISPUTE_TYPES.some((t) => t.id === value);
}

export function disputeType(id: unknown): DisputeType | undefined {
  return DISPUTE_TYPES.find((t) => t.id === id);
}
