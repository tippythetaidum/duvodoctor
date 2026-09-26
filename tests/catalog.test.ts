import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { catalog, root } from './helpers.ts';
import type { MatchRule, Pattern } from '../src/lib/match/catalog.ts';

const schema = JSON.parse(readFileSync(join(root, 'src/data/signatures.schema.json'), 'utf8'));
const FORUM_POST = /^https:\/\/forum\.luduvo\.com\/t\/\d+(\/\d+)?$/;

function patterns(rule: MatchRule | undefined): string[] {
	if (!rule?.files) return [];
	return Object.values(rule.files).flatMap((fr) =>
		[...(fr?.all ?? []), ...(fr?.any ?? []), ...(fr?.none ?? [])].map((p: Pattern) =>
			typeof p === 'string' ? p : p.re
		)
	);
}

describe('signature catalog', () => {
	it('matches the schema', () => {
		const ajv = new Ajv2020({ allErrors: true });
		const valid = ajv.validate(schema, catalog);
		expect(ajv.errors ?? []).toEqual([]);
		expect(valid).toBe(true);
	});

	it('has unique ids', () => {
		const ids = catalog.signatures.map((s) => s.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('only chains to signatures that exist and are not noise', () => {
		const byId = new Map(catalog.signatures.map((s) => [s.id, s]));
		const bad = catalog.signatures.flatMap((s) =>
			(s.leads_to ?? []).filter((id) => !byId.has(id) || byId.get(id)!.blame === 'noise' || id === s.id)
		);
		expect(bad).toEqual([]);
	});

	it('compiles every pattern and keeps them cheap on long hostile lines', () => {
		const cap = 8192;
		const clip = (s: string) => s.slice(0, cap);
		const hostile = [
			clip('a'.repeat(4000) + ' ' + '\\x00'.repeat(1000) + 'C:\\Users\\' + '('.repeat(2000)),
			clip('crash: exception 0xc0000005 at C:\\' + 'Program Files\\'.repeat(600) + 'x.dl'),
			clip('crash: exception 0xc0000005 at C:\\' + 'a.dll+'.repeat(1400)),
			clip('crash: exception 0xc0000005 at ' + 'C:\\Users\\LuduvoGame.exe+'.repeat(400)),
			clip('2026-09-20 - 12:00:00.000 [ERROR] ' + 'skipped: Intel '.repeat(600)),
			clip('2026-09-20 - 12:00:00.000 [INFO] ' + 'content store: cannot rename manifest.json '.repeat(200)),
			clip('2026-09-20 - 12:00:00.000 [WARNING] ' + 'Vulkan unavailable: '.repeat(450)),
			clip('2026-09-20 - 12:00:00.000 [ERROR] GTAO: depth SRV ' + 'x '.repeat(4000)),
			clip('C:\\Users\\' + '\\x'.repeat(3000) + 'é'.repeat(1000))
		];
		for (const s of catalog.signatures) {
			for (const p of [...patterns(s.match), ...patterns(s.hint?.match)]) {
				const re = new RegExp(p);
				for (const line of hostile) {
					const start = performance.now();
					for (let i = 0; i < 20; i++) re.test(line);
					expect(performance.now() - start, `${s.id}: ${p}`).toBeLessThan(100);
				}
			}
		}
	});

	it('links sources and credits to exact forum posts or the repo', () => {
		for (const s of catalog.signatures) {
			for (const link of s.sources) {
				expect(
					FORUM_POST.test(link.url) || link.url.startsWith('https://github.com/tippythetaidum/duvodoctor/'),
					`${s.id}: ${link.url}`
				).toBe(true);
			}
			for (const c of s.credits) expect(c.url, `${s.id}: ${c.handle}`).toMatch(FORUM_POST);
			if (s.status.staff_note) expect(s.status.staff_note.url).toMatch(/^https:\/\/forum\.luduvo\.com\/t\/\d+\/\d+$/);
		}
	});

	it('gives noise a fold label and everything else a way to be found', () => {
		for (const s of catalog.signatures) {
			if (s.blame === 'noise') expect(s.fold?.label, s.id).toBeTruthy();
			else expect(Boolean(s.match) || (s.symptoms?.length ?? 0) > 0, s.id).toBe(true);
		}
	});

	it('marks fixed issues with a fixed state', () => {
		for (const s of catalog.signatures) {
			if (s.status.fixed_in !== null) expect(s.status.state, s.id).toBe('fixed');
		}
	});

	it('never recommends the blocklist override or unsafe fixes', () => {
		for (const s of catalog.signatures) {
			for (const step of s.steps) {
				expect(step.text, s.id).not.toMatch(/LDV_VK_SKIP_BLOCKLIST=1/);
				expect(step.text, s.id).not.toMatch(/disable (your )?antivirus|regedit|dll-files|VPN to/i);
			}
		}
	});
});
