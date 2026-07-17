// Curated glyph vocabulary.
//
// Replaces the scattered emoji set (📷 🔔 📩 💬 📨 ✏️ 🔍 🎬 👁 🚫 👤) with a
// consistent, monochrome-friendly icon language. A few emoji are kept on purpose
// where they read well and/or a test depends on them (lock).

export const glyphs = {
	// Selection / navigation
	caret: '❯',

	// Presence / state dots
	dotActive: '●',
	dotIdle: '○',

	// Delivery / status
	check: '✓',
	checkDouble: '✓✓',
	cross: '✕',

	// Structure
	rule: '─',
	middot: '·',

	// Content types
	media: '▣',
	video: '▶',
	link: '↗',
	lock: '🔒',
} as const;

export type Glyph = (typeof glyphs)[keyof typeof glyphs];
