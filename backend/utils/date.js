/**
 * Date helpers.
 *
 * `dateStrings: true` on the MySQL pool means DATE/DATETIME columns arrive as
 * 'YYYY-MM-DD[ HH:MM:SS]' strings, but `new Date()` stringifies to
 * 'Mon Sep 28 2026 …'. Always format through here so comparisons and display
 * values stay in one predictable `YYYY-MM-DD` shape.
 */

const pad = (n) => String(n).padStart(2, '0');

/** Formats a Date object or an ISO/MySQL date string as 'YYYY-MM-DD'. */
const toDateString = (value) => {
  if (!value) return '';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  const s = String(value);
  const iso = s.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : '';
};

/** Formats as 'YYYY-MM-DD HH:MM' for display. */
const toDateTimeString = (value) => {
  if (!value) return '';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    return `${toDateString(value)} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
  }
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) return s.slice(0, 16);
  return toDateString(s);
};

const addDays = (date, days) => {
  const d = date instanceof Date ? new Date(date.getTime()) : new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

module.exports = { toDateString, toDateTimeString, addDays };
