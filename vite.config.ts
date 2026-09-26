import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig(({ command }) => ({
	plugins: [
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({ strict: true }),
			csp: {
				mode: 'hash',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					'style-src': ['self'],
					'img-src': ['self', 'data:'],
					'font-src': ['self'],
					'worker-src': ['self'],
					// the dev server needs its websocket for hot reload; production allows nothing
					'connect-src': command === 'serve' ? ['self', 'ws:'] : ['none'],
					'object-src': ['none'],
					'base-uri': ['none'],
					'form-action': ['none']
				}
			},
			prerender: {
				handleHttpError: 'fail',
				handleMissingId: 'fail'
			}
		})
	],
	worker: {
		format: 'es'
	},
	test: {
		expect: { requireAssertions: true },
		environment: 'node',
		include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
		testTimeout: 30000
	}
}));
