import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts } from '@/constants/Fonts';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        // Override link color if user provides one, else default to underline style
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Fonts.body,
    fontWeight: '400',
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Fonts.bold,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: '300', // Minimalist thin Heading
    lineHeight: 38, // Slightly more line-height for airiness
    fontFamily: Fonts.heading,
    letterSpacing: -0.5, // Tighter tracking for titles
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '500',
    fontFamily: Fonts.body,
    letterSpacing: -0.2,
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    fontFamily: Fonts.body,
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
});
