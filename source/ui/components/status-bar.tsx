import React from 'react';
import {Box, Text} from 'ink';
import type {Thread} from '../../types/instagram.js';
import type {RealtimeStatus} from '../../client.js';
import {threadDisplayName} from '../../utils/aliases.js';
import {accent, glyphs, Hint, StatusDot, state} from '../theme/index.js';

type StatusBarProperties = {
	readonly isLoading: boolean;
	readonly error?: string;
	readonly currentView: 'threads' | 'chat';
	readonly currentThread?: Thread;
	readonly realtimeStatus: RealtimeStatus;
	readonly searchMode?: 'username' | 'title';
	readonly invisibleMode?: boolean;
};

export default function StatusBar({
	isLoading,
	error,
	currentView,
	currentThread,
	realtimeStatus,
	searchMode,
	invisibleMode,
}: StatusBarProperties) {
	const getRealtimeIndicator = () => {
		switch (realtimeStatus) {
			case 'connected': {
				return (
					<Text>
						{' '}
						<StatusDot tone="success" /> <Text dimColor>Live</Text>
					</Text>
				);
			}

			case 'connecting': {
				return (
					<Text>
						{' '}
						<StatusDot tone="warning" /> <Text dimColor>Connecting…</Text>
					</Text>
				);
			}

			case 'disconnected': {
				return (
					<Text>
						{' '}
						<StatusDot hollow tone="muted" /> <Text dimColor>Offline</Text>
					</Text>
				);
			}

			case 'error': {
				return (
					<Text>
						{' '}
						<StatusDot tone="error" /> <Text dimColor>Error</Text>
					</Text>
				);
			}

			default: {
				return null;
			}
		}
	};

	const getSearchModeIndicator = () => {
		if (!searchMode) return null;

		const modeText =
			searchMode === 'username' ? 'Search @username' : 'Search title';
		return <Hint> · {modeText}</Hint>;
	};

	const getSeenModeIndicator = () => {
		if (currentView !== 'chat') return null;
		return invisibleMode ? <Hint> · Silent</Hint> : <Hint> · Seen-on</Hint>;
	};

	return (
		<Box paddingX={1} justifyContent="space-between" width="100%">
			<Box>
				<Text {...accent.bold}>InstagramCLI</Text>
				{getRealtimeIndicator()}
				{getSearchModeIndicator()}
				{getSeenModeIndicator()}
				{currentView === 'chat' && currentThread && (
					<Hint>
						{' '}
						{glyphs.caret} {threadDisplayName(currentThread)}
					</Hint>
				)}
			</Box>

			<Box>
				{isLoading && <Hint>Loading…</Hint>}
				{error && <Text {...state.error}>Error</Text>}
				{!isLoading && !error && (
					<Hint>
						{currentView === 'threads'
							? searchMode
								? 'Search'
								: 'Threads'
							: 'Chat'}
					</Hint>
				)}
			</Box>
		</Box>
	);
}
