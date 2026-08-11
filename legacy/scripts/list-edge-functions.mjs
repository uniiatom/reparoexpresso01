/**
 * Lê funções em supabase/functions e imprime lista para deploy manual.
 * Deploy real: use Supabase MCP ou `supabase functions deploy <nome>`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const functionsDir = path.join(root, 'supabase', 'functions');

const NO_JWT = new Set(['stripeWebhook', 'health']);

const sharedFiles = ['_shared/cors.ts', '_shared/supabase.ts'].map((rel) => ({
  name: rel,
  content: fs.readFileSync(path.join(functionsDir, rel), 'utf8'),
}));

const entries = fs.readdirSync(functionsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
  .map((d) => d.name);

console.log('Edge Functions prontas para deploy:\n');
for (const name of entries.sort()) {
  const indexPath = path.join(functionsDir, name, 'index.ts');
  if (!fs.existsSync(indexPath)) continue;
  const jwt = NO_JWT.has(name) ? 'verify_jwt=false' : 'verify_jwt=true';
  console.log(`  - ${name} (${jwt})`);
}

console.log(`\nTotal: ${entries.length} funções`);
console.log('\nShared modules:', sharedFiles.map((f) => f.name).join(', '));
console.log('\nConfigure secrets — ver docs/edge-functions-secrets.md');
