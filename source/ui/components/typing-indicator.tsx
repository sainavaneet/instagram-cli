import React, {useEffect, useState} from 'react';
import {Text} from 'ink';

type TypingIndicatorProperties = {
	readonly name: string;
};

const DOT_FRAMES = ['', '.', '..', '...'] as const;
const FRAME_MS = 350;

export default function TypingIndicator({name}: TypingIndicatorProperties) {
	const [frame, setFrame] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			setFrame(previous => previous + 1);
		}, FRAME_MS);

		return () => {
			clearInterval(interval);
		};
	}, []);

	const dots = DOT_FRAMES[frame % DOT_FRAMES.length] ?? '';

	return (
		<Text italic color="cyan">
			✏️ {name} is typing{dots}
		</Text>
	);
}
