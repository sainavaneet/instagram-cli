import React, {useMemo} from 'react';
import {Box, Text} from 'ink';
import Image from 'ink-picture';
import type {Message, Thread} from '../../types/instagram.js';
import {useImageProtocol} from '../hooks/use-image-protocol.js';
import {truncateText} from '../../utils/text-utils.js';
import {ConfigManager} from '../../config.js';
import {hyperlink} from '../../utils/links.js';

type MessageListProperties = {
	readonly messages: Message[];
	readonly currentThread?: Thread;
	readonly selectedMessageIndex?: number | undefined;
	// True when the recipient has seen the conversation (colors the read ticks).
	readonly recipientHasSeen?: boolean;
};

export default function MessageList({
	messages,
	currentThread,
	selectedMessageIndex,
	recipientHasSeen,
}: MessageListProperties) {
	const imageProtocol = useImageProtocol();

	const layout: string = ConfigManager.getInstance().get(
		'chat.layout',
		'compact',
	);
	const oneLine = layout === 'oneline';

	const formatTime = (date: Date) => {
		return date.toLocaleString('en-US', {
			hour12: false,
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	// WhatsApp-style delivery ticks (outgoing only):
	// ✓ sent · ✓✓ delivered · ✓✓ (colored) read.
	const renderTicks = (message: Message) => {
		if (!message.isOutgoing) {
			return null;
		}

		if (recipientHasSeen) {
			return <Text color="green">✓✓ </Text>;
		}

		if (message.deliveryStatus === 'sent') {
			return <Text dimColor>✓ </Text>;
		}

		return <Text dimColor>✓✓ </Text>;
	};

	const mediaShareIndexMap = useMemo(() => {
		const map = new Map<string, number>();
		let i = 0;
		for (const message of messages) {
			if (message.itemType === 'media_share') {
				map.set(message.id, i);
				i++;
			}
		}

		return map;
	}, [messages]);

	const renderMessageContent = (message: Message) => {
		switch (message.itemType) {
			case 'text': {
				return <Text>{message.text}</Text>;
			}

			case 'media': {
				const {media} = message;
				// Video
				if (media.media_type === 2) {
					const videoUrl = media.video_versions?.[0]?.url;
					return <Text dimColor>{`[Sent a video: ${videoUrl}]`}</Text>;
				}

				// Image
				const imageUrl = media.image_versions2?.candidates[0]?.url;
				if (imageUrl) {
					return (
						<Box
							borderStyle="round"
							borderColor="cyan"
							width={32}
							height={17}
							flexDirection="column"
						>
							<Image src={imageUrl} alt="Sent image" protocol={imageProtocol} />
						</Box>
					);
				}

				return <Text dimColor>[Sent an image]</Text>;
			}

			case 'media_share': {
				const post = message.mediaSharePost;
				const index = mediaShareIndexMap.get(message.id) ?? 0;

				return (
					<Box flexDirection="column">
						<Text dimColor>
							[Shared post by{' '}
							<Text bold color="cyan">
								@{post.user.username}
							</Text>
							]
						</Text>
						<Text dimColor>
							Use{' '}
							<Text bold color="yellow">
								:view {index}
							</Text>{' '}
							to view this post
						</Text>
					</Box>
				);
			}

			case 'link': {
				return (
					<Text>
						{message.link.text}
						<Text color="gray"> ({message.link.url})</Text>
					</Text>
				);
			}

			case 'xma': {
				const {xma} = message;
				const label = xma.author
					? `🎬 Reel by @${xma.author}`
					: `🎬 Shared ${xma.kind}`;
				return (
					<Box flexDirection="column">
						<Text color="magenta">{hyperlink(`${label} ↗`, xma.url)}</Text>
						<Text dimColor>
							:open (or select + press o) to watch in browser
						</Text>
					</Box>
				);
			}

			default: {
				return <Text dimColor>{(message as any).text}</Text>;
			}
		}
	};

	if (messages.length === 0) {
		return (
			<Box flexGrow={1} justifyContent="center" alignItems="center">
				<Text dimColor>
					{currentThread
						? 'No messages in this thread. Be the first to say hi!'
						: 'Select a thread to view messages'}
				</Text>
			</Box>
		);
	}

	return (
		<Box flexShrink={0} flexDirection="column" flexGrow={1} paddingX={1}>
			<Box flexShrink={0} flexDirection="column" flexGrow={1}>
				{messages.map((message, index) => {
					const isSelected = selectedMessageIndex === index;

					const reactionCounts: Record<string, number> = {};
					if (message.reactions) {
						for (const reaction of message.reactions) {
							reactionCounts[reaction.emoji] =
								(reactionCounts[reaction.emoji] ?? 0) + 1;
						}
					}

					const label = message.isOutgoing ? 'me' : message.username;
					const labelColor = message.isOutgoing ? 'cyan' : 'greenBright';
					const useSingleLine =
						oneLine && message.itemType === 'text' && !message.repliedTo;

					const reactionsNode =
						message.reactions && message.reactions.length > 0 ? (
							<Box rowGap={1}>
								{Object.entries(reactionCounts).map(([emoji, count]) => (
									<Text key={emoji}>
										{emoji} <Text dimColor>{count}</Text>
									</Text>
								))}
							</Box>
						) : null;

					return (
						<Box
							key={message.id}
							flexDirection="column"
							flexShrink={0}
							marginBottom={1}
							borderStyle={isSelected ? 'round' : undefined}
							borderColor={isSelected ? 'yellow' : undefined}
							paddingX={isSelected ? 1 : 0}
						>
							{useSingleLine ? (
								<Box justifyContent="space-between">
									<Box flexShrink={1}>
										<Text bold color={labelColor}>
											{label}:{' '}
										</Text>
										<Text>{message.text}</Text>
									</Box>
									<Box>
										{renderTicks(message)}
										<Text dimColor>{formatTime(message.timestamp)}</Text>
									</Box>
								</Box>
							) : (
								<>
									<Box justifyContent="space-between">
										<Text bold color={labelColor}>
											{label}
										</Text>
										<Box>
											{renderTicks(message)}
											<Text dimColor>{formatTime(message.timestamp)}</Text>
										</Box>
									</Box>
									<Box flexDirection="column">
										{message.repliedTo && (
											<Box
												flexDirection="column"
												borderLeftColor="gray"
												paddingLeft={1}
												marginBottom={1}
											>
												<Text dimColor>
													Replying to{' '}
													<Text bold>{message.repliedTo.username}</Text>
												</Text>
												<Text dimColor>
													{message.repliedTo.itemType === 'text'
														? `"${truncateText(message.repliedTo.text ?? '', 40)}"`
														: `[A ${message.repliedTo.itemType}]`}
												</Text>
											</Box>
										)}
										{renderMessageContent(message)}
									</Box>
								</>
							)}
							{reactionsNode}
						</Box>
					);
				})}
			</Box>
		</Box>
	);
}
