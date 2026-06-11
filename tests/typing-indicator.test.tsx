/* eslint-disable @typescript-eslint/no-unsafe-call */

import React from 'react';
import test from 'ava';
import {render} from 'ink-testing-library';
import TypingIndicator from '../source/ui/components/typing-indicator.js';

test('typing indicator shows who is typing', t => {
	const {lastFrame, unmount} = render(<TypingIndicator name="Bestie" />);
	const output = lastFrame() ?? '';
	t.true(output.includes('Bestie'), 'Should show the name');
	t.true(output.includes('is typing'), 'Should say "is typing"');
	unmount();
});
