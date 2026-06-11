#!/usr/bin/env node
/**
 * Bridge an existing instagrapi (igdm) session into this tool's
 * instagram-private-api session format — so we resume an already-authenticated
 * session instead of performing a fresh login (which Instagram soft-blocks).
 *
 * Usage:  node scripts/import-igdm-session.mjs <username> [path-to-igdm-session.json]
 *
 * It does NOT contact Instagram. It only builds a local session file at
 * ~/.instagram-cli/users/<username>/session.ts.json and prints the next step.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {IgApiClient} from 'instagram-private-api';

const username = process.argv[2];
if (!username) {
	console.error(
		'Usage: node scripts/import-igdm-session.mjs <username> [igdm-session.json]',
	);
	process.exit(1);
}

const igdmPath =
	process.argv[3] ?? path.join(os.homedir(), '.config/igdm/session.json');

if (!fs.existsSync(igdmPath)) {
	console.error(`igdm session not found at: ${igdmPath}`);
	process.exit(1);
}

const src = JSON.parse(fs.readFileSync(igdmPath, 'utf8'));
const auth = src.authorization_data ?? {};
if (!auth.sessionid || !auth.ds_user_id) {
	console.error('igdm session is missing authorization_data.sessionid/ds_user_id');
	process.exit(1);
}

const ig = new IgApiClient();
// Stable device derived from the username seed (same seed loginBySession uses).
ig.state.generateDevice(username);

// Primary auth: the Bearer header, reconstructed exactly like instagrapi does
// (base64 of {ds_user_id, sessionid}). This is what authenticated igdm.
const bearerPayload = JSON.stringify({
	ds_user_id: String(auth.ds_user_id),
	sessionid: auth.sessionid,
});
ig.state.authorization = `Bearer IGT:2:${Buffer.from(bearerPayload).toString('base64')}`;

if (src.ig_www_claim) {
	ig.state.igWWWClaim = src.ig_www_claim;
}

// Mirror the token into cookies too (belt and suspenders for endpoints that
// still read cookies). csrftoken is intentionally left for Instagram to issue
// on the first response.
const cookieUrl = 'https://i.instagram.com';
const setCookie = (kv) => {
	ig.state.cookieJar.setCookie(
		`${kv}; Domain=.instagram.com; Path=/; Secure; HttpOnly`,
		cookieUrl,
	);
};

setCookie(`sessionid=${auth.sessionid}`);
setCookie(`ds_user_id=${auth.ds_user_id}`);
if (src.mid) setCookie(`mid=${src.mid}`);
if (src.ig_u_rur) setCookie(`rur=${src.ig_u_rur}`);

const serialized = await ig.state.serialize();
delete serialized.constants; // matches SessionManager.saveSession behavior

const dir = path.join(os.homedir(), '.instagram-cli', 'users', username);
fs.mkdirSync(dir, {recursive: true, mode: 0o700});
const sessionPath = path.join(dir, 'session.ts.json');
fs.writeFileSync(sessionPath, JSON.stringify(serialized, null, 2), {mode: 0o600});

console.log(`✓ Wrote session for @${username}`);
console.log(`  ${sessionPath}`);
console.log('');
console.log('Next:');
console.log(`  node dist/cli.js config login.currentUsername ${username}`);
console.log(`  node dist/cli.js config login.defaultUsername ${username}`);
console.log('  node dist/cli.js chat        # resumes the session, no login');
