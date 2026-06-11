/**
 * Per-person custom display names ("aliases"), keyed by Instagram username and
 * stored in config. Usernames can contain dots, so we read/write the whole
 * `aliases` object rather than using dot-path config keys.
 */
import {ConfigManager} from '../config.js';
import type {Thread} from '../types/instagram.js';

function getAliasMap(): Record<string, string> {
	return ConfigManager.getInstance().get<Record<string, string>>('aliases', {});
}

/** Return the custom name for a username, or the username itself if none. */
export function applyAlias(username: string): string {
	return getAliasMap()[username] ?? username;
}

/**
 * Display name for a thread: the other person's alias for a 1:1 chat,
 * otherwise the thread's own title (groups keep their title).
 */
export function threadDisplayName(thread: Thread): string {
	const me = ConfigManager.getInstance().get('login.currentUsername', '');
	const others = thread.users.filter(u => u.username && u.username !== me);
	if (others.length === 1 && others[0]) {
		return applyAlias(others[0].username);
	}

	return thread.title;
}

/** Set (or overwrite) the custom name for a username. */
export async function setAlias(username: string, name: string): Promise<void> {
	const next = {...getAliasMap(), [username]: name};
	await ConfigManager.getInstance().set('aliases', next);
}

/** Remove the custom name for a username. */
export async function removeAlias(username: string): Promise<void> {
	const next = Object.fromEntries(
		Object.entries(getAliasMap()).filter(([key]) => key !== username),
	);
	await ConfigManager.getInstance().set('aliases', next);
}
