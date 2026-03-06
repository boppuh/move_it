import { describe, it, expect, vi } from 'vitest';

// Mock openai before importing normalize to avoid module-level key check
vi.mock('@/lib/openai', () => ({ openai: {} }));

import { parseDimensions } from '../normalize';

describe('parseDimensions', () => {
  it('parses H x W x D with inch marks', () => {
    const result = parseDimensions('39.4"H x 82.3"W x 87.4"D');
    expect(result).toEqual({ height: 39.4, width: 82.3, depth: 87.4, unit: 'in' });
  });

  it('parses H x W without depth', () => {
    const result = parseDimensions('45"H x 63"W');
    expect(result).not.toBeNull();
    expect(result?.height).toBe(45);
    expect(result?.width).toBe(63);
    expect(result?.depth).toBeUndefined();
    expect(result?.unit).toBe('in');
  });

  it('parses W x H x D format', () => {
    const result = parseDimensions('82.3"W x 39.4"H x 87.4"D');
    expect(result).not.toBeNull();
    expect(result?.width).toBe(82.3);
    expect(result?.height).toBe(39.4);
    expect(result?.depth).toBe(87.4);
  });

  it('parses centimeter label format', () => {
    const result = parseDimensions('Height: 100cm, Width: 209cm, Depth: 90cm');
    expect(result).toEqual({ height: 100, width: 209, depth: 90, unit: 'cm' });
  });

  it('parses Height/Width only in cm', () => {
    const result = parseDimensions('Height: 80cm Width: 180cm');
    expect(result).not.toBeNull();
    expect(result?.height).toBe(80);
    expect(result?.width).toBe(180);
    expect(result?.unit).toBe('cm');
  });

  it('parses shorthand label format', () => {
    const result = parseDimensions('H: 45 W: 63 D: 87');
    expect(result).not.toBeNull();
    expect(result?.height).toBe(45);
    expect(result?.width).toBe(63);
    expect(result?.depth).toBe(87);
  });

  it('parses WxHxD format', () => {
    const result = parseDimensions('W39 x H82 x D87');
    expect(result).not.toBeNull();
    expect(result?.width).toBe(39);
    expect(result?.height).toBe(82);
    expect(result?.depth).toBe(87);
  });

  it('returns null for empty string', () => {
    expect(parseDimensions('')).toBeNull();
  });

  it('returns null for unparseable string', () => {
    expect(parseDimensions('large size fits most spaces')).toBeNull();
  });

  it('detects cm unit from text', () => {
    const result = parseDimensions('Width: 200cm Height: 90cm');
    expect(result?.unit).toBe('cm');
  });

  it('defaults to in unit when no unit specified', () => {
    const result = parseDimensions('45"H x 63"W');
    expect(result?.unit).toBe('in');
  });
});
