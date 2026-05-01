// ─────────────────────────────────────────────────────────────────────────────
// Date utilities — Paraguay timezone (America/Asuncion, UTC-3 / UTC-4)
// ─────────────────────────────────────────────────────────────────────────────

const TZ = 'America/Asuncion';

/**
 * Returns a Date object adjusted to Paraguay's local time.
 * Use this instead of `new Date()` whenever you need the current local date/time.
 */
export function getLocalDate(): Date {
    return new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
}

/**
 * Returns today's date in YYYY-MM-DD format in Paraguay timezone.
 * Perfect for <input type="date"> defaultValue and Supabase date fields.
 */
export function todayLocal(): string {
    const d = getLocalDate();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Formats a date string or Date object to dd/mm/yyyy in Paraguay timezone.
 */
export function formatDateLocal(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('es-PY', {
        timeZone: TZ,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

/**
 * Returns the current month name and year in Paraguay timezone.
 * Example: "Abril De 2026"
 */
export function currentMonthYearLocal(): string {
    const d = getLocalDate();
    const month = d.toLocaleString('es-PY', { month: 'long', timeZone: TZ });
    const capitalized = month.charAt(0).toUpperCase() + month.slice(1);
    return `${capitalized} De ${d.getFullYear()}`;
}

/**
 * Returns the first day of the current month in YYYY-MM-DD format (Paraguay TZ).
 */
export function firstOfMonthLocal(): string {
    const d = getLocalDate();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
}
