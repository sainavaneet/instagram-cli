import React from 'react';
import {Box, Text} from 'ink';
import type {Message, Thread} from '../../types/instagram.js';
import {threadDisplayName} from '../../utils/aliases.js';

type ThreadItemProperties = {
	readonly thread: Thread;
	readonly isSelected: boolean;
};

export default function ThreadItem({thread, isSelected}: ThreadItemProperties) {
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
				return '[Media]';
			}

			case 'media_share': {
				return `[Shared post by @${message.mediaSharePost.user.username}]`;
			}

			case 'xma': {
				return message.xma.author
					? `🎬 Reel by @${message.xma.author}`
					: `🎬 Shared ${message.xma.kind}`;
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

	return (
		<Box
			paddingX={1}
			paddingY={0}
			width="100%"
			flexDirection="column"
			borderStyle={isSelected ? 'round' : undefined}
			borderColor={isSelected ? 'cyan' : undefined}
		>
			{/* Top Row: Title, Unread, Time */}
			<Box justifyContent="space-between">
				<Box flexShrink={1} marginRight={2}>
					{thread.unread && !isSelected && (
						<Text bold color="greenBright">
							●{' '}
						</Text>
					)}
					<Text
						bold={isSelected || thread.unread}
						color={
							isSelected ? 'cyan' : thread.unread ? 'whiteBright' : undefined
						}
						wrap="truncate"
					>
						{threadDisplayName(thread)}
					</Text>
				</Box>
				<Box>
					{thread.unread && (
						<Text bold color="greenBright">
							NEW{' '}
						</Text>
					)}
					<Text dimColor>{formatTime(thread.lastActivity)}</Text>
				</Box>
			</Box>

			{/* Bottom Row: Last Message */}
			{lastMessageText && (
				<Box>
					<Text bold={thread.unread} dimColor={!thread.unread} wrap="truncate">
						{lastMessageText.replaceAll(/[\n\r]+/g, ' ')}
					</Text>
				</Box>
			)}
		</Box>
	);
}
