import { describe, it, expect } from 'vitest';
import { normalizeFontStyle } from '../plugin/src/engine/fonts.js';

describe('Font Engine', () => {
  it('normalizes common font weights and aliases', () => {
    expect(normalizeFontStyle('bold')).toBe('Bold');
    expect(normalizeFontStyle('700')).toBe('Bold');
    expect(normalizeFontStyle('semibold')).toBe('Semi Bold');
    expect(normalizeFontStyle('600')).toBe('Semi Bold');
    expect(normalizeFontStyle('medium')).toBe('Medium');
    expect(normalizeFontStyle('500')).toBe('Medium');
    expect(normalizeFontStyle('regular')).toBe('Regular');
    expect(normalizeFontStyle('400')).toBe('Regular');
    expect(normalizeFontStyle('light')).toBe('Light');
    expect(normalizeFontStyle('300')).toBe('Light');
    expect(normalizeFontStyle('thin')).toBe('Thin');
    expect(normalizeFontStyle('100')).toBe('Thin');
    expect(normalizeFontStyle('black')).toBe('Black');
    expect(normalizeFontStyle('900')).toBe('Black');
  });

  it('defaults undefined or empty weight to Regular', () => {
    expect(normalizeFontStyle(undefined)).toBe('Regular');
    expect(normalizeFontStyle('')).toBe('Regular');
  });

  it('preserves custom style strings', () => {
    expect(normalizeFontStyle('Italic')).toBe('Italic');
    expect(normalizeFontStyle('Bold Italic')).toBe('Bold Italic');
  });
});
