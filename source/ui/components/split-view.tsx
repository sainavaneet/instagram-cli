import React from 'react';
import {Box} from 'ink';
import {Divider, Hint, Label} from '../theme/index.js';
import AltScreen from './alt-screen.js';
import FullScreen from './full-screen.js';

type Properties = {
	readonly sidebarTitle: string;
	readonly sidebarContent: React.ReactNode;
	readonly mainContent: React.ReactNode;
	readonly footerText: string;
	readonly sidebarWidth?: number;
};

export default function SplitView({
	sidebarTitle,
	sidebarContent,
	mainContent,
	footerText,
	sidebarWidth = 30,
}: Properties) {
	return (
		<AltScreen>
			<FullScreen>
				<Box flexDirection="column" height="100%" width="100%">
					<Box flexDirection="row" gap={2} flexGrow={1}>
						{/* Sidebar — separated from main by a single dim vertical rule */}
						<Box
							borderRight
							borderDimColor
							flexDirection="column"
							borderStyle="single"
							borderTop={false}
							borderBottom={false}
							borderLeft={false}
							paddingX={1}
							width={sidebarWidth}
							flexShrink={0}
							height="100%"
							overflow="hidden"
						>
							<Label isAccent>{sidebarTitle}</Label>
							<Divider />
							<Box flexDirection="column" flexGrow={1} overflow="hidden">
								{sidebarContent}
							</Box>
						</Box>

						{/* Main Content */}
						<Box
							flexDirection="column"
							paddingX={1}
							flexGrow={1}
							height="100%"
							overflow="hidden"
						>
							{mainContent}
						</Box>
					</Box>

					{/* Footer */}
					<Box marginTop={1} paddingX={1}>
						<Hint>{footerText}</Hint>
					</Box>
				</Box>
			</FullScreen>
		</AltScreen>
	);
}
