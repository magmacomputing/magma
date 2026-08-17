/**
 * ## AI Plugin — Shared Regex Patterns
 * Single source of truth for all regular expressions used across AI function modules.
 * Import from this module rather than defining inline patterns in function files.
 */

/** Strips an LLM markdown JSON fence prefix (```json\n) from a raw response string. */
export const RE_MARKDOWN_JSON_PREFIX = /^```json\s*/i;

/** Strips an LLM markdown JSON fence suffix (\n```) from a raw response string. */
export const RE_MARKDOWN_JSON_SUFFIX = /\s*```$/i;

/** Matches a leading RFC 5545 "RRULE:" prefix to strip before further RRULE parsing. */
export const RE_RRULE_PREFIX = /^RRULE:/i;

/** Matches an ISO 8601 date string prefix (YYYY-MM-DD) to detect native-parseable inputs. */
export const RE_ISO_DATE_PREFIX = /^\d{4}-\d{2}-\d{2}/;

/** Matches a trailing UTC 'Z' suffix on an ISO string for timezone bracket replacement. */
export const RE_ISO_Z_SUFFIX = /Z$/i;

/** Extracts a minute-based duration from a natural language string (e.g. "30 mins"). */
export const RE_DURATION_MINUTES = /(\d+)\s*(?:minutes?|mins?|m\b)/i;

/** Extracts an hour-based duration from a natural language string (e.g. "1.5 hours"). */
export const RE_DURATION_HOURS = /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h\b)/i;

/** Matches a single ISO weekday digit string (1–7). */
export const RE_ISO_WEEKDAY_DIGIT = /^[1-7]$/;

/** Matches a safe provider ID containing only alphanumeric characters, underscores, and hyphens. */
export const RE_SAFE_PROVIDER_ID = /^[a-z0-9_-]+$/i;

