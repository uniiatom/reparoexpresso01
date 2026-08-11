import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { loadViteEnvFromDotenv } from './load-env.mjs';

const viteEnv = loadViteEnvFromDotenv('.env');
const keys = Object.keys(viteEnv);

if (keys.length === 0) {
  console.error('❌ Nenhuma variável VITE_ encontrada em .env');
  process.exit(1);
}

const lines = keys.map((key) => `${key}=${viteEnv[key]}`);
writeFileSync('.env.netlify', `${lines.join('\n')}\n`, 'utf8');

console.log(`📦 ${keys.length} variáveis VITE_ exportadas para .env.netlify`);
console.log('   Enviando para o Netlify...\n');

const result = spawnSync(
  process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
  ['--package=netlify-cli', 'dlx', 'netlify', 'env:import', '.env.netlify'],
  { stdio: 'inherit', shell: true },
);

if (result.status !== 0) {
  console.error('\n⚠️  Não foi possível importar automaticamente.');
  console.error('   Copie do seu .env para Netlify → Site configuration → Environment variables:');
  keys.forEach((k) => console.error(`   · ${k}`));
  console.error('\n   Ou: netlify login && netlify link && pnpm netlify:env\n');
  process.exit(result.status ?? 1);
}

console.log('\n✅ Variáveis enviadas. No Netlify: Deploys → Trigger deploy → Deploy site\n');
