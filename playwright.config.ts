import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: 'e2e',
	testMatch: '**/*.e2e.ts',
	timeout: 60_000,
	workers: 2,
	use: {
		baseURL: 'http://127.0.0.1:8788',
		browserName: 'chromium'
	},
	webServer: {
		command: 'npm run build && npx wrangler pages dev build --port 8788 --ip 127.0.0.1',
		url: 'http://127.0.0.1:8788',
		reuseExistingServer: true,
		timeout: 240_000
	}
});
