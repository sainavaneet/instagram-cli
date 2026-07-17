import process from 'node:process';
import React, {useState, useEffect, useRef, useCallback} from 'react';
import {Box, Text, useInput, useApp, useWindowSize} from 'ink';
import {TerminalInfoProvider} from 'ink-picture';
import open from 'open';
import type {
	Thread,
	ChatState,
	Message,
	Post,
	ReactionEvent,
	SeenEvent,
} from '../../types/instagram.js';
import type {RealtimeStatus, SearchResult} from '../../client.js';
import MessageList from '../components/message-list.js';
import InputBox from '../components/input-box.js';
import StatusBar from '../components/status-bar.js';
import NotificationToast from '../components/notification-toast.js';
import SendStatus, {type SendState} from '../components/send-status.js';
import TypingIndicator from '../components/typing-indicator.js';
import ThreadList from '../components/thread-list.js';
import ScrollView, {type ScrollViewRef} from '../components/scroll-view.js';
import {Hint, state} from '../theme/index.js';
import {useClient} from '../context/client-context.js';
import {ConfigManager} from '../../config.js';
import {getOpenableUrl} from '../../utils/links.js';
import {applyAlias, threadDisplayName} from '../../utils/aliases.js';
import {closeBrowser} from '../../utils/web-sender.js';
import {parseAndDispatchChatCommand} from '../../utils/chat-commands.js';
import FullScreen from '../components/full-screen.js';
import {preprocessMessage} from '../../utils/preprocess.js';
import SearchInput from '../components/search-input.js';
import SinglePostView from '../components/single-post-view.js';
import {useImageProtocol} from '../hooks/use-image-protocol.js';
import {updateThreadByMessage} from '../../utils/thread-utils.js';

type SearchMode = 'username' | 'title' | undefined;

type ChatViewProps = {
	readonly initialSearchQuery?: string;
	readonly initialSearchMode?: SearchMode;
};

// Short, readable preview of an incoming message for the notification toast.
function previewOf(message: Message): string {
	switch (message.itemType) {
		case 'text': {
			return message.text;
		}

		case 'xma': {
			return '🎬 shared a reel/post';
		}

		case 'media': {
			return '📷 sent a photo';
		}

		case 'media_share': {
			return '📎 shared a post';
		}

		case 'link': {
			return message.link.text;
		}

		default: {
			return '💬 sent a message';
		}
	}
}

// Merge an incoming message into the list, de-duplicating the realtime echo of
// a message we just sent (its real id won't match our optimistic `local-…`
// placeholder, so we match on content and replace the placeholder instead).
function mergeMessage(messages: Message[], incoming: Message): Message[] {
	if (messages.some(m => m.id === incoming.id)) {
		return messages;
	}

	if (incoming.isOutgoing && incoming.itemType === 'text') {
		const index = messages.findIndex(
			m =>
				m.id.startsWith('local-') &&
				m.isOutgoing &&
				m.itemType === 'text' &&
				m.text === incoming.text,
		);
		if (index !== -1) {
			const next = [...messages];
			next[index] = incoming;
			return next;
		}
	}

	return [...messages, incoming];
}

