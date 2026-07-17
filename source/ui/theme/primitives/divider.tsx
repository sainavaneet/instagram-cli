import React from 'react';
import {Box, Text} from 'ink';
import {glyphs} from '../glyphs.js';
import {text} from '../tokens.js';

type Props = {
	// Fixed character width. When omitted the divider fills its container and
	// reflows on terminal resize (rendered as a top-only box border).
	readonly width?: number;
};

// A thin horizontal rule. The minimal-mono replacement for grouping content in
// rounded boxes — separate sections with a dim line and whitespace instead.
export default function Divider({width}: Props) {
	if (typeof width === 'number') {
		return <Text {...text.muted}>{glyphs.rule.repeat(width)}</Text>;
	}

	return (
		<Box
			borderTop
			borderDimColor
			width="100%"
			borderStyle="single"
			borderBottom={false}
			borderLeft={false}
			borderRight={false}
		/>
	);
}
