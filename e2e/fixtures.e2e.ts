import { expect, test } from '@playwright/test';
import { diagnosisIds, drop, index, openDoctor } from './helpers.ts';

const verdictText: Record<string, RegExp> = {
	healthy: /Nothing's wrong in these logs/,
	unknown: /I don't recognise this one yet/,
	empty: /nothing I can read/,
	inconclusive: /log stops early/
};

for (const c of index.cases) {
	test(`shows the right diagnosis for ${c.dir}`, async ({ page }) => {
		await openDoctor(page);
		await drop(page, c.dir);
		const ids = await diagnosisIds(page);
		expect(ids).toEqual(c.expect.map((id) => id.replace(/~$/, '')));
		if (c.verdict && verdictText[c.verdict]) {
			await expect(page.locator('#verdict')).toHaveText(verdictText[c.verdict]);
		}
	});
}

test('jumps to the evidence when you ask to see it', async ({ page }) => {
	await openDoctor(page);
	await drop(page, 'forum/3314-1');
	await page.getByRole('button', { name: /Show the (line|\d+ lines) in your log/ }).first().click();
	const focused = page.locator('.xray .row:focus');
	await expect(focused).toHaveClass(/evidence/);
	await expect(focused).toContainText('non-conformant Vulkan 1.3 driver');
});

test('folds harmless noise and unfolds it on request', async ({ page }) => {
	await openDoctor(page);
	await drop(page, 'joe/healthy-session');
	await expect(page.locator('.xray .stats')).toContainText('534 harmless lines folded');
	await expect(page.locator('.xray .row', { hasText: 'texel walks truncated' })).toHaveCount(0);
	await page.locator('.xray .viewport').evaluate((el) => (el.scrollTop = 40 * 24));
	const fold = page.getByRole('button', { name: /Razor shadow warnings, folded/ }).first();
	await fold.click();
	await expect(page.locator('.xray .row', { hasText: 'texel walks truncated' }).first()).toBeVisible();
});

test('the symptom picker answers without a log', async ({ page }) => {
	await openDoctor(page);
	await page.getByRole('combobox', { name: 'What did you see?' }).selectOption({
		label: 'The code execution cannot proceed because vulkan-1.dll was not found'
	});
	await expect(page.locator('.picker article.slip h3')).toContainText("Windows can't find Vulkan");
});
