import { describe, expect, it } from 'vitest';
import { mapPinoLevel } from './map-pino-level';

describe('mapPinoLevel', () => {
  it('maps standard pino numeric levels', () => {
    expect(mapPinoLevel(10)).toBe('trace');
    expect(mapPinoLevel(20)).toBe('debug');
    expect(mapPinoLevel(30)).toBe('info');
    expect(mapPinoLevel(40)).toBe('warn');
    expect(mapPinoLevel(50)).toBe('error');
    expect(mapPinoLevel(60)).toBe('fatal');
  });

  it('maps supported string levels', () => {
    expect(mapPinoLevel('trace')).toBe('trace');
    expect(mapPinoLevel('DEBUG')).toBe('debug');
    expect(mapPinoLevel('info')).toBe('info');
    expect(mapPinoLevel('warning')).toBe('warn');
    expect(mapPinoLevel('error')).toBe('error');
    expect(mapPinoLevel('fatal')).toBe('fatal');
  });

  it('maps numeric levels encoded as strings', () => {
    expect(mapPinoLevel('10')).toBe('trace');
    expect(mapPinoLevel('20')).toBe('debug');
    expect(mapPinoLevel('30')).toBe('info');
    expect(mapPinoLevel('40')).toBe('warn');
    expect(mapPinoLevel('50')).toBe('error');
    expect(mapPinoLevel('60')).toBe('fatal');
  });

  it('returns undefined for unsupported values', () => {
    expect(mapPinoLevel(5)).toBeUndefined();
    expect(mapPinoLevel('notice')).toBeUndefined();
    expect(mapPinoLevel({})).toBeUndefined();
    expect(mapPinoLevel(null)).toBeUndefined();
    expect(mapPinoLevel(undefined)).toBeUndefined();
  });
});
