import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { drop, openDoctor } from './helpers.ts';

const pages = ['/', '/issues', '/issues/amd-amdvlk-crash', '/issues/razor-walks-noise', '/logs', '/requirements', '/about', '/404'];

for (const scheme of ['light', 'dark'] as const) {
	test.describe(`${scheme} mode`, () => {
		test.use({ colorScheme: scheme });

		for (const path of pages) {
			test(`${path} has no accessibility violations`, async ({ page }) => {
				await page.goto(path);
				const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
				expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
			});
		}

		test('the results view has no accessibility violations', async ({ page }) => {
			await openDoctor(page);
			await drop(page, 'forum/2616-38');
			const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
			expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
		});
	});
}

test.describe('at 360 px wide', () => {
	test.use({ viewport: { width: 360, height: 740 } });

	for (const path of pages) {
		test(`${path} fits without sideways scrolling`, async ({ page }) => {
			await page.goto(path);
			const width = await page.evaluate(() => document.documentElement.scrollWidth);
			expect(width).toBeLessThanOrEqual(360);
		});
	}

	test('the results view fits', async ({ page }) => {
		await openDoctor(page);
		await drop(page, 'forum/3759-4');
		const width = await page.evaluate(() => document.documentElement.scrollWidth);
		expect(width).toBeLessThanOrEqual(360);
	});
});

test('works with the keyboard alone', async ({ page }) => {
	await page.goto('/');
	await page.keyboard.press('Tab');
	await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
	await page.keyboard.press('Enter');

	const paste = page.getByText('Paste the text instead');
	for (let i = 0; i < 20 && !(await paste.evaluate((el) => el === document.activeElement)); i++) {
		await page.keyboard.press('Tab');
	}
	await expect(paste).toBeFocused();
	await page.keyboard.press('Enter');
	await page.keyboard.press('Tab');
	await expect(page.locator('#paste-box')).toBeFocused();
	await page.keyboard.insertText(
		[
			'2026-09-15 - 18:15:13.583 [WARNING] [adapter 0] Intel(R) UHD Graphics skipped: Intel Comet Lake (10th gen) has a non-conformant Vulkan 1.3 driver that crashes at runtime (set LDV_VK_SKIP_BLOCKLIST=1 to override)',
			'2026-09-15 - 18:15:14.078 [ERROR] [nvrhi] Failed to create a compute pipeline state object',
			'2026-09-15 - 18:15:14.079 [ERROR] ClusteredForward: failed to create build-grid pipeline'
		].join('\n')
	);
	await page.keyboard.press('Tab');
	await expect(page.getByRole('button', { name: 'Check this text' })).toBeFocused();
	await page.keyboard.press('Enter');
	await page.locator('#verdict').waitFor();

	const show = page.getByRole('button', { name: /Show the (line|\d+ lines) in your log/ }).first();
	for (let i = 0; i < 40 && !(await show.evaluate((el) => el === document.activeElement)); i++) {
		await page.keyboard.press('Tab');
	}
	await expect(show).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(page.locator('.xray .row:focus')).toContainText('non-conformant');

	const copy = page.getByRole('button', { name: 'Copy for the forum' });
	for (let i = 0; i < 60 && !(await copy.evaluate((el) => el === document.activeElement)); i++) {
		await page.keyboard.press('Tab');
	}
	await expect(copy).toBeFocused();
});
