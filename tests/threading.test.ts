/* eslint-disable @typescript-eslint/no-unsafe-call */

import test from 'ava';
import {generateOfflineThreadingId} from '../source/utils/threading.js';

test('generateOfflineThreadingId returns a numeric string', t => {
	const id = generateOfflineThreadingId();
	t.regex(id, /^\d+$/, 'Should be digits only');
	t.true(id.length > 10, 'Should be a large id');
});

test('generateOfflineThreadingId is unique across calls', t => {
	const ids = new Set(
		Array.from({length: 50}, () => generateOfflineThreadingId()),
	);
	t.is(ids.size, 50, 'All generated ids should be unique');
});
