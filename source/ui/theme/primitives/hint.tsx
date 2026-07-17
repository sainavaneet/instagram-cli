import React from 'react';
import {Text} from 'ink';
import {text} from '../tokens.js';

type Props = {
	readonly children: React.ReactNode;
	readonly italic?: boolean;
};

// Dim secondary text for help lines, meta, and hints.
export default function Hint({children, italic = false}: Props) {
	return (
		<Text {...text.muted} italic={italic}>
			{children}
		</Text>
	);
}
