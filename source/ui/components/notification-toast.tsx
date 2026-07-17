import React, {useEffect, useState} from 'react';
import {Box, Text} from 'ink';
import {border, glyphs, palette} from '../theme/index.js';

export type Alert = {
	from: string;
	preview: string;
};

type NotificationToastProperties = {
	readonly alerts: readonly Alert[];
};

// A mono pulse: dim accent → accent → bright, then settle on the accent. Keeps
// the "lively" attention-grab without the old five-hue rainbow.
const PULSE_COLORS = [
	palette.accentDim,
	palette.accent,
	palette.fgBright,
] as const;
const FRAME_MS = 180;
const MAX_PREVIEW = 44;
// Pulse for a few seconds to grab attention, then settle into a steady banner
// that persists until the chat is opened/read.
const PULSE_FRAMES = 18;

function trim(text: string): string {
	return text.length > MAX_PREVIEW ? `${text.slice(0, MAX_PREVIEW)}…` : text;
}

export default function NotificationToast({
	alerts,
}: NotificationToastProperties) {
	const [frame, setFrame] = useState(0);

	// Re-pulse whenever a new message arrives (the count changes).
	useEffect(() => {
		setFrame(0);
	}, [alerts.length]);

	useEffect(() => {
		if (frame >= PULSE_FRAMES) {
			return; // Settled: stop animating, banner stays put.
		}

		const timer = setTimeout(() => {
			setFrame(previous => previous + 1);
		}, FRAME_MS);

		return () => {
			clearTimeout(timer);
		};
	}, [frame]);

	if (alerts.length === 0) {
		return null;
	}

	const settled = frame >= PULSE_FRAMES;
	const color = settled
		? palette.accent
		: (PULSE_COLORS[frame % PULSE_COLORS.length] ?? palette.accent);
	const count = alerts.length;
	const heading = count > 1 ? `New messages (${count})` : 'New message';

	return (
		<Box
			flexDirection="column"
			{...border.accentLeft}
			paddingLeft={1}
			marginX={1}
		>
			<Box justifyContent="space-between">
				<Text bold color={color}>
					{glyphs.dotActive} {heading}
				</Text>
				<Text color={color}>unread</Text>
			</Box>
			{alerts.map((alert, index) => (
				<Text key={index} dimColor>
					{'  '}
					<Text bold>{alert.from}</Text> — {trim(alert.preview)}
				</Text>
			))}
		</Box>
	);
}
