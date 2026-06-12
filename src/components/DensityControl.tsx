'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './DensityControl.module.css';
import {
    DensitySettings,
    DensityPresetName,
    DENSITY_PRESETS,
    DEFAULT_DENSITY,
    DENSITY_BOUNDS,
    densityToCssVars,
    matchPreset,
    parseDensity,
    clampDensity,
} from '@/lib/density';

const STORAGE_KEY = 'densitySettings';

const PRESET_LABELS: Record<DensityPresetName, string> = {
    compact: 'דחוס',
    comfortable: 'רגיל',
    spacious: 'מרווח',
};

function applyVars(s: DensitySettings) {
    const vars = densityToCssVars(s);
    for (const [k, v] of Object.entries(vars)) {
        document.documentElement.style.setProperty(k, v);
    }
}

interface SliderRowProps {
    label: string;
    value: number;
    bounds: { min: number; max: number };
    onChange: (v: number) => void;
}

function SliderRow({ label, value, bounds, onChange }: SliderRowProps) {
    return (
        <label className={styles.sliderRow}>
            <span className={styles.sliderLabel}>{label}</span>
            <input
                type="range"
                min={bounds.min}
                max={bounds.max}
                value={value}
                onChange={e => onChange(Number(e.target.value))}
                className={styles.range}
            />
            <span className={styles.sliderValue}>{value}px</span>
        </label>
    );
}

export default function DensityControl() {
    const [settings, setSettings] = useState<DensitySettings>(DEFAULT_DENSITY);
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Load persisted settings on mount and apply them.
    useEffect(() => {
        const saved = parseDensity(localStorage.getItem(STORAGE_KEY));
        if (saved) {
            setSettings(saved);
            applyVars(saved);
        }
    }, []);

    // Close the popover on outside click.
    useEffect(() => {
        const onDown = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    const update = (next: DensitySettings) => {
        const clamped = clampDensity(next);
        setSettings(clamped);
        applyVars(clamped);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(clamped));
        } catch {
            /* ignore quota / private-mode errors */
        }
    };

    const active = matchPreset(settings);

    return (
        <div className={styles.container} ref={containerRef}>
            <button
                type="button"
                className={styles.trigger}
                onClick={() => setOpen(o => !o)}
                title="גודל וצפיפות התצוגה"
                aria-haspopup="dialog"
                aria-expanded={open}
            >
                <span aria-hidden="true">↕</span> גודל
            </button>

            {open && (
                <div className={styles.popover} dir="rtl" role="dialog" aria-label="גודל וצפיפות">
                    <div className={styles.heading}>גודל וצפיפות</div>

                    <div className={styles.presets}>
                        {(Object.keys(DENSITY_PRESETS) as DensityPresetName[]).map(name => (
                            <button
                                key={name}
                                type="button"
                                className={`${styles.preset} ${active === name ? styles.presetActive : ''}`}
                                onClick={() => update(DENSITY_PRESETS[name])}
                            >
                                {PRESET_LABELS[name]}
                            </button>
                        ))}
                    </div>

                    <div className={styles.advanced}>
                        <SliderRow label="גובה שורה" value={settings.cellMinH} bounds={DENSITY_BOUNDS.cellMinH}
                            onChange={v => update({ ...settings, cellMinH: v })} />
                        <SliderRow label="גובה אירוע" value={settings.barH} bounds={DENSITY_BOUNDS.barH}
                            onChange={v => update({ ...settings, barH: v })} />
                        <SliderRow label="פונט אירוע" value={settings.barFont} bounds={DENSITY_BOUNDS.barFont}
                            onChange={v => update({ ...settings, barFont: v })} />
                        <SliderRow label="רוחב עמודה" value={settings.colMinW} bounds={DENSITY_BOUNDS.colMinW}
                            onChange={v => update({ ...settings, colMinW: v })} />
                    </div>

                    <button type="button" className={styles.reset} onClick={() => update(DEFAULT_DENSITY)}>
                        איפוס לרגיל
                    </button>
                </div>
            )}
        </div>
    );
}
