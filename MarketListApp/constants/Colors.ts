/**
 * Navy Blue & Canary Yellow Theme
 * 
 * A premium dark theme inspired by Fenerbahçe colors.
 * Deep navy backgrounds with vibrant yellow accents.
 */

// Theme accent colors
const accentColor = '#FFC107'; // Golden Yellow

export const NavyDarkTheme = {
  // Main background - deep midnight blue
  background: '#0B1120',

  // Card/Surface - slightly lighter for depth
  card: '#151F32',

  // Secondary surface - for inputs, filters
  surface: '#1C2A42',

  // Text colors
  text: '#FFFFFF',            // Pure white for maximum contrast
  textSecondary: '#64748B',   // Slate grey - medium emphasis
  textMuted: '#475569',       // Darker muted

  // Accent colors
  primary: '#FFC107',         // Golden Yellow accent
  primaryDark: '#D4A106',     // Darker gold for pressed states

  // Semantic colors
  danger: '#EF4444',          // Error, delete, destructive
  warning: '#F59E0B',         // Warning states
  success: '#4ADE80',         // Success states (keep green for success)

  // Borders and separators
  border: '#1E293B',          // Subtle midnight divider

  // Overlay for modals
  overlay: 'rgba(11, 17, 32, 0.85)',
};

export const NavyLightTheme = {
  // Main background - Soft Cloud White
  background: '#F0F4F8',

  // Card/Surface - Pure White
  card: '#FFFFFF',

  // Secondary surface
  surface: '#E8EDF4',

  // Text colors
  text: '#0B1120',              // Midnight Blue - high contrast
  textSecondary: '#475569',     // Slate Grey
  textMuted: '#64748B',         // Lighter slate

  // Accent colors - Navy Blue for Light Mode (contrast with white)
  primary: '#0B1120',           // Midnight Blue accent
  primaryDark: '#1E293B',       // Slightly lighter for pressed states

  // Semantic colors
  danger: '#DC2626',
  warning: '#D97706',
  success: '#16A34A',

  // Borders
  border: '#D1D9E6',

  // Overlay
  overlay: 'rgba(11, 17, 32, 0.4)',
};

// Legacy export for backward compatibility
export default {
  light: {
    text: NavyLightTheme.text,
    background: NavyLightTheme.background,
    tint: NavyLightTheme.primary,
    tabIconDefault: NavyLightTheme.textMuted,
    tabIconSelected: NavyLightTheme.primary,
  },
  dark: {
    text: NavyDarkTheme.text,
    background: NavyDarkTheme.background,
    tint: NavyDarkTheme.primary,
    tabIconDefault: NavyDarkTheme.textSecondary,
    tabIconSelected: NavyDarkTheme.primary,
  },
};

/**
 * Shadow/Elevation presets for premium depth effect
 */
export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  // Yellow glow for primary buttons
  primaryGlow: {
    shadowColor: '#FFC107',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
};
