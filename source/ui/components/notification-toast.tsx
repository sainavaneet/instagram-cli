import React, {useEffect, useState} from 'react';
import {Box, Text} from 'ink';

type NotificationToastProperties = {
	readonly from: string;
	readonly preview: string;
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
const MAX_PREVIEW = 48;
// Pulse for a few seconds to grab attention, then settle into a steady banner
// that persists (no more re-renders) until the chat is opened/read.
const PULSE_FRAMES = 18;

export default function NotificationToast({
	from,
	preview,
}: NotificationToastProperties) {
	const [frame, setFrame] = useState(0);

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

	const settled = frame >= PULSE_FRAMES;
	const color = settled
		? 'magentaBright'
		: (PULSE_COLORS[frame % PULSE_COLORS.length] ?? 'magenta');
	const icon = settled ? '📨' : (ICONS[frame % ICONS.length] ?? '🔔');
	const marker = settled ? '● unread' : '.'.repeat((frame % 3) + 1);
	const text =
		preview.length > MAX_PREVIEW
			? `${preview.slice(0, MAX_PREVIEW)}…`
			: preview;

	return (
		<Box
			borderStyle="round"
			borderColor={color}
			paddingX={1}
			marginX={1}
			justifyContent="space-between"
		>
			<Box flexShrink={1}>
				<Text bold color={color}>
					{icon} New message{' '}
				</Text>
				<Text bold>from {from}</Text>
				<Text dimColor> — {text}</Text>
			</Box>
			<Text color={color}>{marker}</Text>
		</Box>
	);
}
