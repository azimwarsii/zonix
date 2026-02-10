/**
 * Strict Minimalist Typography
 * Using System fonts for maximum readability and performance.
 * No custom stylized fonts.
 */
import { Platform } from 'react-native';

const systemFont = Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
});

export const Fonts = {
    light: systemFont,
    regular: systemFont,
    thin: systemFont,
    // Logical mapping
    body: systemFont,
    heading: systemFont,
    bold: systemFont,
};
