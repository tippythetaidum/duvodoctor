import { expect, test } from '@playwright/test';
import catalog from '../src/data/signatures.json' with { type: 'json' };

const pages = ['/', '/issues', '/logs', '/requirements', '/about', '/404', ...catalog.signatures.map((s) => `/issues/${s.id}`)];

for (const path of pages) {
	test(`${path} carries the disclaimer and no logo`, async ({ page }) => {
		await page.goto(path);
		await expect(page.locator('footer.site-foot')).toContainText(
			'Unofficial fan tool. Not affiliated with or endorsed by Luduvo Corporation.'
		);
		expect(await page.locator('img, picture, image').count()).toBe(0);
		const external = await page.evaluate(() =>
			performance
				.getEntriesByType('resource')
				.map((e) => e.name)
				.filter((n) => !n.startsWith(location.origin))
		);
		expect(external).toEqual([]);
	});
}

test('unknown paths get the 404 page with a 404 status', async ({ page }) => {
	const response = await page.goto('/no-such-page');
	expect(response?.status()).toBe(404);
	await expect(page.locator('h1')).toHaveText("This page isn't here");
});
