/**
 * Choose a readable text color (black or white) for a given background color,
 * using the YIQ brightness formula. Falls back to white for missing/invalid
 * input (e.g. CSS variables), so callers can pass `var(--x)` safely.
 */
export function getContrastColor(hex: string): '#000000' | '#ffffff' {
    if (!hex || !hex.startsWith('#')) return '#ffffff';

    // Expand shorthand form (e.g. "#03F" -> "#0033FF")
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const expanded = hex.replace(shorthandRegex, (_m, r, g, b) => r + r + g + g + b + b);

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(expanded);
    if (!result) return '#ffffff';

    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);

    // YIQ equation
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
}
