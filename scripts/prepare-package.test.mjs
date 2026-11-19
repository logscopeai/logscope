import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { test } from 'node:test';
import { prepare } from '@semantic-release/npm';

test('the actual npm plugin stamps a disposable package without changing its contract', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'logscope-prepare-'));
  const source = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const lock = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url), 'utf8'));
  try {
    await writeFile(path.join(cwd, 'package.json'), JSON.stringify(source));
    await writeFile(path.join(cwd, 'package-lock.json'), JSON.stringify(lock));
    const output = new PassThrough();
    output.resume();
    await prepare(
      { npmPublish: false, pkgRoot: '.' },
      {
        cwd,
        env: { ...process.env, HUSKY: '0' },
        stdout: output,
        stderr: output,
        logger: { log() {} },
        nextRelease: { version: '1.1.0' },
        options: {},
      },
    );
    const prepared = JSON.parse(await readFile(path.join(cwd, 'package.json'), 'utf8'));
    const preparedLock = JSON.parse(await readFile(path.join(cwd, 'package-lock.json'), 'utf8'));
    assert.equal(prepared.version, '1.1.0');
    assert.equal(preparedLock.version, '1.1.0');
    assert.equal(preparedLock.packages[''].version, '1.1.0');
    for (const field of ['name', 'exports', 'types', 'engines', 'dependencies']) {
      assert.deepEqual(prepared[field], source[field]);
    }
    assert.equal(source.version, '0.0.0-development');
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
