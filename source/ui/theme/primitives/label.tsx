import React from 'react';
import {Text} from 'ink';
import {text, accent} from '../tokens.js';

type Props = {
	readonly children: React.ReactNode;
	// Render the label in the accent color (for section / identity headers).
	readonly isAccent?: boolean;
};

// Bold primary text for section titles and identity labels.
export default function Label({children, isAccent = false}: Props) {
	return <Text {...(isAccent ? accent.bold : text.bold)}>{children}</Text>;
}
