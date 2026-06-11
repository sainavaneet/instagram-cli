/**
 * Send DMs through a real headless browser driving instagram.com.
 *
 * Why: messages sent via the private mobile API get purged by Instagram's
 * anti-automation system, but messages sent through the real web client stick.
 * We reuse the user's web `sessionid` cookie (pasted from their logged-in
 * browser) so there's no login popup — fully headless.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
	chromium,
	type Browser,
	type BrowserContext,
	type Cookie,
} from 'playwright';
import {createContextualLogger} from './logger.js';

const logger = createContextualLogger('WebSender');

const STATE_PATH = path.join(
	os.homedir(),
	'.instagram-cli',
	'browser',
	'state.json',
);

const USER_AGENT =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function makeCookie(name: string, value: string): Cookie {
	return {
		name,
		value,
		domain: '.instagram.com',
		path: '/',
		expires: -1,
		httpOnly: true,
		secure: true,
		sameSite: 'Lax',
	};
}

/**
 * Persist the web session built from a pasted `sessionid` (and optionally
 * ds_user_id / csrftoken). Stored as a Playwright storageState.
 */
export async function saveWebSession(cookies: {
	sessionid: string;
	dsUserId?: string;
	csrftoken?: string;
}): Promise<void> {
	const jar: Cookie[] = [makeCookie('sessionid', cookies.sessionid)];
	if (cookies.dsUserId) {
		jar.push(makeCookie('ds_user_id', cookies.dsUserId));
	}

	if (cookies.csrftoken) {
		jar.push(makeCookie('csrftoken', cookies.csrftoken));
	}

	await fs.mkdir(path.dirname(STATE_PATH), {recursive: true, mode: 0o700});
	await fs.writeFile(STATE_PATH, JSON.stringify({cookies: jar, origins: []}), {
		mode: 0o600,
	});
}

export async function hasWebSession(): Promise<boolean> {
	try {
		await fs.access(STATE_PATH);
		return true;
	} catch {
		return false;
	}
}

let browser: Browser | undefined;
let context: BrowserContext | undefined;

async function getContext(): Promise<BrowserContext> {
	if (context) {
		return context;
	}

	browser = await chromium.launch({headless: true});
	context = await browser.newContext({
		storageState: STATE_PATH,
		userAgent: USER_AGENT,
		viewport: {width: 1280, height: 800},
	});
	return context;
}

const COMPOSER_SELECTORS = [
	'textarea[placeholder]',
	'div[contenteditable="true"][role="textbox"]',
	'[aria-label="Message"]',
	'div[aria-label="Message"]',
];

/**
 * Send `text` to a thread by opening its web DM page and typing into the
 * real composer. Throws on failure (caller surfaces the error).
 */
export async function sendViaBrowser(
	threadId: string,
	text: string,
): Promise<void> {
	const ctx = await getContext();
	const page = await ctx.newPage();
	try {
		await page.goto(`https://www.instagram.com/direct/t/${threadId}/`, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});

		// Guard: if Instagram bounced us to the login page, the session is bad.
		if (page.url().includes('/accounts/login')) {
			throw new Error('Web session invalid/expired — re-run `web-login`.');
		}

		const composer = page.locator(COMPOSER_SELECTORS.join(', ')).first();
		await composer.waitFor({state: 'visible', timeout: 20_000});
		await composer.click();
		await page.keyboard.type(text, {delay: 15});
		await page.keyboard.press('Enter');
		// Give the send a moment to flush before we close the page.
		await page.waitForTimeout(1500);
	} catch (error) {
		logger.error('Browser send failed', error);
		throw error;
	} finally {
		await page.close();
	}
}

export async function closeBrowser(): Promise<void> {
	try {
		await context?.close();
		await browser?.close();
	} finally {
		context = undefined;
		browser = undefined;
	}
}
