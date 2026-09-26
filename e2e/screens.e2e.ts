import { test } from '@playwright/test';
import { drop, openDoctor } from './helpers.ts';

const out = 'test-results/screens';

for (const scheme of ['light', 'dark'] as const) {
	for (const width of [1280, 360]) {
		test.describe(`${scheme} ${width}`, () => {
			test.use({ colorScheme: scheme, viewport: { width, height: width === 360 ? 780 : 900 } });

			test('empty state', async ({ page }) => {
				await openDoctor(page);
				await page.screenshot({ path: `${out}/${scheme}-${width}-empty.png`, fullPage: true });
			});

			for (const [name, dir] of [
				['chain', 'forum/2616-38'],
				['partial', 'forum/3221-12'],
				['healthy', 'joe/healthy-session'],
				['unknown', 'synthetic/xss']
			] as const) {
				test(`results ${name}`, async ({ page }) => {
					await openDoctor(page);
					await drop(page, dir);
					await page.screenshot({ path: `${out}/${scheme}-${width}-${name}.png`, fullPage: true });
				});
			}

			for (const path of ['/issues', '/logs', '/about', '/404']) {
				test(`page ${path}`, async ({ page }) => {
					await page.goto(path);
					await page.screenshot({ path: `${out}/${scheme}-${width}-${path.slice(1)}.png`, fullPage: true });
				});
			}
		});
	}
}
