// Display copy only. The rule engine and its order are unchanged.
export const RULE_COPY = [
  { id: 'R1', title: 'The seller did not ship in time', text: 'Without tracking by the shipping deadline, Creident cancels the payment. No money moves.' },
  { id: 'R2', title: 'Everything arrived fine', text: 'Payment is charged after the buyer confirms, or the check window ends without a problem. Seller payouts are not built.' },
  { id: 'R3', title: 'The tracking looks wrong', text: 'A different delivery address or an impossible shipping date needs a person to check it.' },
  { id: 'R4', title: 'The proof clearly supports one side', text: 'When proof clearly supports one side on every agreed check, Creident suggests an outcome. A person confirms the decision.' },
  { id: 'R5', title: 'A person needs to decide', text: 'A person decides when proof is missing or unclear, or the AI answer is unavailable. Damage and missing-parts problems always need a person.' },
  { id: 'R6', title: 'PayPal opened a case', text: 'A matching PayPal case or confirmed payment update pauses the deal. Afterwards, its earlier status returns; check PayPal separately for payment results.' },
  { id: 'R7', title: 'The proof contains instructions for the AI', text: 'Creident ignores instructions inside the proof when scoring it. A person checks the problem instead.' },
] as const;
