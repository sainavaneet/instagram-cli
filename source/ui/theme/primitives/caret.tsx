import React from 'react';
import {Text} from 'ink';
import {glyphs} from '../glyphs.js';
import {accent} from '../tokens.js';

type Props = {
	// When false, renders blank space the same width as the caret so rows stay
	// aligned whether or not they are selected.
	readonly isActive: boolean;
};

// The accent selection indicator: "❯ " when active, "  " otherwise.
export default function Caret({isActive}: Props) {
	if (!isActive) {
		return <Text>{'  '}</Text>;
	}

	return <Text {...accent.bold}>{glyphs.caret} </Text>;
}
