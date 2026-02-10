/**
 * Strict Minimalist Theme
 * Core Palette: Black & White ONLY.
 * No accent colors.
 * Subtle grays for non-decorative structure (borders, placeholders).
 */

const white = '#FFFFFF';
const black = '#000000';
const subtleGrayLight = '#E5E5E5';
const subtleGrayDark = '#333333';

export const Colors = {
    light: {
        text: black,
        background: white,
        tint: black,
        icon: black,
        tabIconDefault: '#999999', // Gray for unselected to show state
        tabIconSelected: black,
        border: subtleGrayLight,
        card: '#F5F5F5', // Light gray to stand out on white background
        placeholder: '#A1A1A1',
        error: black, // Avoid red if possible, or keep it minimal
        buttonInitial: black,
        buttonText: white,
    },
    dark: {
        text: white,
        background: black,
        tint: white,
        icon: white,
        tabIconDefault: '#666666', // Gray for unselected
        tabIconSelected: white,
        border: subtleGrayDark,
        card: '#2C2C2C', // Lighter dark gray for better contrast against black
        placeholder: '#555555',
        error: white,
        buttonInitial: white,
        buttonText: black,
    },
};