export default function ChatView({
	initialSearchQuery,
	initialSearchMode,
}: ChatViewProps) {
	const {exit} = useApp();
	const client = useClient();
	const {columns: width, rows: height} = useWindowSize();
	const scrollViewRef = useRef<ScrollViewRef | undefined>(undefined);

	const [chatState, setChatState] = useState<ChatState>({
		threads: [],
		messages: [],
		loading: true,
		loadingMoreThreads: false,
		currentThread: undefined,
		selectedMessageIndex: undefined,
		isSelectionMode: false,
		recipientAlreadyRead: false,
		invisibleMode: ConfigManager.getInstance().get(
			'privacy.invisibleMode',
			false,
		),
	});

	const [currentView, setCurrentView] = useState<'threads' | 'chat'>('threads');
	const [realtimeStatus, setRealtimeStatus] =
		useState<RealtimeStatus>('disconnected');
	const [systemMessage, setSystemMessage] = useState<string | undefined>(
		undefined,
	);
	const [newMessageAlerts, setNewMessageAlerts] = useState<
		Array<{from: string; preview: string; threadId: string}>
	>([]);
	const [sendStatus, setSendStatus] = useState<SendState>('idle');
	const [typingThreadIds, setTypingThreadIds] = useState<string[]>([]);
	const typingTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

	const [searchMode, setSearchMode] = useState<SearchMode>(initialSearchMode);
	const [searchQuery, setSearchQuery] = useState(initialSearchQuery ?? '');
	const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [isInitialSearchHandled, setIsInitialSearchHandled] = useState<boolean>(
		!(initialSearchMode && initialSearchQuery),
	);
	const searchDebounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

	// State for viewing shared posts
	const [viewingPost, setViewingPost] = useState<Post | undefined>(undefined);
	const imageProtocol = useImageProtocol();

	// Calculate available height for messages (total height minus status bar and
	// input area). The notification toast has only a left accent rule (no top or
	// bottom border), so it occupies its header row plus one line per alert.
	const toastRows =
		newMessageAlerts.length > 0 ? newMessageAlerts.length + 1 : 0;
	// Budget: status bar (1) + input divider + input line (2) + help (1) + spacing.
	const messageAreaHeight = Math.max(1, height - 7 - toastRows);

	// Handler for viewing media share posts
	const handleViewMediaShare = useCallback((post: Post) => {
		setViewingPost(post);
	}, []);

	// Handler for closing the post view
	const handleClosePostView = useCallback(() => {
		setViewingPost(undefined);
	}, []);

	// Effect to clear system messages after a delay
	useEffect(() => {
		if (systemMessage) {
			const timer = setTimeout(() => {
				setSystemMessage(undefined);
			}, 3000); // Clear after 3 seconds
			return () => {
				clearTimeout(timer);
			};
		}

		return;
	}, [systemMessage]);

	// Close the headless send-browser when the app exits (covers Esc / Ctrl+C
	// quits via Ink unmount; Playwright's own handlers cover signals too).
	useEffect(() => {
		const onSignal = () => {
			void closeBrowser();
		};

		process.once('SIGINT', onSignal);
		process.once('SIGTERM', onSignal);
		process.once('SIGHUP', onSignal);

		return () => {
			void closeBrowser();
			process.off('SIGINT', onSignal);
			process.off('SIGTERM', onSignal);
			process.off('SIGHUP', onSignal);
		};
	}, []);

	// Clear the "✓ sent" indicator a moment after a successful send.
	useEffect(() => {
		if (sendStatus === 'sent') {
			const timer = setTimeout(() => {
				setSendStatus('idle');
			}, 1800);
			return () => {
				clearTimeout(timer);
			};
		}

		return;
	}, [sendStatus]);

	// Typing indicators: track which threads currently show "… is typing",
	// auto-expiring each after a few seconds if no further typing event.
	useEffect(() => {
		if (!client) return;

		const onTyping = (event: {threadId: string; isTyping: boolean}) => {
			const timers = typingTimers.current;
			const existing = timers.get(event.threadId);
			if (existing) {
				clearTimeout(existing);
				timers.delete(event.threadId);
			}

			if (event.isTyping) {
				setTypingThreadIds(previous =>
					previous.includes(event.threadId)
						? previous
						: [...previous, event.threadId],
				);
				timers.set(
					event.threadId,
					setTimeout(() => {
						setTypingThreadIds(previous =>
							previous.filter(id => id !== event.threadId),
						);
						timers.delete(event.threadId);
					}, 6000),
				);
			} else {
				setTypingThreadIds(previous =>
					previous.filter(id => id !== event.threadId),
				);
			}
		};

		client.on('typing', onTyping);
		const timers = typingTimers.current;
		return () => {
			client.off('typing', onTyping);
			for (const timer of timers.values()) {
				clearTimeout(timer);
			}

			timers.clear();
		};
	}, [client]);

	// Helper to exit search mode
	const exitSearchMode = useCallback(() => {
		setSearchMode(undefined);
		setSearchQuery('');
		setSearchResults([]);
	}, []);

	const handleThreadSelect = useCallback(
		async (thread: Thread) => {
			if (!client) return;

			// Opening a thread = read it, so drop its notifications from the toast.
			setNewMessageAlerts(previous =>
				previous.filter(alert => alert.threadId !== thread.id),
			);

			if (searchMode) {
				exitSearchMode();
			}

			setCurrentView('chat');
			setChatState(previous => ({
				...previous,
				currentThread: thread,
				loading: true,
				messages: [],
				recipientAlreadyRead: false,
			}));

			try {
				let threadId = thread.id;

				// Check if this is a pending thread (user selected from search)
				if (thread.id.startsWith('PENDING_')) {
					// Extract user PK from virtual ID
					const userPk = thread.id.replace('PENDING_', '');
					try {
						// Ensure thread will resolve the "virtual" thread if it exists
						const realThread = await client.ensureThread(userPk);
						threadId = realThread.id;
						// Update current thread with real details
						setChatState(previous => ({
							...previous,
							currentThread: realThread,
						}));
					} catch (error) {
						throw new Error(
							`Failed to resolve thread: ${
								error instanceof Error ? error.message : 'Unknown error'
							}`,
						);
					}
				}

				const {messages, cursor, recipientHasSeen} =
					await client.getMessages(threadId);

				setChatState(previous => ({
					...previous,
					messages,
					loading: false,
					messageCursor: cursor,
					// Reflect whether they've already seen our last message (green ticks).
					recipientAlreadyRead: recipientHasSeen,
				}));

				// Mark thread as seen
				const lastMessage = messages.at(-1);

				if (lastMessage?.id) {
					// Mark as read in local and remote states
					setChatState(previous => ({
						...previous,
						threads: previous.threads.map(t =>
							t.id === threadId ? {...t, unread: false} : t,
						),
						currentThread:
							previous.currentThread?.id === threadId
								? {...previous.currentThread, unread: false}
								: previous.currentThread,
					}));
					// Silent read: skip the remote "Seen" receipt when invisible mode is on.
					if (
						!ConfigManager.getInstance().get('privacy.invisibleMode', false)
					) {
						await client.markThreadAsSeen(threadId, lastMessage.id);
					}
				}
			} catch (error) {
				setChatState(previous => ({
					...previous,
					error:
						error instanceof Error ? error.message : 'Failed to load messages',
					loading: false,
				}));
			}
		},
		[client, exitSearchMode, searchMode],
	);

	// Effect to handle initial search query from CLI
	useEffect(() => {
		if (isInitialSearchHandled) {
			return;
		}

		const handleInitialSearch = async () => {
			if (initialSearchMode === 'username' && initialSearchQuery && client) {
				setSearchMode('username');
				setSearchQuery(initialSearchQuery);
				setIsSearching(true);
				try {
					const results = await client.searchThreadByUsername(
						initialSearchQuery,
						{
							forceExact: true,
						},
					);
					// Open the first result if it exists, there will ONLY be one result
					if (results.length > 0 && results[0]) {
						setSearchResults(results);
						void handleThreadSelect(results[0].thread);
					} else {
						const results =
							await client.searchThreadByUsername(initialSearchQuery);
						setSearchResults(results);
					}
				} finally {
					setIsSearching(false);
				}
			} else if (initialSearchMode === 'title' && initialSearchQuery) {
				setSearchMode('title');
				setSearchQuery(initialSearchQuery);
				setIsSearching(true);
				try {
					const results = await client.searchThreadsByTitle(
						initialSearchQuery,
						{
							threshold: 0.3,
							maxThreadsToSearch: 10,
						},
					);
					setSearchResults(results);
					if (results && results.length > 0 && results[0]!.score > 0.6) {
						void handleThreadSelect(results[0]!.thread);
					}
				} finally {
					setIsSearching(false);
				}
			}

			setIsInitialSearchHandled(true);
		};

		void handleInitialSearch();
	}, [
		client,
		initialSearchQuery,
		initialSearchMode,
		isInitialSearchHandled,
		handleThreadSelect,
	]);

	// Effect to debounce search queries in search mode
	useEffect(() => {
		if (!isInitialSearchHandled) {
			return;
		}

		if (!searchMode || searchQuery.length === 0 || !client) {
			setSearchResults([]);
			return;
		}

		if (searchDebounceRef.current) {
			clearTimeout(searchDebounceRef.current);
		}

		setIsSearching(true);

		// Debounce the search
		searchDebounceRef.current = setTimeout(async () => {
			try {
				if (searchMode === 'username') {
					// Use fuzzy search for UI interactive search
					const results = await client.searchThreadByUsername(searchQuery, {
						forceExact: false,
					});
					setSearchResults(results);
				} else {
					const results = await client.searchThreadsByTitle(searchQuery, {
						threshold: 0.3,
						maxThreadsToSearch: 10,
					});
					setSearchResults(results);
				}
			} catch {
				setSystemMessage('Search failed');
			} finally {
				setIsSearching(false);
			}
		}, 300); // 300ms debounce

		return () => {
			if (searchDebounceRef.current) {
				clearTimeout(searchDebounceRef.current);
			}
		};
	}, [client, searchMode, searchQuery, isInitialSearchHandled]);

	// Load threads when client is ready
	useEffect(() => {
		const loadThreads = async () => {
			if (!client) return;

			try {
				setChatState(previous => ({...previous, loading: true}));
				const {threads, hasMore} = await client.getThreads();
				setChatState(previous => ({
					...previous,
					threads,
					hasMoreThreads: hasMore,
					loading: false,
				}));
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : 'Failed to load threads';
				setChatState(previous => ({
					...previous,
					loading: false,
					error: errorMessage,
				}));
			}
		};

		void loadThreads();
	}, [client]);

	// Effect for realtime status and errors (no thread dependency)
	useEffect(() => {
		if (!client) return;

		const handleRealtimeStatus = (status: RealtimeStatus) => {
			setRealtimeStatus(status);
		};

		const handleError = (error: Error) => {
			setChatState(prev => ({...prev, error: error.message, loading: false}));
		};

		client.on('realtimeStatus', handleRealtimeStatus);
		client.on('error', handleError);

		client.emit('realtimeStatus', client.getRealtimeStatus());

		return () => {
			client.off('realtimeStatus', handleRealtimeStatus);
			client.off('error', handleError);
		};
	}, [client]);

	// Effect for message events (needs thread dependency)
	useEffect(() => {
		if (!client) return;

		const handleMessage = async (message: Message) => {
			// A message arrived → they've stopped typing in that thread.
			setTypingThreadIds(previous =>
				previous.filter(id => id !== message.threadId),
			);

			// for current thread, append to message list and handle view changes
			if (message.threadId === chatState.currentThread?.id) {
				setChatState(prev => ({
					...prev,
					messages: mergeMessage(prev.messages, message),
					recipientAlreadyRead: false,
					// Update thread: move to top and update last message
					threads: updateThreadByMessage(prev.threads, message, {
						markAsUnread: false,
					}),
				}));

				// If scrollview is at bottom, scroll to bottom on new messages
				// Otherwise, the use might be reading older messages so just update state
				if (scrollViewRef.current) {
					const offset = scrollViewRef.current.getScrollOffset();
					const {height: contentHeight} =
						scrollViewRef.current.getContentSize();
					const isAtBottom = offset >= contentHeight - messageAreaHeight;

					if (isAtBottom) {
						// Small delay to allow message to render before scrolling
						setTimeout(() => {
							scrollViewRef.current?.scrollToEnd(false);
						}, 100);
					}
				}

				// Mark item as seen (skip when silent/invisible mode is on)
				if (!ConfigManager.getInstance().get('privacy.invisibleMode', false)) {
					await client.markItemAsSeen(chatState.currentThread.id, message.id);
				}

				return;
			}

			// Update thread list: show unread status, update last message preview, move to top
			// Ring the terminal bell + show an animated toast of who it's from.
			process.stdout.write(String.fromCodePoint(7));
			setNewMessageAlerts(previous =>
				[
					...previous,
					{
						from: applyAlias(message.username),
						preview: previewOf(message),
						threadId: message.threadId,
					},
				].slice(-6),
			);
			setChatState(prev => ({
				...prev,
				threads: updateThreadByMessage(prev.threads, message, {
					markAsUnread: true,
				}),
			}));
		};

		client.on('message', handleMessage);

		return () => {
			client.off('message', handleMessage);
		};
	}, [client, chatState.currentThread?.id, height, messageAreaHeight]);

	// Effect for threadseen events
	useEffect(() => {
		const handleThreadSeen = (seenEvent: SeenEvent) => {
			// Only process seen events for the current thread
			if (seenEvent.threadId === chatState.currentThread?.id) {
				setChatState(previous => ({...previous, recipientAlreadyRead: true}));
			}
		};

		client.on('threadSeen', handleThreadSeen);

		return () => {
			client.off('threadSeen', handleThreadSeen);
		};
	}, [client, chatState.currentThread?.id]);

	// Effect for reaction events
	useEffect(() => {
		if (!client) return;

		const handleReaction = (reactionEvent: ReactionEvent) => {
			// Only process reactions for the current thread
			if (reactionEvent.threadId !== chatState.currentThread?.id) {
				return;
			}

			setChatState(prev => {
				const updatedMessages = prev.messages.map(message => {
					// Find the message that matches the item_id
					if (message.item_id === reactionEvent.itemId) {
						// Add the new reaction to the message
						const existingReactions = message.reactions ?? [];

						// Check if this exact reaction already exists (same user, same emoji)
						const reactionExists = existingReactions.some(
							r =>
								r.senderId === reactionEvent.userId &&
								r.emoji === reactionEvent.emoji,
						);

						if (reactionExists) {
							return message; // Don't add duplicate
						}

						return {
							...message,
							reactions: [
								...existingReactions,
								{
									emoji: reactionEvent.emoji,
									senderId: reactionEvent.userId,
								},
							],
						};
					}

					return message;
				});

				return {...prev, messages: updatedMessages};
			});
		};

		client.on('reaction', handleReaction);

		return () => {
			client.off('reaction', handleReaction);
		};
	}, [client, chatState.currentThread?.id]);

	// Polling effect for messages when realtime client is disconnected
	useEffect(() => {
		let pollingInterval: NodeJS.Timeout | undefined;

		const pollForNewMessages = async () => {
			if (!client || !chatState.currentThread) {
				return;
			}

			try {
				// polling always fetches messages in current thread
				const {messages: latestMessages} = await client.getMessages(
					chatState.currentThread.id,
				);

				setChatState(previous => {
					const existingMessageIds = new Set(previous.messages.map(m => m.id));
					const newMessages = latestMessages.filter(
						m => !existingMessageIds.has(m.id),
					);

					if (newMessages.length > 0) {
						return {
							...previous,
							messages: [...previous.messages, ...newMessages],
						};
					}

					return previous;
				});
			} catch (error) {
				setChatState(previous => ({
					...previous,
					error:
						error instanceof Error
							? error.message
							: 'Failed to poll for new messages',
				}));
			}
		};

		if (realtimeStatus === 'disconnected' && chatState.currentThread) {
			pollingInterval = setInterval(pollForNewMessages, 5000);
		}

		return () => {
			if (pollingInterval) {
				clearInterval(pollingInterval);
			}
		};
	}, [client, chatState.currentThread, realtimeStatus]);

	useEffect(() => {
		return () => {
			if (realtimeStatus === 'connected' && client) {
				void client.shutdown();
			}
		};
	}, [client, realtimeStatus]);

	useInput((input, key) => {
		if (viewingPost) {
			return;
		}

		// Don't handle input when in search mode (SearchInput handles it)
		if (searchMode) {
			return;
		}

		if (key.ctrl && input === 'c') {
			if (currentView === 'threads') {
				exit();
			}

			// In 'chat' view the InputBox component handles Ctrl+C
			// (clear text if non-empty, exit if empty).
			return;
		}

		if (key.escape && currentView === 'threads') {
			exit();
			return;
		}

		if (key.escape && currentView === 'chat') {
			if (chatState.isSelectionMode) {
				setChatState(previous => ({
					...previous,
					isSelectionMode: false,
					selectedMessageIndex: undefined,
				}));
			} else {
				setCurrentView('threads');
				setChatState(previous => ({
					...previous,
					currentThread: undefined,
					messages: [],
					selectedMessageIndex: undefined,
					isSelectionMode: false,
				}));
			}

			return;
		}

		// Keyboard scrolling in a chat (mouse wheel doesn't work in every
		// terminal, e.g. Warp). PageUp/PageDown or Ctrl+U/Ctrl+D scroll history.
		if (currentView === 'chat' && !chatState.isSelectionMode) {
			const page = Math.max(1, messageAreaHeight - 1);
			if (key.pageUp || (key.ctrl && input === 'u')) {
				scrollViewRef.current?.scrollTo(current => current - page);
				return;
			}

			if (key.pageDown || (key.ctrl && input === 'd')) {
				scrollViewRef.current?.scrollTo(current => current + page);
				return;
			}
		}

		// Search mode activation (only in threads view)
		if (currentView === 'threads' && !chatState.loading) {
			if (input === '/') {
				setSearchMode('title');
				setSearchQuery('');
				return;
			}

			if (input === '@') {
				setSearchMode('username');
				setSearchQuery('');
				return;
			}
		}

		if (chatState.isSelectionMode && currentView === 'chat') {
			switch (input) {
				case 'j': {
					setChatState(previous => {
						const maxIndex = Math.max(0, previous.messages.length - 1);
						const newIndex =
							previous.selectedMessageIndex === undefined
								? maxIndex
								: Math.min(maxIndex, previous.selectedMessageIndex + 1);
						return {
							...previous,
							selectedMessageIndex: newIndex,
						};
					});
					break;
				}

				case 'k': {
					setChatState(previous => {
						const newIndex =
							previous.selectedMessageIndex === undefined
								? Math.max(0, previous.messages.length - 1)
								: Math.max(0, previous.selectedMessageIndex - 1);
						return {
							...previous,
							selectedMessageIndex: newIndex,
						};
					});
					break;
				}

				case 'o': {
					const selected =
						chatState.selectedMessageIndex === undefined
							? undefined
							: chatState.messages[chatState.selectedMessageIndex];
					const url = selected ? getOpenableUrl(selected) : undefined;
					if (url) {
						void open(url);
						setSystemMessage(`🌐 Opening in browser: ${url}`);
					} else {
						setSystemMessage('This message has no link to open.');
					}

					break;
				}

				default: {
					break;
				}
			}

			if (key.return) {
				setChatState(previous => ({
					...previous,
					isSelectionMode: false,
				}));
			}
		}
	});

	// Handle message click from ScrollView's onChildClick
	// Sets the selected message but stays out of selection mode so the user
	// can immediately type commands like :reply, :react, :unsend, :download.
	const handleMessageClick = useCallback(
		(index: number) => {
			if (chatState.messages.length > 0) {
				setChatState(previous => ({
					...previous,
					isSelectionMode: false,
					selectedMessageIndex: index,
				}));
			}
		},
		[chatState.messages.length],
	);

	const handleSearchChange = useCallback((value: string) => {
		setSearchQuery(value);
	}, []);

	const handleSearchSubmit = useCallback(
		(value: string) => {
			if (!client || value.trim().length === 0) {
				exitSearchMode();
				return;
			}
			// Selection will be handled by ThreadList's onSelect
		},
		[client, exitSearchMode],
	);

	const handleSendMessage = async (text: string) => {
		if (!client || !chatState.currentThread) return;

		const {
			isCommand,
			systemMessage: cmdSystemMessage,
			processedText,
		} = await parseAndDispatchChatCommand(text, {
			client,
			chatState,
			setChatState,
			height,
			scrollViewRef,
			onViewMediaShare: handleViewMediaShare,
		});

		if (cmdSystemMessage) {
			setSystemMessage(cmdSystemMessage);
		}

		if (isCommand) {
			return; // Command was handled, no message to send
		}

		try {
			// Use processedText if available (e.g., when '::' was stripped), otherwise use original text
			const textToProcess = processedText ?? text;
			const finalText = await preprocessMessage(textToProcess, {
				client,
				threadId: chatState.currentThread.id,
			});

			if (finalText) {
				const threadId = chatState.currentThread.id;
				setSendStatus('sending');
				const itemId = await client.sendMessage(threadId, finalText);
				setSendStatus('sent');

				// Optimistically show the sent message immediately. Without this it
				// only appears if realtime MQTT echoes it back — which is unreliable
				// (esp. on a resumed session), so sent messages could "disappear".
				const sentMessage: Message = {
					id: itemId || `local-${Date.now()}`,
					timestamp: new Date(),
					userId: 'me',
					username: 'me',
					isOutgoing: true,
					threadId,
					itemType: 'text',
					text: finalText,
					deliveryStatus: 'sent',
				};

				// Scroll to bottom after sending a message
				// Timeout to ensure message is rendered before scrolling
				const timeout = setTimeout(() => {
					if (scrollViewRef.current) {
						scrollViewRef.current.scrollToEnd(false);
					}
				}, 1000);

				// Append the placeholder, unless the realtime echo already added this
				// message (same id, or an outgoing text with identical content).
				setChatState(previous => {
					const alreadyShown = previous.messages.some(
						m =>
							m.id === sentMessage.id ||
							(m.isOutgoing &&
								m.itemType === 'text' &&
								m.text === sentMessage.text),
					);
					return {
						...previous,
						messages: alreadyShown
							? previous.messages
							: [...previous.messages, sentMessage],
						recipientAlreadyRead: false,
					};
				});

				return () => {
					clearTimeout(timeout);
				};
			}
		} catch (error) {
			setSendStatus('idle');
			const errorMessage =
				error instanceof Error ? error.message : 'Failed to send message';
			setSystemMessage(errorMessage);
		}

		return;
	};

	const handleOnScrollToBottom = () => {
		setSystemMessage('Scrolled to bottom');
	};

	const handleLoadMoreThreads = async () => {
		if (!chatState.hasMoreThreads || !client || chatState.loadingMoreThreads) {
			return;
		}

		setChatState(previous => ({...previous, loadingMoreThreads: true}));
		try {
			const {threads, hasMore} = await client.getThreads(true);
			setChatState(previous => ({
				...previous,
				threads: [...previous.threads, ...threads],
				loadingMoreThreads: false,
				hasMoreThreads: hasMore,
			}));
		} catch {
			setChatState(previous => ({...previous, loadingMoreThreads: false}));
			setSystemMessage('Failed to load more threads.');
		}
	};

	const handleOnScrollToTop = async () => {
		if (!chatState.messageCursor || !client || !chatState.currentThread) {
			return;
		}

		setChatState(previous => ({...previous, loading: true}));
		try {
			const {messages, cursor} = await client.getMessages(
				chatState.currentThread.id,
				chatState.messageCursor,
			);
			setChatState(previous => {
				const existingIds = new Set(previous.messages.map(m => m.id));
				const uniqueOlderMessages = messages.filter(
					m => !existingIds.has(m.id),
				);
				return {
					...previous,
					messages: [...uniqueOlderMessages, ...previous.messages],
					loading: false,
					messageCursor: cursor,
				};
			});
			setSystemMessage(`Loaded ${messages.length} more messages.`);
		} catch {
			setChatState(previous => ({...previous, loading: false}));
			setSystemMessage('Failed to load more messages.');
		}
	};

	const renderContent = () => {
		if (chatState.loading && chatState.threads.length === 0) {
			return (
				<Box
					flexGrow={1}
					justifyContent="center"
					alignItems="center"
					paddingY={1}
				>
					<Hint>Loading…</Hint>
				</Box>
			);
		}

		if (currentView === 'threads') {
			// Show search results when in search mode, otherwise show all threads
			const threadsToDisplay =
				searchMode && searchResults.length > 0
					? searchResults.map(r => r.thread)
					: chatState.threads;

			return (
				<Box flexDirection="column" flexGrow={1}>
					<ThreadList
						isSearchMode={Boolean(searchMode)}
						threads={threadsToDisplay}
						typingThreadIds={typingThreadIds}
						onScrollToBottom={searchMode ? undefined : handleLoadMoreThreads}
						onSelect={handleThreadSelect}
					/>
					{searchMode && (
						<SearchInput
							isSearching={isSearching}
							mode={searchMode}
							resultCount={searchResults.length}
							value={searchQuery}
							onCancel={exitSearchMode}
							onChange={handleSearchChange}
							onSubmit={handleSearchSubmit}
						/>
					)}
				</Box>
			);
		}

		return (
			<Box flexDirection="column" height="100%">
				{chatState.loading && chatState.messages.length === 0 ? (
					<Box
						flexGrow={1}
						justifyContent="center"
						alignItems="center"
						paddingY={1}
					>
						<Hint>Loading messages…</Hint>
					</Box>
				) : (
					<ScrollView
						ref={scrollViewRef}
						height={messageAreaHeight}
						initialScrollPosition="end"
						mouseScrollLines={3}
						width={width}
						onChildClick={handleMessageClick}
						onScrollToEnd={handleOnScrollToBottom}
						onScrollToStart={handleOnScrollToTop}
					>
						<MessageList
							currentThread={chatState.currentThread}
							messages={chatState.messages}
							selectedMessageIndex={chatState.selectedMessageIndex}
							recipientHasSeen={chatState.recipientAlreadyRead}
						/>
					</ScrollView>
				)}
				{chatState.recipientAlreadyRead && (
					<Box>
						<Text dimColor>Seen just now</Text>
					</Box>
				)}
				<Box flexDirection="column" flexShrink={0}>
					{chatState.currentThread &&
						typingThreadIds.includes(chatState.currentThread.id) && (
							<Box paddingX={1}>
								<TypingIndicator
									name={threadDisplayName(chatState.currentThread)}
								/>
							</Box>
						)}
					{systemMessage && (
						<Box marginTop={1}>
							<Text {...state.info}>{systemMessage}</Text>
						</Box>
					)}
					{sendStatus !== 'idle' && (
						<Box paddingX={1}>
							<SendStatus status={sendStatus} />
						</Box>
					)}
					<InputBox
						isDisabled={chatState.isSelectionMode}
						onSend={handleSendMessage}
					/>
				</Box>
			</Box>
		);
	};

	// Get the appropriate help text based on current state
	const getHelpText = () => {
		if (searchMode) {
			return 'Type to search, Enter: select first result, Esc: cancel';
		}

		if (currentView === 'threads') {
			return 'j/k: navigate, Enter: select, /: search by title, @: search by username, Esc: quit';
		}

		if (chatState.isSelectionMode) {
			return 'j/k: navigate messages, Enter: confirm, Esc: exit selection';
		}

		return 'Esc: back · PgUp/PgDn or Ctrl+U/D: scroll · Ctrl+C: clear';
	};

	if (viewingPost) {
		return (
			<TerminalInfoProvider>
				<SinglePostView
					post={viewingPost}
					protocol={imageProtocol}
					onClose={handleClosePostView}
				/>
			</TerminalInfoProvider>
		);
	}

	return (
		<FullScreen>
			<TerminalInfoProvider>
				<Box flexDirection="column" height="100%" width="100%">
					<StatusBar
						currentThread={chatState.currentThread}
						currentView={currentView}
						error={chatState.error}
						isLoading={chatState.loading}
						realtimeStatus={realtimeStatus}
						searchMode={searchMode}
						invisibleMode={chatState.invisibleMode}
					/>

					{newMessageAlerts.length > 0 && (
						<NotificationToast alerts={newMessageAlerts} />
					)}

					<Box flexDirection="column" flexGrow={1}>
						{renderContent()}
					</Box>

					<Box paddingX={1}>
						{currentView === 'threads' && chatState.loadingMoreThreads ? (
							<Hint>Loading more threads…</Hint>
						) : systemMessage ? (
							<Text {...state.info}>{systemMessage}</Text>
						) : (
							<Hint>{getHelpText()}</Hint>
						)}
					</Box>
				</Box>
			</TerminalInfoProvider>
		</FullScreen>
	);
}
