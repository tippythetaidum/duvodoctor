import { describe, expect, it } from 'vitest';
import locations from '../src/data/locations.json';
import requirements from '../src/data/requirements.json';
import changelog from '../src/data/changelog.json';

const SOURCE = /^https:\/\/(forum\.luduvo\.com\/t\/\d+(\/\d+)?|luduvo\.com\/download)$/;

describe('logs page data', () => {
	it('links every place and fact to a source', () => {
		const missing: string[] = [];
		for (const p of locations.platforms) {
			for (const place of p.places) {
				if (!place.sources.length) missing.push(`${p.id}: ${place.what}`);
				for (const s of place.sources) expect(s.url, place.what).toMatch(SOURCE);
			}
		}
		for (const f of locations.facts) {
			if (!f.sources.length) missing.push(f.text);
			for (const s of f.sources) expect(s.url, f.text).toMatch(SOURCE);
		}
		expect(missing).toEqual([]);
	});

	it('flags Linux and macOS as not documented', () => {
		const byId = Object.fromEntries(locations.platforms.map((p) => [p.id, p]));
		expect(byId.windows.confirmed).toBe(true);
		expect(byId.linux.confirmed).toBe(false);
		expect(byId.macos.confirmed).toBe(false);
	});
});

describe('requirements page data', () => {
	it('links every requirement to a source', () => {
		for (const g of requirements.groups) {
			for (const item of g.items) {
				expect(item.sources.length, item.text).toBeGreaterThan(0);
				for (const s of item.sources) expect(s.url, item.text).toMatch(SOURCE);
			}
		}
		expect(requirements.vulkan_features.source.url).toMatch(SOURCE);
	});
});

describe('changelog', () => {
	it('is dated and newest first', () => {
		const dates = changelog.map((e) => e.date);
		for (const d of dates) expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect([...dates].sort().reverse()).toEqual(dates);
	});
});
