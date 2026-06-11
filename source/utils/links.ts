/**
 * Terminal hyperlink helpers (OSC 8). Terminals that support hyperlinks
 * (iTerm2, Kitty, WezTerm, etc.) render the label as a cmd/ctrl-clickable
 * link; terminals that don't simply show the plain label text.
 */

import type {Message} from '../types/instagram.js';

const ESC = String.fromCodePoint(27); // \x1B
const BEL = String.fromCodePoint(7); // \x07

/**
 * Return the browser-openable URL for a message, if it has one
 * (shared reels/posts and links). Returns undefined otherwise.
 */
export function getOpenableUrl(message: Message): string | undefined {
	if (message.itemType === 'xma') {
		return message.xma.url;
	}

	if (message.itemType === 'link') {
		return message.link.url;
	}

	return undefined;
}

/**
 * Wrap `label` in an OSC 8 hyperlink pointing at `url`.
 * ANSI-stripping width calculators ignore the escape codes, so Ink layout
 * stays correct.
 */
export function hyperlink(label: string, url: string): string {
	return `${ESC}]8;;${url}${BEL}${label}${ESC}]8;;${BEL}`;
}
