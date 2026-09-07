import { describe, it, expect } from 'vitest';
import { parseColor, createSolidPaint, figmaRgbToHex } from '../plugin/src/engine/colors.js';

describe('Color Engine', () => {
  it('parses standard 6-digit hex colors correctly', () => {
    const white = parseColor('#ffffff');
    expect(white).toEqual({ r: 1, g: 1, b: 1, a: 1 });

    const black = parseColor('#000000');
    expect(black).toEqual({ r: 0, g: 0, b: 0, a: 1 });

    const blue = parseColor('#3b82f6');
    expect(blue?.r).toBeCloseTo(0.231, 2);
    expect(blue?.g).toBeCloseTo(0.51, 2);
    expect(blue?.b).toBeCloseTo(0.964, 2);
    expect(blue?.a).toBe(1);
  });

  it('parses 3-digit hex shortcuts', () => {
    const red = parseColor('#f00');
    expect(red).toEqual({ r: 1, g: 0, b: 0, a: 1 });

    const gray = parseColor('#888');
    expect(gray?.r).toBeCloseTo(0.533, 2);
  });

  it('parses 8-digit hex with alpha', () => {
    const semiTrans = parseColor('#ffffff80');
    expect(semiTrans?.r).toBe(1);
    expect(semiTrans?.g).toBe(1);
    expect(semiTrans?.b).toBe(1);
    expect(semiTrans?.a).toBeCloseTo(0.5, 2);
  });

  it('parses rgba and rgb strings', () => {
    const rgba = parseColor('rgba(255, 0, 0, 0.5)');
    expect(rgba).toEqual({ r: 1, g: 0, b: 0, a: 0.5 });

    const rgb = parseColor('rgb(0, 255, 0)');
    expect(rgb).toEqual({ r: 0, g: 1, b: 0, a: 1 });
  });

  it('parses named css colors', () => {
    expect(parseColor('white')).toEqual({ r: 1, g: 1, b: 1, a: 1 });
    expect(parseColor('black')).toEqual({ r: 0, g: 0, b: 0, a: 1 });
  });

  it('returns null on invalid color strings', () => {
    expect(parseColor('')).toBeNull();
    expect(parseColor('not-a-color-xyz')).toBeNull();
  });

  it('creates Figma SolidPaint objects with explicit opacity override', () => {
    const paint = createSolidPaint('#ff0000', 0.8);
    expect(paint).toHaveLength(1);
    expect(paint[0]).toEqual({
      type: 'SOLID',
      color: { r: 1, g: 0, b: 0 },
      opacity: 0.8
    });
  });

  it('converts Figma normalized RGB back to hex string', () => {
    expect(figmaRgbToHex({ r: 1, g: 1, b: 1 })).toBe('#FFFFFF');
    expect(figmaRgbToHex({ r: 0, g: 0, b: 0 })).toBe('#000000');
    expect(figmaRgbToHex({ r: 1, g: 0, b: 0 })).toBe('#FF0000');
  });
});
