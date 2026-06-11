import React, {useEffect, useState} from 'react';
import {Box, Text} from 'ink';

export type Alert = {
	from: string;
	preview: string;
};

type NotificationToastProperties = {
	readonly alerts: readonly Alert[];
};

// Colors cycle to make the banner pulse and grab attention.
const PULSE_COLORS = [
	'magenta',
	'magentaBright',
	'cyan',
	'cyanBright',
	'yellow',
] as const;
const ICONS = ['🔔', '📩', '💬', '📨'] as const;
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
		? 'magentaBright'
		: (PULSE_COLORS[frame % PULSE_COLORS.length] ?? 'magenta');
	const icon = settled ? '📨' : (ICONS[frame % ICONS.length] ?? '🔔');
	const count = alerts.length;
	const heading =
		count > 1 ? `${icon} New messages (${count})` : `${icon} New message`;

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor={color}
			paddingX={1}
			marginX={1}
		>
			<Box justifyContent="space-between">
				<Text bold color={color}>
					{heading}
				</Text>
				<Text color={color}>● unread</Text>
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
