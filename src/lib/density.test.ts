import { describe, it, expect } from 'vitest';
import {
    DENSITY_PRESETS,
    DEFAULT_DENSITY,
    DENSITY_BOUNDS,
    clampDensity,
    densityToCssVars,
    matchPreset,
    parseDensity,
} from './density';

describe('density presets', () => {
    it('comfortable is the default and reproduces the current grid values', () => {
        expect(DEFAULT_DENSITY).toBe(DENSITY_PRESETS.comfortable);
        expect(DENSITY_PRESETS.comfortable).toEqual({
            cellMinH: 80, barH: 18, barFont: 11, dayNumFont: 14, colMinW: 40,
        });
    });

    it('compact is smaller and spacious is larger across the board', () => {
        const { compact, comfortable, spacious } = DENSITY_PRESETS;
        for (const k of ['cellMinH', 'barH', 'barFont', 'dayNumFont', 'colMinW'] as const) {
            expect(compact[k]).toBeLessThan(comfortable[k]);
            expect(spacious[k]).toBeGreaterThan(comfortable[k]);
        }
    });

    it('every preset is within bounds (comfort floor respected)', () => {
        for (const s of Object.values(DENSITY_PRESETS)) {
            expect(s.cellMinH).toBeGreaterThanOrEqual(DENSITY_BOUNDS.cellMinH.min);
            expect(s.barH).toBeGreaterThanOrEqual(DENSITY_BOUNDS.barH.min);
        }
    });
});

describe('clampDensity', () => {
    it('enforces the comfort floor (no aggressive compression)', () => {
        const c = clampDensity({ cellMinH: 10, barH: 4, barFont: 2, dayNumFont: 2, colMinW: 5 });
        expect(c.cellMinH).toBe(DENSITY_BOUNDS.cellMinH.min); // 48
        expect(c.barH).toBe(DENSITY_BOUNDS.barH.min);
    });
    it('enforces the ceiling and rounds', () => {
        const c = clampDensity({ cellMinH: 999, barH: 999, barFont: 18.6, dayNumFont: 999, colMinW: 999 });
        expect(c.cellMinH).toBe(DENSITY_BOUNDS.cellMinH.max);
        expect(c.barFont).toBe(15); // clamped to max, rounded
    });
});

describe('densityToCssVars', () => {
    it('maps each setting to its CSS custom property in px', () => {
        expect(densityToCssVars(DENSITY_PRESETS.comfortable)).toEqual({
            '--cell-min-h': '80px',
            '--bar-h': '18px',
            '--bar-font': '11px',
            '--day-num-font': '14px',
            '--col-min-w': '40px',
        });
    });
});

describe('matchPreset', () => {
    it('identifies an exact preset', () => {
        expect(matchPreset(DENSITY_PRESETS.compact)).toBe('compact');
        expect(matchPreset(DENSITY_PRESETS.spacious)).toBe('spacious');
    });
    it('returns custom for a tweaked setting', () => {
        expect(matchPreset({ ...DENSITY_PRESETS.comfortable, barH: 20 })).toBe('custom');
    });
});

describe('parseDensity', () => {
    it('returns null for empty/invalid input', () => {
        expect(parseDensity(null)).toBeNull();
        expect(parseDensity('not json')).toBeNull();
        expect(parseDensity('123')).toBeNull();
    });
    it('merges partial saved settings over defaults and clamps', () => {
        const s = parseDensity(JSON.stringify({ cellMinH: 60 }));
        expect(s).not.toBeNull();
        expect(s!.cellMinH).toBe(60);
        expect(s!.barH).toBe(DEFAULT_DENSITY.barH); // filled from default
    });
    it('clamps out-of-range persisted values', () => {
        const s = parseDensity(JSON.stringify({ cellMinH: 5 }));
        expect(s!.cellMinH).toBe(DENSITY_BOUNDS.cellMinH.min);
    });
});
