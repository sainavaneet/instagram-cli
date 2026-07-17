// Centralized color palette for the Instagram CLI.
//
// Design direction: "minimal mono" — mostly monochrome, a single accent color,
// secondary text expressed through Ink's `dimColor` rather than a gray hue.
// Every value here is an Ink-acceptable color string (named color or hex), so a
// future "themes" feature can swap this one map without touching components.

export const palette = {
	// The single brand accent. Instagram already leans magenta, so we keep that
	// identity in one restrained color and let everything else go monochrome.
	accent: 'magentaBright',
	accentDim: 'magenta',

	// Primary foreground. Usually rendered with NO color prop (terminal default);
	// `fgBright` is for emphasis where bold alone is not enough.
	fgBright: 'whiteBright',

	// Semantic states. Used sparingly — only where meaning depends on color.
	success: 'green',
	warning: 'yellow',
	error: 'red',
	info: 'cyan',
} as const;

export type PaletteColor = (typeof palette)[keyof typeof palette];
