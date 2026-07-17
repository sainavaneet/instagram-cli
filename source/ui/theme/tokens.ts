// Semantic style tokens.
//
// Each token is a small bag of Ink <Text>/<Box> props, spread at the call site:
//
//   <Text {...text.secondary}>2m</Text>
//   <Text {...accent.bold}>{glyphs.caret}</Text>
//
// Components reference roles (secondary, accent, error) — never raw color names —
// so the whole look can shift by editing colors.ts. Everything is `as const` so
// Ink's literal prop types (e.g. borderStyle: 'single') survive.

import {palette} from './colors.js';

// Text roles. Primary text deliberately carries no color prop (terminal default).
export const text = {
	primary: {} as const,
	secondary: {dimColor: true} as const,
	muted: {dimColor: true} as const,
	bold: {bold: true} as const,
	bright: {color: palette.fgBright} as const,
	inverse: {inverse: true} as const,
} as const;

// The single accent, in three weights.
export const accent = {
	solid: {color: palette.accent} as const,
	dim: {color: palette.accentDim} as const,
	bold: {color: palette.accent, bold: true} as const,
} as const;

// Semantic states — used only where meaning depends on color.
export const state = {
	success: {color: palette.success} as const,
	warning: {color: palette.warning} as const,
	error: {color: palette.error} as const,
	info: {color: palette.info} as const,
} as const;

// Borders. Minimal-mono avoids full rounded boxes; when containment is truly
// needed, use a single accent edge instead of wrapping content in a box.
export const border = {
	none: {} as const,
	// A neutral dim left bar — used to mark incoming messages and quote blocks.
	left: {
		borderStyle: 'single',
		borderLeft: true,
		borderTop: false,
		borderRight: false,
		borderBottom: false,
		borderDimColor: true,
	} as const,
	accentLeft: {
		borderStyle: 'single',
		borderLeft: true,
		borderTop: false,
		borderRight: false,
		borderBottom: false,
		borderColor: palette.accent,
	} as const,
	accentLeftDim: {
		borderStyle: 'single',
		borderLeft: true,
		borderTop: false,
		borderRight: false,
		borderBottom: false,
		borderColor: palette.accentDim,
	} as const,
} as const;
