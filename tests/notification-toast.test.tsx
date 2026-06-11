/* eslint-disable @typescript-eslint/no-unsafe-call */

import React from 'react';
import test from 'ava';
import {render} from 'ink-testing-library';
import NotificationToast from '../source/ui/components/notification-toast.js';

test('notification toast shows the sender and preview', t => {
	const {lastFrame, unmount} = render(
		<NotificationToast from="Bestie" preview="hey are you free tonight?" />,
	);
	const output = lastFrame() ?? '';

	t.true(output.includes('New message'), 'Should announce a new message');
	t.true(output.includes('Bestie'), 'Should show the sender name');
	t.true(output.includes('hey are you free'), 'Should show a preview');
	unmount();
});

test('notification toast truncates long previews', t => {
	const longPreview = 'x'.repeat(200);
	const {lastFrame, unmount} = render(
		<NotificationToast from="Someone" preview={longPreview} />,
	);
	const output = lastFrame() ?? '';

	t.true(output.includes('…'), 'Should truncate with an ellipsis');
	unmount();
});
