// Usage: npm run labels:apply -- path/to/label-review.json
// Updates eval/cases/*.json in place, then run `npm run eval` to refresh the report.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { applyLabelReview, type ReviewEntry } from '../eval/labelReview.ts';
import { validateCases, type EvaluationCase } from '../eval/harness.ts';

const file = process.argv[2];
if (!file) throw new Error('Pass the review JSON file: npm run labels:apply -- review.json');
const review = JSON.parse(await readFile(file, 'utf8')) as Record<string, ReviewEntry>;
const dir = new URL('../eval/cases/', import.meta.url);
let changed = 0; let agreed = 0; const unknown = new Set(Object.keys(review));
for (const name of (await readdir(dir)).filter((n) => n.endsWith('.json')).sort()) {
  const cases = JSON.parse(await readFile(new URL(name, dir), 'utf8')) as EvaluationCase[];
  const out = applyLabelReview(cases, review);
  validateCases(out.cases);
  for (const c of cases) unknown.delete(c.id);
  changed += out.changed.length; agreed += out.agreed.length;
  await writeFile(new URL(name, dir), `${JSON.stringify(out.cases, null, 2)}\n`);
}
process.stdout.write(`Label review applied: ${agreed} agreed, ${changed} changed.${unknown.size ? ` Unknown ids ignored: ${[...unknown].join(', ')}.` : ''} Run npm run eval next.\n`);
