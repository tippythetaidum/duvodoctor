import { describe, expect, it } from 'vitest';
import { catalog, index, runCase } from './helpers.ts';

describe('every fixture gives its expected diagnosis', () => {
	for (const c of index.cases) {
		it(c.dir, () => {
			const { result } = runCase(c.dir);
			const got = result.flat.map((d) => d.sig.id + (d.confidence === 'partial' ? '~' : ''));
			expect(got).toEqual(c.expect);
			if (c.noise) {
				expect(result.noise.map((n) => n.sig.id).sort()).toEqual([...c.noise].sort());
			}
			if (c.verdict) expect(result.verdict).toBe(c.verdict);
			if (c.nudges) expect(result.nudges.map((p) => p.kind)).toEqual(c.nudges);
		});
	}
});

describe('healthy fixtures raise no false alarms', () => {
	for (const c of index.cases.filter((x) => x.healthy)) {
		it(c.dir, () => {
			const { result } = runCase(c.dir);
			expect(result.flat).toEqual([]);
			expect(result.unexplainedErrors).toEqual([]);
			for (const n of result.noise) expect(n.sig.blame).toBe('noise');
		});
	}
});

describe('chains show the root cause first', () => {
	for (const c of index.cases) {
		it(c.dir, () => {
			const { result } = runCase(c.dir);
			const pos = new Map(result.flat.map((d, i) => [d.sig.id, i]));
			const violations: string[] = [];
			for (const d of result.flat) {
				for (const child of d.children) {
					if (pos.get(d.sig.id)! > pos.get(child.sig.id)!) violations.push(`${child.sig.id} before ${d.sig.id}`);
					if (!d.sig.leads_to?.includes(child.sig.id)) violations.push(`${d.sig.id} does not lead to ${child.sig.id}`);
				}
				for (const other of result.flat) {
					if (other.sig.leads_to?.includes(d.sig.id) && pos.get(other.sig.id)! > pos.get(d.sig.id)!)
						violations.push(`${d.sig.id} shown before its cause ${other.sig.id}`);
				}
			}
			expect(violations).toEqual([]);
		});
	}
});

describe('every signature is covered', () => {
	const triggered = new Set<string>();
	for (const c of index.cases) {
		const { result } = runCase(c.dir);
		for (const d of result.flat) triggered.add(d.sig.id);
		for (const n of result.noise) triggered.add(n.sig.id);
	}
	for (const sig of catalog.signatures) {
		it(sig.id, () => {
			if (sig.match) expect(triggered.has(sig.id), `no fixture triggers ${sig.id}`).toBe(true);
			else expect(sig.symptoms?.length ?? 0, `${sig.id} has no log pattern and no symptom`).toBeGreaterThan(0);
		});
	}
});
