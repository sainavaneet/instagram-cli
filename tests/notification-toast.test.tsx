/* eslint-disable @typescript-eslint/no-unsafe-call */

import React from 'react';
import test from 'ava';
import {render} from 'ink-testing-library';
import NotificationToast from '../source/ui/components/notification-toast.js';

test('notification toast shows a single sender and preview', t => {
	const {lastFrame, unmount} = render(
		<NotificationToast
			alerts={[{from: 'Bestie', preview: 'hey are you free tonight?'}]}
		/>,
	);
	const output = lastFrame() ?? '';

	t.true(output.includes('New message'), 'Should announce a new message');
	t.true(output.includes('Bestie'), 'Should show the sender name');
	t.true(output.includes('hey are you free'), 'Should show a preview');
	unmount();
});

test('notification toast stacks multiple messages with a count', t => {
	const {lastFrame, unmount} = render(
		<NotificationToast
			alerts={[
				{from: 'Bestie', preview: 'hey'},
				{from: 'Bestie', preview: 'you there?'},
				{from: 'jamntrl', preview: 'yo'},
			]}
		/>,
	);
	const output = lastFrame() ?? '';

	t.true(output.includes('New messages (3)'), 'Should show the count');
	t.true(output.includes('you there?'), 'Should show the latest line');
	t.true(output.includes('jamntrl'), 'Should show all senders');
	unmount();
});

test('notification toast truncates long previews', t => {
	const {lastFrame, unmount} = render(
		<NotificationToast alerts={[{from: 'X', preview: 'x'.repeat(200)}]} />,
	);
	t.true((lastFrame() ?? '').includes('…'), 'Should truncate with an ellipsis');
	unmount();
});
