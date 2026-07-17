import React from 'react';
import {Box, Text, useInput} from 'ink';
import {accent, Divider, Hint} from '../theme/index.js';
import TextInput from './text-input.js';

type SearchMode = 'username' | 'title';

type SearchInputProps = {
	readonly mode: SearchMode;
	readonly value: string;
	readonly onChange: (value: string) => void;
	readonly onSubmit: (value: string) => void;
	readonly onCancel: () => void;
	readonly isSearching?: boolean;
	readonly resultCount?: number;
};

export default function SearchInput({
	mode,
	value,
	onChange,
	onSubmit,
	onCancel,
	isSearching = false,
	resultCount = 0,
}: SearchInputProps) {
	const placeholder =
		mode === 'username'
			? 'Enter username to search...'
			: 'Enter chat title to search...';

	const prefix = mode === 'username' ? '@' : '/';

	useInput((_input, key) => {
		if (key.escape) {
			onCancel();
		}
	});

	// Handle text input submit
	const handleSubmit = (submittedValue: string) => {
		if (submittedValue.trim()) {
			onSubmit(submittedValue.trim());
		}
	};

	return (
		<Box flexDirection="column" paddingX={1}>
			<Divider />
			<Box paddingTop={1}>
				<Text {...accent.bold}>{prefix} </Text>
				<TextInput
					showCursor
					placeholder={placeholder}
					value={value}
					onChange={onChange}
					onSubmit={handleSubmit}
				/>
				{isSearching && <Hint> Searching...</Hint>}
				{!isSearching && value.length > 0 && (
					<Hint>
						{' '}
						({resultCount} result{resultCount === 1 ? '' : 's'})
					</Hint>
				)}
			</Box>
		</Box>
	);
}
