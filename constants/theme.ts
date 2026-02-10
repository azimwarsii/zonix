/**
 * Strict Minimalist Theme Configuration
 * Imports core values from Colors.ts to maintain a single source of truth.
 */
import { Platform } from 'react-native';
import { Colors as ThemeColors } from './Colors'; // Import our new minimalistic colors

export const Colors = ThemeColors;

export const Fonts = Platform.select({
  ios: {
    sans: 'System', // iOS system font is San Francisco, usually cleaner.
    serif: 'System', // Keep it minimal
    rounded: 'System', // No rounded fonts unless specific headers
    mono: 'System',
  },
  android: {
    sans: 'Roboto',
    serif: 'Roboto',
    rounded: 'Roboto',
    mono: 'monospace',
  },
  default: {
    sans: 'System',
    serif: 'sans-serif',
    rounded: 'sans-serif',
    mono: 'monospace',
  },
  web: {
    sans: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Inter, sans-serif",
    rounded: "Inter, sans-serif",
    mono: "monospace",
  },
});
