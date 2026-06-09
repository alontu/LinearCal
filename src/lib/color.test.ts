import { describe, it, expect } from 'vitest';
import { getContrastColor } from './color';

describe('getContrastColor', () => {
    it('returns white text on dark backgrounds', () => {
        expect(getContrastColor('#000000')).toBe('#ffffff');
        expect(getContrastColor('#1a73e8')).toBe('#ffffff');
        expect(getContrastColor('#3d7eff')).toBe('#ffffff');
    });

    it('returns black text on light backgrounds', () => {
        expect(getContrastColor('#ffffff')).toBe('#000000');
        expect(getContrastColor('#FFB74D')).toBe('#000000'); // holiday orange
        expect(getContrastColor('#ffff00')).toBe('#000000');
    });

    it('expands shorthand hex', () => {
        expect(getContrastColor('#000')).toBe('#ffffff');
        expect(getContrastColor('#fff')).toBe('#000000');
    });

    it('falls back to white for CSS vars / invalid input', () => {
        expect(getContrastColor('var(--event-bar-bg, #3d7eff)')).toBe('#ffffff');
        expect(getContrastColor('')).toBe('#ffffff');
        expect(getContrastColor('not-a-color')).toBe('#ffffff');
    });
});
