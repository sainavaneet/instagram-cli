import React, {useState} from 'react';
import {Box, Text} from 'ink';
import {accent, Divider, Hint, Label} from '../theme/index.js';
import TextInput from './text-input.js';

export default function LoginForm({
	onSubmit,
}: {
	readonly onSubmit: (username: string, password: string) => void;
}) {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [step, setStep] = useState<'username' | 'password'>('username');

	return (
		<Box flexDirection="column">
			<Label isAccent>Instagram Login</Label>
			<Divider />
			<Box marginTop={1}>
				<Hint>
					{step === 'username'
						? 'Enter your username and press Enter'
						: 'Enter your password and press Enter'}
				</Hint>
			</Box>
			<Box marginTop={1}>
				<Text {...accent.bold}>❯ </Text>
				{step === 'username' ? (
					<TextInput
						showCursor
						placeholder="Username"
						value={username}
						onChange={setUsername}
						onSubmit={() => {
							setStep('password');
						}}
					/>
				) : (
					<TextInput
						mask="*"
						placeholder="Password"
						value={password}
						onChange={setPassword}
						onSubmit={() => {
							onSubmit(username, password);
						}}
					/>
				)}
			</Box>
		</Box>
	);
}
