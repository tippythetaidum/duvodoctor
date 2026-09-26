import { expect, test } from '@playwright/test';
import { drop, index, openDoctor } from './helpers.ts';

test('reading every fixture makes no network requests', async ({ page }) => {
	await openDoctor(page);
	const requests: string[] = [];
	page.on('request', (r) => requests.push(r.url()));
	page.on('worker', (w) => requests.push(`worker started late: ${w.url()}`));
	for (const c of index.cases) {
		await drop(page, c.dir);
		await page.getByRole('button', { name: 'Start again' }).click();
	}
	expect(requests).toEqual([]);
});

test('the content security policy blocks any attempt to send data', async ({ page }) => {
	await openDoctor(page);
	const completed: string[] = [];
	const failed: string[] = [];
	page.on('requestfinished', (r) => completed.push(r.url()));
	page.on('requestfailed', (r) => failed.push(r.failure()?.errorText ?? 'unknown'));
	const outcome = await page.evaluate(async () => {
		const violations: string[] = [];
		document.addEventListener('securitypolicyviolation', (e) => violations.push(e.effectiveDirective));
		const tries: Record<string, string> = {};
		try {
			await fetch('https://example.com/collect', { method: 'POST', body: 'log' });
			tries.fetch = 'sent';
		} catch {
			tries.fetch = 'blocked';
		}
		try {
			await fetch('/collect', { method: 'POST', body: 'log' });
			tries.sameOrigin = 'sent';
		} catch {
			tries.sameOrigin = 'blocked';
		}
		navigator.sendBeacon('https://example.com/beacon', 'log');
		const img = new Image();
		img.src = 'https://example.com/pixel.png?log=1';
		await new Promise((r) => setTimeout(r, 300));
		return { tries, violations };
	});
	expect(outcome.tries.fetch).toBe('blocked');
	expect(outcome.tries.sameOrigin).toBe('blocked');
	expect(completed).toEqual([]);
	for (const reason of failed) expect(reason).toMatch(/BLOCKED_BY_CSP|csp/i);
	expect(outcome.violations).toContain('connect-src');
	expect(outcome.violations).toContain('img-src');
});

test('the analysis worker cannot reach the network either', async ({ page }) => {
	const response = await page.goto('/');
	const csp = response?.headers()['content-security-policy'] ?? '';
	expect(csp).toContain("connect-src 'none'");
	const workerUrl = await page.evaluate(async () => {
		await new Promise((r) => setTimeout(r, 300));
		return performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('worker'));
	});
	expect(workerUrl).toBeTruthy();
	const workerResponse = await page.request.get(workerUrl!);
	expect(workerResponse.headers()['content-security-policy']).toContain("connect-src 'none'");
});

test('log text never runs as HTML', async ({ page }) => {
	await openDoctor(page);
	const title = await page.title();
	const violations: string[] = [];
	page.on('console', (m) => {
		if (/Content Security Policy/i.test(m.text())) violations.push(m.text());
	});
	await drop(page, 'synthetic/xss');
	await page.locator('.xray .row').first().waitFor();
	expect(await page.title()).toBe(title);
	expect(await page.locator('img[src="x"]').count()).toBe(0);
	expect(await page.locator('svg[onload]').count()).toBe(0);
	expect(await page.locator('b', { hasText: 'bold' }).count()).toBe(0);
	await expect(page.locator('.xray')).toContainText("<script>document.title='owned'</script>");
	await expect(page.locator('.preview')).toContainText('<img src=x onerror=');
	expect(violations).toEqual([]);
});

test('the page never needs inline styles the policy would block', async ({ page }) => {
	const violations: string[] = [];
	page.on('console', (m) => {
		if (/Content Security Policy/i.test(m.text())) violations.push(m.text());
	});
	await openDoctor(page);
	await drop(page, 'joe/healthy-session');
	await page.locator('.xray .row').first().waitFor();
	await page.locator('.xray .viewport').evaluate((el) => (el.scrollTop = 40 * 24));
	await page.getByRole('button', { name: /folded\. Show them/ }).first().click();
	await page.getByLabel('Wrap long lines').check();
	for (const path of ['/issues', '/issues/amd-amdvlk-crash', '/logs', '/requirements', '/about', '/404']) {
		await page.goto(path);
	}
	expect(violations).toEqual([]);
});
