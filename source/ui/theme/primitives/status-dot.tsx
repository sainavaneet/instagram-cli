import React from 'react';
import {Text} from 'ink';
import {glyphs} from '../glyphs.js';
import {accent, state, text} from '../tokens.js';

type Tone = 'accent' | 'success' | 'warning' | 'error' | 'muted';

type Props = {
	readonly tone: Tone;
	// Hollow ring (○) instead of a filled dot (●). Ignored for the error tone,
	// which always renders a cross.
	readonly hollow?: boolean;
};

const toneProps = {
	accent: accent.solid,
	success: state.success,
	warning: state.warning,
	error: state.error,
	muted: text.muted,
} as const;

// A small presence/status indicator: ● / ○ / ✕ in a semantic tone.
export default function StatusDot({tone, hollow = false}: Props) {
	const glyph =
		tone === 'error'
			? glyphs.cross
			: hollow
				? glyphs.dotIdle
				: glyphs.dotActive;
	return <Text {...toneProps[tone]}>{glyph}</Text>;
}
