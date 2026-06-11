/**
 * Generate a time-based "offline threading id" the way the Instagram app does:
 * a 63-bit value with the current millisecond timestamp in the high bits and
 * random low bits. Instagram uses this for DM idempotency/ordering — sending
 * without it (or reusing one) causes messages to be dropped/deduped.
 */
export function generateOfflineThreadingId(): string {
	const timestampBits = Date.now().toString(2);
	let randomBits = '';
	for (let i = 0; i < 22; i++) {
		randomBits += Math.floor(Math.random() * 2).toString();
	}

	const bits = (timestampBits + randomBits).slice(0, 63);
	return BigInt(`0b${bits}`).toString();
}
