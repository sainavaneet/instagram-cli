import React, {useEffect, useState} from 'react';
import zod from 'zod';
import {option} from 'pastel';
import {Alert} from '@inkjs/ui';
import {saveWebSession} from '../utils/web-sender.js';

export const description =
	'Set up browser-based sending using your instagram.com web session (paste the sessionid cookie)';

export const options = zod.object({
	sessionid: zod.string().describe(
		option({
			alias: 's',
			description: 'Your instagram.com "sessionid" cookie value',
		}),
	),
	dsUserId: zod
		.string()
		.optional()
		.describe(
			option({
				description: 'Your "ds_user_id" cookie value (optional)',
			}),
		),
	csrftoken: zod
		.string()
		.optional()
		.describe(
			option({
				description: 'Your "csrftoken" cookie value (optional)',
			}),
		),
});

type Properties = {
	readonly options: zod.infer<typeof options>;
};

export default function WebLogin({options}: Properties) {
	const [message, setMessage] = useState('Saving web session…');
	const [variant, setVariant] = useState<'info' | 'success' | 'error'>('info');

	useEffect(() => {
		const run = async () => {
			try {
				await saveWebSession({
					sessionid: options.sessionid,
					dsUserId: options.dsUserId,
					csrftoken: options.csrftoken,
				});
				setVariant('success');
				setMessage(
					'Web session saved — your messages now send through the real browser.',
				);
			} catch (error) {
				setVariant('error');
				setMessage(
					error instanceof Error ? error.message : 'Failed to save web session',
				);
			}
		};

		void run();
	}, []);

	return <Alert variant={variant}>{message}</Alert>;
}
