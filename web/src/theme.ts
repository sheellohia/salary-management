import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'indigo',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  defaultRadius: 'md',
});

/** Shared categorical palette for charts (colour-blind-safe-ish, consistent). */
export const CHART_COLORS = [
  'indigo.6',
  'teal.6',
  'grape.6',
  'orange.6',
  'blue.6',
  'lime.6',
  'pink.6',
  'cyan.6',
  'yellow.7',
  'red.6',
];
