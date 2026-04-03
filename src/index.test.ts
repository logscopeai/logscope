import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as rootExports from './index';
import { Logscope, normalizeLog, type LogscopeClient, type LogscopeInitConfig } from './index';
import { describe, expect, it } from 'vitest';

describe('root sdk entrypoint', () => {
  it('imports and creates the root sdk client', () => {
    const config: LogscopeInitConfig = {
      apiKey: 'api-key',
    };
    const client: LogscopeClient = new Logscope(config);

    expect(client).toHaveProperty('trace');
    expect(client).toHaveProperty('debug');
    expect(client).toHaveProperty('info');
    expect(client).toHaveProperty('warn');
    expect(client).toHaveProperty('error');
    expect(client).toHaveProperty('fatal');

    expect(() => {
      client.trace('trace');
      client.debug('debug');
      client.info('info');
      client.warn('warn');
      client.error('error');
      client.fatal('fatal');
    }).not.toThrow();
  });

  it('does not expose the deprecated root factory from the package entrypoint', () => {
    expect(rootExports).not.toHaveProperty('createLogscopeClient');
  });

  it('exports the normalizeLog utility from the root entrypoint', () => {
    const normalizedLog = normalizeLog({
      source: 'unit-test',
      level: 'info',
      message: 'test message',
    });

    expect(normalizedLog.source).toBe('unit-test');
    expect(normalizedLog.level).toBe('info');
    expect(normalizedLog.message).toBe('test message');
  });

  it('exports the Logscope class from the root entrypoint', () => {
    const client = new Logscope({
      apiKey: '',
    });

    expect(client).toHaveProperty('trace');
    expect(client).toHaveProperty('debug');
    expect(client).toHaveProperty('info');
    expect(client).toHaveProperty('warn');
    expect(client).toHaveProperty('error');
    expect(client).toHaveProperty('fatal');

    expect(() => client.info('safe message')).not.toThrow();
  });

  it('publishes the package under the scoped package name with the logger transport subpath exports', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(__dirname, '..', 'package.json'), 'utf8'),
    ) as {
      name: string;
      exports: Record<string, unknown>;
    };

    expect(packageJson.name).toBe('@logscopeai/logscope');
    expect(packageJson.exports).toHaveProperty('./pino');
    expect(packageJson.exports).toHaveProperty('./winston');
  });
});
