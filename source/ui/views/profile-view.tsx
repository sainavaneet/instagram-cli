import React from 'react';
import {Box, Text} from 'ink';
import Image from 'ink-picture';
import type {ProfileInfo} from '../../types/instagram.js';
import {accent, Divider, glyphs, state} from '../theme/index.js';

type Props = {
	readonly profile: ProfileInfo;
	readonly imageProtocol?: string;
};

function formatCount(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
	if (n >= 10_000) return `${(n / 1000).toFixed(1)}k`;
	if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
	return n.toString();
}

export default function ProfileView({profile, imageProtocol}: Props) {
	return (
		<Box flexDirection="row" padding={1} gap={2}>
			{/* Left: profile picture */}
			{profile.profilePicUrl && imageProtocol ? (
				<Box
					borderDimColor
					width={24}
					height={12}
					flexShrink={0}
					borderStyle="single"
				>
					<Image
						src={profile.profilePicUrl}
						alt={profile.username}
						width={22}
						height={10}
					/>
				</Box>
			) : (
				<Box
					borderDimColor
					width={24}
					height={12}
					flexShrink={0}
					borderStyle="single"
					alignItems="center"
					justifyContent="center"
				>
					<Text dimColor>no image</Text>
				</Box>
			)}

			{/* Right: profile info */}
			<Box flexDirection="column" flexGrow={1}>
				<Box gap={1}>
					<Text {...accent.bold}>@{profile.username}</Text>
					{profile.isVerified && <Text {...accent.solid}>{glyphs.check}</Text>}
					{profile.isPrivate && <Text dimColor>{glyphs.lock}</Text>}
				</Box>

				{profile.fullName.length > 0 && <Text>{profile.fullName}</Text>}

				<Divider width={40} />

				<Box gap={3} marginTop={1}>
					<Box flexDirection="column" alignItems="center">
						<Text bold>{formatCount(profile.mediaCount)}</Text>
						<Text dimColor>posts</Text>
					</Box>
					<Box flexDirection="column" alignItems="center">
						<Text bold>{formatCount(profile.followerCount)}</Text>
						<Text dimColor>followers</Text>
					</Box>
					<Box flexDirection="column" alignItems="center">
						<Text bold>{formatCount(profile.followingCount)}</Text>
						<Text dimColor>following</Text>
					</Box>
				</Box>

				{profile.biography.length > 0 && (
					<Box marginTop={1} flexDirection="column">
						<Divider width={40} />
						<Text wrap="wrap">{profile.biography}</Text>
					</Box>
				)}

				{profile.externalUrl && (
					<Box marginTop={1}>
						<Text {...state.info}>{profile.externalUrl}</Text>
					</Box>
				)}
			</Box>
		</Box>
	);
}
