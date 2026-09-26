import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from '@playwright/test';

export interface FixtureCase {
	dir: string;
	expect: string[];
	verdict?: string;
}

export const index: { cases: FixtureCase[] } = JSON.parse(readFileSync('fixtures/index.json', 'utf8'));

export function filesOf(dir: string): string[] {
	const full = join('fixtures', dir);
	return readdirSync(full)
		.filter((n) => statSync(join(full, n)).isFile())
		.sort()
		.map((n) => join(full, n));
}

export async function openDoctor(page: Page) {
	await page.goto('/');
	await page.waitForLoadState('networkidle');
	await page.evaluate(() => document.fonts.ready);
}

export async function drop(page: Page, dir: string) {
	await page.setInputFiles('#file-input', filesOf(dir));
	await page.locator('#verdict').waitFor();
	await page.waitForFunction(() => !document.querySelector('.busy'));
}

export async function diagnosisIds(page: Page): Promise<string[]> {
	return page
		.locator('.results article.slip')
		.evaluateAll((els) => els.map((e) => (e.getAttribute('aria-labelledby') ?? '').replace(/^dx-/, '')));
}
