import { defineConfig } from '@playwright/test';

const port = Number(process.env.PORT ?? 8788);

export default defineConfig({
	testDir: 'e2e',
	testMatch: '**/*.e2e.ts',
	timeout: 60_000,
	workers: 2,
	use: {
		baseURL: `http://127.0.0.1:${port}`,
		browserName: 'chromium'
	},
	webServer: {
		command: `npm run build && npx wrangler pages dev build --port ${port} --ip 127.0.0.1`,
		url: `http://127.0.0.1:${port}`,
		reuseExistingServer: true,
		timeout: 240_000
	}
});
