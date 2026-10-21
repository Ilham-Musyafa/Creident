import { readFile, readdir, writeFile } from 'node:fs/promises';
import { evaluateCases, metrics, renderReport, validateCases, type EvaluationCase } from './harness.ts';
import type { AiSummary } from '../src/lib/rules/engine.ts';

const casesDir = new URL('./cases/', import.meta.url);
const caseFiles = (await readdir(casesDir)).filter((name) => name.endsWith('.json')).sort();
const cases: EvaluationCase[] = [];
for (const name of caseFiles) {
  const parsed: unknown = JSON.parse(await readFile(new URL(name, casesDir), 'utf8'));
  validateCases(parsed);
  cases.push(...parsed);
}
validateCases(cases);
const recorded = JSON.parse(await readFile(new URL('./recorded-summaries.json', import.meta.url), 'utf8')) as Record<string, AiSummary>;
const mode = process.env.AI_MODE || (process.env.AI_API_KEY ? 'live' : 'replay');
if (mode !== 'replay' && mode !== 'live') throw new Error('AI_MODE must be replay or live');
// An empty EVAL_K (as copied from .env.example) means the default of 3.
const k = Number(process.env.EVAL_K || '3');
const results = await evaluateCases(cases, recorded, { mode, k });
const labelsReviewed = cases.filter((c) => c.labelStatus === 'reviewed by owner').length;
const report = renderReport(results, mode, k, labelsReviewed);
await writeFile(new URL('./report.md', import.meta.url), report);
// Machine-readable copy for the in-app Fairness page (src/lib/fairness.ts describes the shape).
const labelStatus = labelsReviewed === cases.length ? 'reviewed' : 'draft';
const summary = {
  generatedAt: new Date().toISOString(), mode, k, labelStatus, labelsReviewed,
  model: mode === 'live' ? process.env.AI_MODEL || null : null,
  metrics: metrics(results),
  differing: results.filter((r) => r.actual !== r.expected).map((r) => ({ id: r.id, expected: r.expected, actual: r.actual })),
};
await writeFile(new URL('./results.json', import.meta.url), `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`Evaluated ${cases.length} synthetic cases in ${mode} mode. Report: eval/report.md and eval/results.json\n`);
