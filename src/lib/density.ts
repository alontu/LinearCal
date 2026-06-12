/**
 * Display-density settings: user-controllable sizing for the linear calendar
 * (row height, event bar height/font, day-number font, column width).
 *
 * The values are pushed to the DOM as CSS custom properties; the stylesheet
 * reads them with `var(--x, <current default>)`, so when nothing is set the grid
 * looks exactly as before. The "comfortable" preset reproduces those defaults.
 */

export interface DensitySettings {
    /** Day-cell minimum height (px). Controls how compact sparse rows get. */
    cellMinH: number;
    /** Multi-day event bar height (px). Controls how tall busy rows get. */
    barH: number;
    /** Event label font size (px) — the upper bound of the responsive clamp. */
    barFont: number;
    /** Day-number font size (px). */
    dayNumFont: number;
    /** Grid column minimum width (px) — horizontal density. */
    colMinW: number;
}

export type DensityPresetName = 'compact' | 'comfortable' | 'spacious';

export const DENSITY_PRESETS: Record<DensityPresetName, DensitySettings> = {
    compact: { cellMinH: 48, barH: 14, barFont: 9, dayNumFont: 12, colMinW: 34 },
    comfortable: { cellMinH: 80, barH: 18, barFont: 11, dayNumFont: 14, colMinW: 40 },
    spacious: { cellMinH: 112, barH: 22, barFont: 13, dayNumFont: 16, colMinW: 50 },
};

export const DEFAULT_DENSITY: DensitySettings = DENSITY_PRESETS.comfortable;

/** Allowed ranges. The lower bounds keep a comfortable floor (no extreme squeeze). */
export const DENSITY_BOUNDS: Record<keyof DensitySettings, { min: number; max: number }> = {
    cellMinH: { min: 48, max: 140 },
    barH: { min: 14, max: 26 },
    barFont: { min: 9, max: 15 },
    dayNumFont: { min: 11, max: 18 },
    colMinW: { min: 34, max: 60 },
};

function clampNum(v: number, min: number, max: number): number {
    if (!Number.isFinite(v)) return min;
    return Math.min(max, Math.max(min, Math.round(v)));
}

export function clampDensity(s: DensitySettings): DensitySettings {
    return {
        cellMinH: clampNum(s.cellMinH, DENSITY_BOUNDS.cellMinH.min, DENSITY_BOUNDS.cellMinH.max),
        barH: clampNum(s.barH, DENSITY_BOUNDS.barH.min, DENSITY_BOUNDS.barH.max),
        barFont: clampNum(s.barFont, DENSITY_BOUNDS.barFont.min, DENSITY_BOUNDS.barFont.max),
        dayNumFont: clampNum(s.dayNumFont, DENSITY_BOUNDS.dayNumFont.min, DENSITY_BOUNDS.dayNumFont.max),
        colMinW: clampNum(s.colMinW, DENSITY_BOUNDS.colMinW.min, DENSITY_BOUNDS.colMinW.max),
    };
}

/** Map settings to the CSS custom properties the stylesheet consumes. */
export function densityToCssVars(s: DensitySettings): Record<string, string> {
    return {
        '--cell-min-h': `${s.cellMinH}px`,
        '--bar-h': `${s.barH}px`,
        '--bar-font': `${s.barFont}px`,
        '--day-num-font': `${s.dayNumFont}px`,
        '--col-min-w': `${s.colMinW}px`,
    };
}

/** Name of the preset that exactly matches `s`, or 'custom'. */
export function matchPreset(s: DensitySettings): DensityPresetName | 'custom' {
    for (const name of Object.keys(DENSITY_PRESETS) as DensityPresetName[]) {
        const p = DENSITY_PRESETS[name];
        if (
            p.cellMinH === s.cellMinH &&
            p.barH === s.barH &&
            p.barFont === s.barFont &&
            p.dayNumFont === s.dayNumFont &&
            p.colMinW === s.colMinW
        ) {
            return name;
        }
    }
    return 'custom';
}

/** Safely parse persisted settings (localStorage); returns null if unusable. */
export function parseDensity(raw: string | null): DensitySettings | null {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as Partial<DensitySettings>;
        if (typeof parsed !== 'object' || parsed === null) return null;
        return clampDensity({ ...DEFAULT_DENSITY, ...parsed });
    } catch {
        return null;
    }
}
