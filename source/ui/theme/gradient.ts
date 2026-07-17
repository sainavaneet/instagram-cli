// Instagram brand gradient stops.
//
// Centralized here so the gradient is reused only for deliberate "lively" accent
// moments (the homepage banner). Do NOT use gradient in per-frame-animated
// components — ink-gradient recomputes every render and will flicker/burn CPU.

export const instagramGradient = [
	'#405DE6',
	'#5B51D8',
	'#833AB4',
	'#C13584',
	'#E1306C',
	'#FD1D1D',
	'#F56040',
] as const;
