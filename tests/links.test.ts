/* eslint-disable @typescript-eslint/no-unsafe-call */

import test from 'ava';
import {hyperlink, getOpenableUrl} from '../source/utils/links.js';
import type {Message} from '../source/types/instagram.js';

const ESC = String.fromCodePoint(27);
const BEL = String.fromCodePoint(7);

const base = {
	id: 'm1',
	timestamp: new Date(),
	userId: '2',
	username: 'someone',
	isOutgoing: false,
	threadId: 't1',
};

test('hyperlink wraps the label in an OSC 8 escape with the url', t => {
	const out = hyperlink('watch', 'https://example.com/x');
	t.is(out, `${ESC}]8;;https://example.com/x${BEL}watch${ESC}]8;;${BEL}`);
	// The visible label text is still present for non-supporting terminals.
	t.true(out.includes('watch'));
});

test('getOpenableUrl returns the url for an xma message', t => {
	const message: Message = {
		...base,
		itemType: 'xma',
		xma: {url: 'https://www.instagram.com/reel/ABC/', kind: 'clip'},
	};
	t.is(getOpenableUrl(message), 'https://www.instagram.com/reel/ABC/');
});

test('getOpenableUrl returns the url for a link message', t => {
	const message: Message = {
		...base,
		itemType: 'link',
		link: {text: 'site', url: 'https://example.com'},
	};
	t.is(getOpenableUrl(message), 'https://example.com');
});

test('getOpenableUrl returns undefined for a plain text message', t => {
	const message: Message = {...base, itemType: 'text', text: 'hi'};
	t.is(getOpenableUrl(message), undefined);
});
