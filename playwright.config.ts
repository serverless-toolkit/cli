import type { PlaywrightTestConfig } from '@playwright/test';

export default {
	fullyParallel: false,	
	use: {
		baseURL: 'http://localhost:4173'
	},
	webServer: {
		command: 'npm run preview',
		port: 4173,
		reuseExistingServer: !process.env.CI
	}
} as PlaywrightTestConfig;
