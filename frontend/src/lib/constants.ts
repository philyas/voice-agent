/**
 * Constants
 * Centralized constants for the application
 */

/**
 * Supported languages for translation
 */
export const LANGUAGES = [
  { code: 'en', name: 'Englisch', flag: '🇬🇧' },
  { code: 'es', name: 'Spanisch', flag: '🇪🇸' },
  { code: 'fr', name: 'Französisch', flag: '🇫🇷' },
  { code: 'it', name: 'Italienisch', flag: '🇮🇹' },
  { code: 'pt', name: 'Portugiesisch', flag: '🇵🇹' },
  { code: 'nl', name: 'Niederländisch', flag: '🇳🇱' },
  { code: 'pl', name: 'Polnisch', flag: '🇵🇱' },
  { code: 'ru', name: 'Russisch', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanisch', flag: '🇯🇵' },
  { code: 'zh', name: 'Chinesisch', flag: '🇨🇳' },
  { code: 'ko', name: 'Koreanisch', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabisch', flag: '🇸🇦' },
  { code: 'tr', name: 'Türkisch', flag: '🇹🇷' },
  { code: 'sv', name: 'Schwedisch', flag: '🇸🇪' },
  { code: 'da', name: 'Dänisch', flag: '🇩🇰' },
  { code: 'no', name: 'Norwegisch', flag: '🇳🇴' },
  { code: 'fi', name: 'Finnisch', flag: '🇫🇮' },
  { code: 'cs', name: 'Tschechisch', flag: '🇨🇿' },
  { code: 'hu', name: 'Ungarisch', flag: '🇭🇺' },
  { code: 'ro', name: 'Rumänisch', flag: '🇷🇴' },
] as const;

export type Language = (typeof LANGUAGES)[number];
export type LanguageCode = Language['code'];

/**
 * Enrichment types that support manual list item addition
 */
export const LIST_ENRICHMENT_TYPES = ['action_items', 'notes', 'key_points'] as const;
export type ListEnrichmentType = (typeof LIST_ENRICHMENT_TYPES)[number];

/**
 * Keywords that identify list sections in enrichments
 */
export const LIST_SECTION_KEYWORDS = [
  'aufgaben',
  'todos',
  'to-dos',
  'kernpunkte',
  'notizen',
  'anmerkungen',
  'action items',
  'key points',
  'notes',
] as const;

/**
 * Default pagination values
 */
export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  DEFAULT_OFFSET: 0,
} as const;

/**
 * Animation durations in milliseconds
 */
export const ANIMATION = {
  FAST: 150,
  DEFAULT: 200,
  SLOW: 300,
  VERY_SLOW: 500,
} as const;

/**
 * Toast/notification durations in milliseconds
 */
export const NOTIFICATION_DURATION = {
  SUCCESS: 2000,
  ERROR: 5000,
  INFO: 3000,
} as const;

/**
 * Recording UI sound assets (public assets)
 */
export const RECORDING_SOUNDS = {
  START: '/assets/audio/start_recording_fx.mp3',
  STOP: '/assets/audio/stop_recording_fx.mp3',
} as const;
