import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = await mkdtemp(path.join(tmpdir(), 'logscope-consumer-'));
const run = (command, args, cwd = temporary) =>
  execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

try {
  const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const [packed] = JSON.parse(
    run('npm', ['pack', '--json', '--pack-destination', temporary], root),
  );
  const archive = path.join(temporary, packed.filename);
  const expected = new Set(['package.json', 'README.md', 'LICENSE']);
  for (const entry of await readdir(path.join(root, 'src'), { recursive: true })) {
    if (!entry.endsWith('.ts') || /\.(test|spec)\.ts$/u.test(entry)) continue;
    const stem = `dist/${entry.slice(0, -3).split(path.sep).join('/')}`;
    for (const extension of ['.js', '.d.ts', '.js.map']) expected.add(stem + extension);
  }
  assert.deepEqual(
    packed.files.map(({ path: file }) => file).sort(),
    [...expected].sort(),
    'The tarball must contain exactly the compiled SDK, declarations, manifest, README and LICENSE.',
  );

  await writeFile(
    path.join(temporary, 'package.json'),
    JSON.stringify({ name: 'external-sdk-consumer', private: true, type: 'module' }),
  );
  run('npm', [
    'install',
    '--omit=dev',
    '--ignore-scripts',
    '--package-lock=false',
    '--no-audit',
    '--no-fund',
    archive,
  ]);
  const installed = path.join(temporary, 'node_modules/@logscopeai/logscope');
  const published = JSON.parse(await readFile(path.join(installed, 'package.json'), 'utf8'));
  for (const field of ['name', 'version', 'exports', 'types', 'dependencies', 'engines']) {
    assert.deepEqual(
      published[field],
      manifest[field],
      `Packed ${field} must match the root manifest.`,
    );
  }
  assert.equal(published.name, '@logscopeai/logscope');
  assert.equal(published.engines.node, '>=20');
  for (const developmentOnly of ['semantic-release', 'vitest', 'typescript']) {
    await assert.rejects(readdir(path.join(temporary, 'node_modules', developmentOnly)));
  }
  const runtime = `
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { Logscope, normalizeLog, DEFAULT_INGESTION_URL } from '@logscopeai/logscope';
import { createPinoTransport, mapPinoLevel } from '@logscopeai/logscope/pino';
import { createWinstonTransport, mapWinstonLevel } from '@logscopeai/logscope/winston';
const require = createRequire(import.meta.url);
assert.equal(typeof Logscope, 'function');
assert.equal(DEFAULT_INGESTION_URL, 'https://ingestion.logscopeai.com');
assert.equal(normalizeLog({ source: 'consumer', level: 'info', message: ' packed ' }).message, 'packed');
assert.equal(typeof createPinoTransport, 'function');
assert.equal(typeof createWinstonTransport, 'function');
assert.equal(mapPinoLevel(30), 'info');
assert.equal(mapWinstonLevel('error'), 'error');
assert.equal(require('@logscopeai/logscope').Logscope, Logscope);
assert.equal(require('@logscopeai/logscope/pino').createPinoTransport, createPinoTransport);
assert.equal(require('@logscopeai/logscope/winston').createWinstonTransport, createWinstonTransport);
assert.equal(require('@logscopeai/logscope/package.json').version, ${JSON.stringify(manifest.version)});
`;
  await writeFile(path.join(temporary, 'consumer.mjs'), runtime);
  run(process.execPath, ['consumer.mjs']);

  // The consumer supplies Node types; the compiler is a tool, never a linked SDK dependency.
  run('npm', [
    'install',
    '--no-save',
    '--ignore-scripts',
    '--package-lock=false',
    '--no-audit',
    '--no-fund',
    '@types/node@20.19.0',
  ]);
  await writeFile(
    path.join(temporary, 'consumer.mts'),
    `
import { Logscope, normalizeLog, type LogscopeInitConfig, type IngestionLogEntry } from '@logscopeai/logscope';
import { createPinoTransport, type LogscopePinoTransportOptions } from '@logscopeai/logscope/pino';
import { createWinstonTransport, type LogscopeWinstonTransportOptions } from '@logscopeai/logscope/winston';
import manifest from '@logscopeai/logscope/package.json' with { type: 'json' };
const config: LogscopeInitConfig = { apiKey: 'unused', ingestionBaseUrl: 'http://localhost:3001' };
const client: Logscope = new Logscope(config);
const entry: IngestionLogEntry = normalizeLog({ source: 'consumer', level: 'info', message: 'hello' });
const pino: LogscopePinoTransportOptions = { apiKey: 'unused', source: 'consumer' };
const winston: LogscopeWinstonTransportOptions = pino;
const pinoFactory: typeof createPinoTransport = createPinoTransport;
const winstonFactory: typeof createWinstonTransport = createWinstonTransport;
void [client, entry, pinoFactory, winstonFactory, winston, manifest.name];
`,
  );
  await writeFile(
    path.join(temporary, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        noEmit: true,
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        resolveJsonModule: true,
        types: ['node'],
      },
      files: ['consumer.mts'],
    }),
  );
  run(process.execPath, [path.join(root, 'node_modules/typescript/bin/tsc'), '-p', temporary]);
  console.log(
    `Packed SDK ${published.version}: ${packed.files.length} files; runtime and declarations pass on ${process.version}.`,
  );
} catch (error) {
  if (error.stdout) console.error(error.stdout.toString());
  if (error.stderr) console.error(error.stderr.toString());
  throw error;
} finally {
  await rm(temporary, { recursive: true, force: true });
}
