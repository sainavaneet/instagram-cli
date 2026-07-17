import React from 'react';
import {Box, Text} from 'ink';
import type {Message, Thread} from '../../types/instagram.js';
import {threadDisplayName} from '../../utils/aliases.js';
import {accent, Caret, glyphs, Hint, StatusDot, text} from '../theme/index.js';

type ThreadItemProperties = {
	readonly thread: Thread;
	readonly isSelected: boolean;
	readonly isTyping?: boolean;
};

// Each item is exactly two lines tall regardless of state — selection is shown
// with an accent caret, not a border. thread-list.tsx depends on this fixed
// height (itemHeight) for viewport paging and mouse hit-testing.
export default function ThreadItem({
	thread,
	isSelected,
	isTyping = false,
}: ThreadItemProperties) {
	const formatTime = (date: Date) => {
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const minutes = Math.floor(diff / 60_000);

		if (minutes < 60) {
			return `${minutes}m`;
		}

		const hours = Math.floor(minutes / 60);
		if (hours < 24) {
			return `${hours}h`;
		}

		const days = Math.floor(hours / 24);
		return `${days}d`;
	};

	const getLastMessageText = (message: Message): string => {
		switch (message.itemType) {
			case 'text': {
				return message.text;
			}

			case 'media': {
				return `${glyphs.media} Media`;
			}

			case 'media_share': {
				return `${glyphs.media} Shared post by @${message.mediaSharePost.user.username}`;
			}

			case 'xma': {
				return message.xma.author
					? `${glyphs.video} Reel by @${message.xma.author}`
					: `${glyphs.video} Shared ${message.xma.kind}`;
			}

			case 'link': {
				return message.link.text;
			}

			case 'placeholder': {
				return message.text;
			}

			default: {
				return '[Unsupported Message]';
			}
		}
	};

	const lastMessageText = thread.lastMessage
		? getLastMessageText(thread.lastMessage)
		: '';

	const usernameProps = isSelected
		? accent.bold
		: thread.unread
			? text.bold
			: text.primary;

	return (
		<Box paddingX={1} width="100%" flexDirection="column">
			{/* Top row: caret + name on the left, time + unread dot on the right */}
			<Box justifyContent="space-between">
				<Box flexShrink={1} marginRight={2}>
					<Caret isActive={isSelected} />
					<Text {...usernameProps} wrap="truncate">
						{threadDisplayName(thread)}
					</Text>
				</Box>
				<Box>
					<Hint>{formatTime(thread.lastActivity)}</Hint>
					{thread.unread && (
						<Text>
							{' '}
							<StatusDot tone="accent" />
						</Text>
					)}
				</Box>
			</Box>

			{/* Bottom row: typing indicator or last-message preview (aligned under name) */}
			{isTyping ? (
				<Text {...accent.dim} italic>
					{'  '}typing···
				</Text>
			) : (
				lastMessageText && (
					<Text {...(thread.unread ? text.bold : text.muted)} wrap="truncate">
						{'  '}
						{lastMessageText.replaceAll(/[\n\r]+/g, ' ')}
					</Text>
				)
			)}
		</Box>
	);
}
