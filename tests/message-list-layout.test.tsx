/* eslint-disable @typescript-eslint/no-unsafe-call */

import React from 'react';
import test from 'ava';
import {render} from 'ink-testing-library';
import MessageList from '../source/ui/components/message-list.js';
import {mockMessages} from '../source/mocks/mock-data.js';

const DATE_PATTERN = /(?:\d{2}\/){2}\d{4}/; // old dd/mm/yyyy format
const TIME_PATTERN = /\d{1,2}:\d{2}/; // HH:MM

test('single-line layout renders "name: text" with HH:MM time', t => {
	// An incoming text message with no repliedTo -> single-line branch.
	const incoming = mockMessages.find(
		m => m.itemType === 'text' && !m.isOutgoing && !m.repliedTo,
	)!;
	const expectedText = incoming.text ?? '';

	const {lastFrame, unmount} = render(<MessageList messages={[incoming]} />);
	const output = lastFrame() ?? '';

	t.true(
		output.includes(`${incoming.username}:`),
		'Should prefix the message with "username:"',
	);
	t.true(output.includes(expectedText), 'Should render the message text');
	t.regex(output, TIME_PATTERN, 'Should show an HH:MM timestamp');
	t.notRegex(output, DATE_PATTERN, 'Should NOT show the old dd/mm/yyyy date');
	unmount();
});

test('xma (shared reel) renders an openable row with the author', t => {
	const xmaMessage = {
		id: 'x1',
		timestamp: new Date(),
		userId: '2',
		username: 'oakberrybowl',
		isOutgoing: false,
		threadId: 't1',
		itemType: 'xma' as const,
		xma: {
			url: 'https://www.instagram.com/reel/ABC123/',
			author: 'abe.aintlinkin',
			kind: 'clip',
		},
	};

	const {lastFrame, unmount} = render(<MessageList messages={[xmaMessage]} />);
	const output = lastFrame() ?? '';

	t.true(output.includes('Reel by @abe.aintlinkin'), 'Shows the reel author');
	t.true(output.includes('browser'), 'Shows the open-in-browser hint');
	unmount();
});

test('outgoing messages are labeled "me", not "You"', t => {
	const outgoing = mockMessages.find(m => m.isOutgoing)!;

	const {lastFrame, unmount} = render(<MessageList messages={[outgoing]} />);
	const output = lastFrame() ?? '';

	t.true(output.includes('me'), 'Outgoing label should be "me"');
	t.false(output.includes('You'), 'Should not use the old "You" label');
	unmount();
});

const outgoingText = (deliveryStatus?: 'sent' | 'delivered' | 'read') => ({
	id: 'o1',
	timestamp: new Date(),
	userId: 'me',
	username: 'me',
	isOutgoing: true,
	threadId: 't1',
	itemType: 'text' as const,
	text: 'hello there',
	deliveryStatus,
});

test('outgoing "sent" message shows a single tick', t => {
	const {lastFrame, unmount} = render(
		<MessageList messages={[outgoingText('sent')]} recipientHasSeen={false} />,
	);
	const output = lastFrame() ?? '';
	t.true(output.includes('✓'), 'Should show a tick');
	t.false(output.includes('✓✓'), 'Sent should be a single tick, not double');
	unmount();
});

test('outgoing delivered (not seen) shows double ticks', t => {
	const {lastFrame, unmount} = render(
		<MessageList messages={[outgoingText()]} recipientHasSeen={false} />,
	);
	t.true(
		(lastFrame() ?? '').includes('✓✓'),
		'Delivered should be double ticks',
	);
	unmount();
});

test('outgoing message shows double ticks when recipient has seen', t => {
	const {lastFrame, unmount} = render(
		<MessageList recipientHasSeen messages={[outgoingText('sent')]} />,
	);
	t.true((lastFrame() ?? '').includes('✓✓'), 'Read should be double ticks');
	unmount();
});

test('incoming messages have no delivery ticks', t => {
	const incoming = {
		id: 'i1',
		timestamp: new Date(),
		userId: '2',
		username: 'oakberrybowl',
		isOutgoing: false,
		threadId: 't1',
		itemType: 'text' as const,
		text: 'hi back',
	};
	const {lastFrame, unmount} = render(
		<MessageList recipientHasSeen messages={[incoming]} />,
	);
	t.false((lastFrame() ?? '').includes('✓'), 'Incoming should have no ticks');
	unmount();
});
