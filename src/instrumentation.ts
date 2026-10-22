// Runs once when the server starts (Node.js runtime only). See src/lib/publicDemoStartup.ts.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') await (await import('./lib/publicDemoStartup')).startPublicDemo();
}
