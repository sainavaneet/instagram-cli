import React, {useEffect, useState} from 'react';
import {Text} from 'ink';
import {glyphs, state, text} from '../theme/index.js';

export type SendState = 'idle' | 'sending' | 'sent';

type SendStatusProperties = {
	readonly status: SendState;
};

// A small "breathing" spinner, shown dim above the input while a message sends.
const FRAMES = ['✶', '✷', '✸', '✹', '✺', '✹', '✸', '✷'] as const;
const FRAME_MS = 120;

export default function SendStatus({status}: SendStatusProperties) {
	const [frame, setFrame] = useState(0);

	useEffect(() => {
		if (status !== 'sending') {
			return;
		}

		const interval = setInterval(() => {
			setFrame(previous => previous + 1);
		}, FRAME_MS);

		return () => {
			clearInterval(interval);
		};
	}, [status]);

	if (status === 'sending') {
		const glyph = FRAMES[frame % FRAMES.length] ?? '✶';
		return <Text {...text.muted}>{glyph} sending…</Text>;
	}

	if (status === 'sent') {
		return (
			<Text {...state.success} dimColor>
				{glyphs.check} sent
			</Text>
		);
	}

	return null;
}
