export const theme = {
  colors: {
    // Primary colors
    primary: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316', // Main orange
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
    },
    // Secondary colors (purple for Obsidian)
    secondary: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',
      600: '#9333ea',
      700: '#7c3aed',
      800: '#6b21a8',
      900: '#581c87',
    },
    // Background colors
    background: {
      dark: '#1a1f36',
      light: '#f8fafc',
      card: '#ffffff',
    },
    // Text colors
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
      light: '#94a3b8',
      inverse: '#ffffff',
    },
    // Status colors
    status: {
      success: '#22c55e',
      warning: '#eab308',
      error: '#ef4444',
      info: '#3b82f6',
    },
  },
  fonts: {
    heading: '"Noto Sans JP", system-ui, sans-serif',
    body: '"Noto Sans JP", system-ui, sans-serif',
  },
  fontWeights: {
    normal: 400,
    medium: 500,
    bold: 700,
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    glow: '0 0 20px -5px',
  },
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  transitions: {
    fast: '150ms ease',
    normal: '300ms ease',
    slow: '500ms ease',
  },
} as const;

export type Theme = typeof theme;
