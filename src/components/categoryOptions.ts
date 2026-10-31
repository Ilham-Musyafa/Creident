const labels = new Intl.Collator('en', { sensitivity: 'base' });

/** Sort a copy for pickers; stored taxonomy entries and their identities stay intact. */
export function alphabeticalOptions<T extends { label: string }>(options: readonly T[]): T[] {
  return [...options].sort((a, b) => {
    const aOther = labels.compare(a.label, 'Other') === 0;
    const bOther = labels.compare(b.label, 'Other') === 0;
    return Number(aOther) - Number(bOther) || labels.compare(a.label, b.label);
  });
}
