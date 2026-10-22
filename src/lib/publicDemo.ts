// Public demo lock (docs/SECURITY-REVIEW.md "Public demo"). When PUBLIC_DEMO=1 the server only
// runs the labelled simulation with recorded AI replays, and refuses to start if any secret is
// present, so a hosted demo can never reach real PayPal, a live model or a signing key.

const FORBIDDEN_SECRETS = ['PP_ID', 'PP_SECRET', 'AI_API_KEY', 'AUDIT_SIGNING_KEY'] as const;

export function isPublicDemo(env: Record<string, string | undefined> = process.env): boolean {
  return env.PUBLIC_DEMO?.trim() === '1';
}

/** Returns what is wrong with the environment for a public demo (empty when safe). */
export function publicDemoProblems(env: Record<string, string | undefined> = process.env): string[] {
  if (!isPublicDemo(env)) return [];
  const problems: string[] = [];
  if (env.PAYPAL_MODE?.trim().toLowerCase() !== 'simulated') problems.push('PAYPAL_MODE must be "simulated"');
  if (env.AI_MODE?.trim().toLowerCase() !== 'replay') problems.push('AI_MODE must be "replay"');
  for (const name of FORBIDDEN_SECRETS) if (env[name]?.trim()) problems.push(`${name} must not be set`);
  return problems;
}
