/* eslint-disable @typescript-eslint/no-unsafe-call */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'ava';
import {
	chatCommands,
	type ChatCommandContext,
} from '../source/utils/chat-commands.js';
import {mockClient} from '../source/mocks/mock-client.js';
import {ConfigManager} from '../source/config.js';
import type {ChatState} from '../source/types/instagram.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockThread = {
	id: 'thread_1',
	title: 'Test Thread',
	users: [],
	lastActivity: new Date(),
	unread: false,
};

function makeContext(overrides?: Partial<ChatState>): ChatCommandContext {
	return {
		client: mockClient,
		chatState: {
			messages: [],
			currentThread: mockThread,
			isSelectionMode: false,
			selectedMessageIndex: undefined,
			threads: [mockThread],
			loading: false,
			recipientAlreadyRead: false,
			invisibleMode: false,
			...overrides,
		},
		setChatState() {},
		height: 24,
		scrollViewRef: {current: undefined},
	};
}

// ── :upload command ───────────────────────────────────────────────────────────

const uploadHandler = chatCommands['upload']!.handler;

test(':upload with plain path (no spaces) uploads image', async t => {
	const result = await uploadHandler(['Desktop/photo.jpg'], makeContext());
	t.is(result, 'Image uploaded: Desktop/photo.jpg');
});

test(':upload with spaced path uploads image', async t => {
	// Simulates: ":upload Desktop/test 1.png"
	// The command parser splits on whitespace, so arguments_ = ['Desktop/test', '1.png']
	const result = await uploadHandler(['Desktop/test', '1.png'], makeContext());
	t.is(result, 'Image uploaded: Desktop/test 1.png');
});

test(':upload with double-quoted path strips quotes and uploads', async t => {
	const result = await uploadHandler(['"Desktop/my photo.jpg"'], makeContext());
	t.is(result, 'Image uploaded: Desktop/my photo.jpg');
});

test(':upload with single-quoted path strips quotes and uploads', async t => {
	const result = await uploadHandler(["'Desktop/my photo.jpg'"], makeContext());
	t.is(result, 'Image uploaded: Desktop/my photo.jpg');
});

test(':upload with #-prefixed path strips hash and uploads', async t => {
	// Autocomplete inserts a '#' prefix
	const result = await uploadHandler(['#Desktop/photo.png'], makeContext());
	t.is(result, 'Image uploaded: Desktop/photo.png');
});

test(':upload with video extension uploads video', async t => {
	const result = await uploadHandler(['Desktop/clip.mp4'], makeContext());
	t.is(result, 'Video uploaded: Desktop/clip.mp4');
});

test(':upload with unsupported extension returns error', async t => {
	const result = await uploadHandler(['Desktop/document.pdf'], makeContext());
	t.is(result, 'Unsupported file type. Please upload an image or video.');
});

test(':upload with no arguments returns usage hint', async t => {
	const result = await uploadHandler([], makeContext());
	t.is(result, 'Usage: :upload <path-to-file>');
});

test(':upload without active thread returns undefined', async t => {
	const result = await uploadHandler(
		['photo.jpg'],
		makeContext({currentThread: undefined}),
	);
	t.is(result, undefined);
});

// ── :ghost command (read-receipt toggle) ──────────────────────────────────────

const ghostHandler = chatCommands['ghost']!.handler;

test(':ghost toggles silent read and persists to config', async t => {
	// Back up the real config file so this test never permanently changes it.
	const configPath = path.join(
		os.homedir(),
		'.instagram-cli',
		'config.ts.yaml',
	);
	const backup = fs.existsSync(configPath)
		? fs.readFileSync(configPath, 'utf8')
		: undefined;

	const config = ConfigManager.getInstance();
	// Load the real config first so set() round-trips without clobbering keys.
	await config.initialize();

	try {
		// OFF -> ON
		const onResult = await ghostHandler(
			[],
			makeContext({invisibleMode: false}),
		);
		t.true(
			typeof onResult === 'string' && onResult.includes('ON'),
			'Should report silent mode ON',
		);
		t.true(
			config.get<boolean>('privacy.invisibleMode', false),
			'Should persist invisibleMode=true',
		);

		// ON -> OFF
		const offResult = await ghostHandler(
			[],
			makeContext({invisibleMode: true}),
		);
		t.true(
			typeof offResult === 'string' && offResult.includes('OFF'),
			'Should report silent mode OFF',
		);
		t.false(
			config.get<boolean>('privacy.invisibleMode', false),
			'Should persist invisibleMode=false',
		);
	} finally {
		// Restore the user's real config file byte-for-byte.
		if (backup === undefined) {
			if (fs.existsSync(configPath)) {
				fs.unlinkSync(configPath);
			}
		} else {
			fs.writeFileSync(configPath, backup, 'utf8');
		}
	}
});
