import React from 'react';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';
import {Text} from 'ink';
import zod from 'zod';
import {accent, instagramGradient, state} from '../ui/theme/index.js';

export const args = zod.tuple([]).rest(zod.string());

type Props = {
	readonly args?: string[];
};

const defaultArgs: string[] = [];

export default function Index({args: unknownArgs = defaultArgs}: Props) {
	if (unknownArgs.length > 0) {
		return (
			<>
				<Text {...state.error}>Unknown command: {unknownArgs.join(' ')}</Text>
				<Text>Run &#39;instagram-cli --help&#39; for available commands.</Text>
			</>
		);
	}

	return (
		<>
			<Gradient colors={[...instagramGradient]}>
				<BigText text="Instagram CLI" colors={['#ff00ff']} />
			</Gradient>
			<Text {...accent.solid}>
				The end of brainrot and doomscrolling is here.
			</Text>
			<Text dimColor>
				Type &#39;instagram-cli --help&#39; to see available commands.
			</Text>
			<Text dimColor>
				Pro Tip: Use vim-motion (&#39;k&#39;, &#39;j&#39;) to navigate chats and
				messages.
			</Text>
		</>
	);
}
