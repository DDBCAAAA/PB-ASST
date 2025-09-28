const palette = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primaryLight: '#60a5fa',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#0f172a',
  textSecondary: '#475569',
  success: '#16a34a',
  warning: '#f59e0b',
  error: '#dc2626',
};

const typography = {
  heading1: {
    fontSize: 32,
    fontWeight: '700',
  },
  heading2: {
    fontSize: 24,
    fontWeight: '600',
  },
  body: {
    fontSize: 16,
  },
  caption: {
    fontSize: 14,
    color: palette.textSecondary,
  },
};

const spacing = [0, 4, 8, 12, 16, 20, 24, 32];

const theme = {
  palette,
  typography,
  spacing,
};

export default theme;
