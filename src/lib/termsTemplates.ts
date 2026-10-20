// Ready-made checklists for common second-hand items. Each check should be something the
// buyer can prove or disprove with a photo or a short video, so the evidence summary has
// a clear criterion to test against. Kept as data so it can move to a CMS later.

export interface TermsTemplate {
  id: string;
  label: string;
  criteria: string[];
}

export const TERMS_TEMPLATES: TermsTemplate[] = [
  { id: 'phone', label: 'Phone', criteria: [
    'Screen has no cracks', 'IMEI matches the listing photo', 'Battery health at least the stated percentage',
    'Not locked to an account or carrier', 'Charger and cable included if listed',
  ] },
  { id: 'laptop', label: 'Laptop', criteria: [
    'Powers on and reaches the desktop', 'Serial number matches the listing photo', 'Screen has no dead pixels or cracks',
    'Keyboard and trackpad work', 'Charger included',
  ] },
  { id: 'camera', label: 'Camera', criteria: [
    'Shutter fires at all speeds', 'Shutter count at or below the stated number', 'No fungus or haze in the lens',
    'Serial number matches the listing photo', 'Battery and charger included if listed',
  ] },
  { id: 'audio', label: 'Headphones or speaker', criteria: [
    'Both sides or all drivers play sound', 'Pairs over Bluetooth', 'Charging case or cable included if listed',
    'No physical damage beyond the listing photos',
  ] },
  { id: 'console', label: 'Game console', criteria: [
    'Powers on and loads a game', 'Serial number matches the listing photo', 'Controller included and connects',
    'Not banned from online services',
  ] },
];

/** Add the template's checks that are not already listed, keeping the seller's own lines first. */
export function mergeCriteria(current: string, template: TermsTemplate): string {
  const lines = current.split('\n').map((l) => l.trim()).filter(Boolean);
  const seen = new Set(lines.map((l) => l.toLowerCase()));
  for (const c of template.criteria) if (!seen.has(c.toLowerCase())) lines.push(c);
  return lines.join('\n');
}
