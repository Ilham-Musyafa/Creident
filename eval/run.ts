import { readFile, readdir, writeFile } from 'node:fs/promises';
import { evaluateCases, renderReport, validateCases, type EvaluationCase } from './harness.ts';
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
const k = Number(process.env.EVAL_K ?? '3');
const results = await evaluateCases(cases, recorded, { mode, k });
const report = renderReport(results, mode, k);
await writeFile(new URL('./report.md', import.meta.url), report);
process.stdout.write(`Evaluated ${cases.length} synthetic cases in ${mode} mode. Report: eval/report.md\n`);
