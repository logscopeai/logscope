import { describe, expect, it } from 'vitest';
import { mapWinstonLevel } from './map-winston-level';

describe('mapWinstonLevel', () => {
  it('maps standard npm winston levels', () => {
    expect(mapWinstonLevel('error')).toBe('error');
    expect(mapWinstonLevel('warn')).toBe('warn');
    expect(mapWinstonLevel('info')).toBe('info');
    expect(mapWinstonLevel('http')).toBe('info');
    expect(mapWinstonLevel('verbose')).toBe('debug');
    expect(mapWinstonLevel('debug')).toBe('debug');
    expect(mapWinstonLevel('silly')).toBe('trace');
  });

  it('maps string levels case-insensitively', () => {
    expect(mapWinstonLevel('ERROR')).toBe('error');
    expect(mapWinstonLevel(' Warn ')).toBe('warn');
    expect(mapWinstonLevel('DEBUG')).toBe('debug');
    expect(mapWinstonLevel('SILLY')).toBe('trace');
  });

  it('returns undefined for unsupported values', () => {
    expect(mapWinstonLevel('notice')).toBeUndefined();
    expect(mapWinstonLevel(30)).toBeUndefined();
    expect(mapWinstonLevel({})).toBeUndefined();
    expect(mapWinstonLevel(null)).toBeUndefined();
    expect(mapWinstonLevel(undefined)).toBeUndefined();
  });
});
