import { ViewStyle } from 'react-native';

// ── Evolved Purple Palette ──────────────────────────────────────────
export const colors = {
  primary: '#7C3AED',
  primaryLight: '#A78BFA',
  primaryDark: '#5B21B6',
  accentGlow: '#C4B5FD',

  // Backgrounds
  deepBg: '#0F0A1A',
  darkBg: '#1A1128',
  midBg: '#251A3A',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.45)',
  textDark: '#1A1128',

  // Glass
  glassBg: 'rgba(255, 255, 255, 0.10)',
  glassBorder: 'rgba(255, 255, 255, 0.18)',
  glassHighlight: 'rgba(255, 255, 255, 0.25)',

  // Evaluation colors
  good: '#34D399',
  average: '#FBBF24',
  expensive: '#F87171',

  // Utility
  white: '#FFFFFF',
  black: '#000000',
  danger: '#EF4444',
  success: '#10B981',
  info: '#60A5FA',
} as const;

// ── Gradient Presets ────────────────────────────────────────────────
export const gradients = {
  /** Full-screen page background */
  screenBg: ['#0F0A1A', '#1A1128', '#251A3A'] as const,
  /** Header / hero areas */
  header: ['#7C3AED', '#6D28D9', '#5B21B6'] as const,
  /** Primary button */
  primaryBtn: ['#7C3AED', '#6D28D9'] as const,
  /** Home screen background */
  home: ['#5B21B6', '#7C3AED', '#4F46E5'] as const,
  /** Accent glow (used for overlays) */
  glow: ['rgba(124, 58, 237, 0.4)', 'rgba(124, 58, 237, 0)'] as const,
} as const;

// ── Spacing & Radii ────────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
} as const;

// ── Blur intensity for glass cards ─────────────────────────────────
export const blurIntensity = 40;

// ── Reusable Glass Card Style ──────────────────────────────────────
export const glassCard: ViewStyle = {
  backgroundColor: colors.glassBg,
  borderWidth: 1,
  borderColor: colors.glassBorder,
  borderRadius: radii.lg,
  overflow: 'hidden',
};

export const glassCardInner: ViewStyle = {
  padding: spacing.md,
};

// ── Shadow Presets ─────────────────────────────────────────────────
export const glowShadow: ViewStyle = {
  shadowColor: colors.primary,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.35,
  shadowRadius: 16,
  elevation: 8,
};

export const subtleShadow: ViewStyle = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 8,
  elevation: 4,
};

export const glowShadowGood: ViewStyle = {
  shadowColor: colors.good,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.4,
  shadowRadius: 16,
  elevation: 8,
};

export const glowShadowAverage: ViewStyle = {
  shadowColor: colors.average,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.4,
  shadowRadius: 16,
  elevation: 8,
};

export const glowShadowExpensive: ViewStyle = {
  shadowColor: colors.expensive,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.4,
  shadowRadius: 16,
  elevation: 8,
};
