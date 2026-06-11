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

test('outgoing messages are labeled "me", not "You"', t => {
	const outgoing = mockMessages.find(m => m.isOutgoing)!;

	const {lastFrame, unmount} = render(<MessageList messages={[outgoing]} />);
	const output = lastFrame() ?? '';

	t.true(output.includes('me'), 'Outgoing label should be "me"');
	t.false(output.includes('You'), 'Should not use the old "You" label');
	unmount();
});
