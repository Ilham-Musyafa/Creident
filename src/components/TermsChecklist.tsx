import { KeyValue } from './ui';

/** The buyer sees the editable fields that will be locked, never the pasted source. */
export function TermsChecklist({ terms }: { terms: Record<string, unknown> }) {
  const textList = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  const included = textList(terms.includedItems);
  const criteria = textList(terms.criteria);
  const items = [
    ...(typeof terms.description === 'string' ? [{ label: 'Description', value: terms.description }] : []),
    ...(included.length ? [{ label: 'Included items', value: included.join(', ') }] : []),
    ...criteria.map((value, index) => ({ label: `Check ${index + 1}`, value })),
  ];
  return items.length ? <section aria-label="Terms to accept"><KeyValue items={items}/></section> : null;
}
