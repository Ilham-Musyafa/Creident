// Browser-safe draft fields and their projection into the existing description field.
export interface TermsDraft { item: string; condition: string; includedItems: string[]; criteria: string[] }
export function descriptionForDraft(_draft: TermsDraft): string {
  return 'See the condition, included items and photo checks.';
}
