// Display copy only. The rule engine and its order are unchanged.
export const RULE_COPY = [
  { id: 'R1', title: 'Not shipped in time', text: 'No tracking before the ship-by deadline: the payment is cancelled before charging. No money moves.' },
  { id: 'R2', title: 'Delivery and inspection complete', text: 'Delivered to the agreed address and the buyer confirmed or stayed silent through inspection: the approved payment is charged. Seller payout is not part of this demo.' },
  { id: 'R3', title: 'Tracking does not match', text: 'Tracking does not fit the order (other destination or impossible ship date): a human reviews.' },
  { id: 'R4', title: 'Evidence clearly supports one side', text: 'In a dispute, every criterion clearly supports one side with evidence: a recommendation, confirmed by a human.' },
  { id: 'R5', title: 'A reviewer needs to decide', text: 'Missing, unclear or mixed evidence, no usable AI summary, or damage / missing-parts disputes: a human decides regardless of the summary.' },
  { id: 'R6', title: 'A PayPal case puts the deal on hold', text: 'A matching PayPal case or confirmed update from PayPal puts the deal on hold. When the case is resolved, the deal returns to its previous status; check the payment outcome separately.' },
  { id: 'R7', title: 'Evidence contains instructions to the AI', text: 'Evidence looks like instructions aimed at the AI: the text is ignored for scoring and a human reviews.' },
] as const;
