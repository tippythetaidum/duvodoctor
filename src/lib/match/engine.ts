import type { Analysis, FileKind, ParsedFile } from '../types.ts';
import {
	SEVERITY_ORDER,
	type Catalog,
	type FileKey,
	type FileRule,
	type MatchRule,
	type Pattern,
	type Signature,
	type When
} from './catalog.ts';

export interface Evidence {
	file: number;
	line: number;
}

export interface Diagnosis {
	sig: Signature;
	confidence: 'exact' | 'partial';
	evidence: Evidence[];
	children: Diagnosis[];
	needsUpdate: boolean;
	hint: string | null;
}

export interface NoiseFold {
	sig: Signature;
	evidence: Evidence[];
}

export type Verdict = 'problems' | 'healthy' | 'inconclusive' | 'unknown' | 'empty';

export interface Prompt {
	kind: FileKind;
	text: string;
}

export interface MatchResult {
	verdict: Verdict;
	diagnoses: Diagnosis[];
	flat: Diagnosis[];
	noise: NoiseFold[];
	unexplainedErrors: Evidence[];
	prompts: Prompt[];
}

const MAX_EVIDENCE = 200;

const KIND_ALIASES: Record<FileKind, FileKind[]> = {
	client: ['client', 'terminal', 'unknown'],
	studio: ['studio', 'app', 'terminal', 'unknown'],
	app: ['app', 'studio', 'terminal', 'unknown'],
	launcher: ['launcher', 'terminal', 'unknown'],
	'launcher-update': ['launcher-update'],
	crash: ['crash'],
	state: ['state'],
	settings: ['settings'],
	terminal: ['terminal'],
	'event-viewer': ['event-viewer'],
	unknown: ['unknown']
};

const regexCache = new Map<string, RegExp>();
function compile(re: string): RegExp {
	let r = regexCache.get(re);
	if (!r) {
		r = new RegExp(re);
		regexCache.set(re, r);
	}
	return r;
}

function patternOf(p: Pattern): { re: RegExp; min: number } {
	return typeof p === 'string' ? { re: compile(p), min: 1 } : { re: compile(p.re), min: p.min ?? 1 };
}

function filesFor(files: ParsedFile[], key: FileKey): number[] {
	const out: number[] = [];
	files.forEach((f, i) => {
		if (f.binary) return;
		if (key === 'any' || KIND_ALIASES[key].includes(f.kind)) out.push(i);
	});
	return out;
}

/** Presence ignores unidentified text and empty files: an empty crash.log recorded no crash. */
function present(files: ParsedFile[], kind: FileKind): boolean {
	const kinds = KIND_ALIASES[kind].filter((k) => k !== 'unknown' || kind === 'unknown');
	return files.some((f) => !f.binary && !f.empty && kinds.includes(f.kind));
}

function scan(files: ParsedFile[], idx: number[], p: Pattern, cap: number) {
	const { re, min } = patternOf(p);
	const hits: Evidence[] = [];
	let count = 0;
	for (const i of idx) {
		for (const l of files[i].lines) {
			if (re.test(l.text)) {
				count++;
				if (hits.length < cap) hits.push({ file: i, line: l.n });
			}
		}
	}
	return { ok: count >= min, count, hits };
}

function evalFileRule(files: ParsedFile[], key: FileKey, rule: FileRule, cap: number): Evidence[] | null {
	const idx = filesFor(files, key);
	const evidence: Evidence[] = [];
	if (rule.all?.length || rule.any?.length) {
		if (idx.length === 0) return null;
	}
	for (const p of rule.all ?? []) {
		const r = scan(files, idx, p, cap);
		if (!r.ok) return null;
		for (const h of r.hits) evidence.push(h);
	}
	if (rule.any?.length) {
		let anyOk = false;
		for (const p of rule.any) {
			const r = scan(files, idx, p, cap);
			if (r.ok) {
				anyOk = true;
				for (const h of r.hits) evidence.push(h);
			}
		}
		if (!anyOk) return null;
	}
	for (const p of rule.none ?? []) {
		if (scan(files, idx, p, 0).count > 0) return null;
	}
	return evidence;
}

function evalWhen(a: Analysis, w: When): boolean {
	const s = a.setup;
	if (w.os && s.os && !w.os.includes(s.os)) return false;
	if (w.vendor && !(s.selected && w.vendor.includes(s.selected.vendor))) return false;
	if (w.backend && !(s.backend && w.backend.includes(s.backend))) return false;
	if (w.build && s.build !== null) {
		if (w.build.min !== undefined && s.build < w.build.min) return false;
		if (w.build.max !== undefined && s.build > w.build.max) return false;
	}
	if (w.has && !w.has.every((k) => present(a.files, k))) return false;
	if (w.missing && w.missing.some((k) => present(a.files, k))) return false;
	if (w.clean_quit !== undefined && s.cleanQuit !== w.clean_quit) return false;
	if (w.errors !== undefined && s.errorCount > 0 !== w.errors) return false;
	if (w.non_ascii_user !== undefined && s.nonAsciiUser !== w.non_ascii_user) return false;
	if (w.crash_module) {
		const kinds = a.files.flatMap((f) => f.crashes.map((c) => c.moduleKind));
		if (!kinds.some((k) => w.crash_module!.includes(k))) return false;
	}
	return true;
}

export function evalRule(a: Analysis, rule: MatchRule, cap = MAX_EVIDENCE): Evidence[] | null {
	const evidence: Evidence[] = [];
	for (const [key, fr] of Object.entries(rule.files ?? {})) {
		const r = evalFileRule(a.files, key as FileKey, fr as FileRule, cap);
		if (!r) return null;
		for (const h of r) evidence.push(h);
	}
	if (rule.when && !evalWhen(a, rule.when)) return null;
	if (!rule.files && !rule.when) return null;
	return evidence;
}

function firstPos(d: Diagnosis): number {
	let best = Number.MAX_SAFE_INTEGER;
	for (const e of d.evidence) best = Math.min(best, e.file * 10_000_000 + e.line);
	return best;
}

function subtreeSeverity(d: Diagnosis): number {
	return Math.min(SEVERITY_ORDER.indexOf(d.sig.severity), ...d.children.map(subtreeSeverity));
}

function compare(a: Diagnosis, b: Diagnosis, order: Map<string, number>): number {
	return (
		subtreeSeverity(a) - subtreeSeverity(b) ||
		(a.confidence === b.confidence ? 0 : a.confidence === 'exact' ? -1 : 1) ||
		firstPos(a) - firstPos(b) ||
		(order.get(a.sig.id) ?? 0) - (order.get(b.sig.id) ?? 0)
	);
}

function dedupe(evidence: Evidence[]): Evidence[] {
	const seen = new Set<string>();
	return evidence
		.filter((e) => {
			const k = `${e.file}:${e.line}`;
			if (seen.has(k)) return false;
			seen.add(k);
			return true;
		})
		.sort((x, y) => x.file - y.file || x.line - y.line);
}

function promptsFor(a: Analysis, verdict: Verdict): Prompt[] {
	const has = (k: FileKind) => present(a.files, k);
	const usable = a.files.filter((f) => !f.binary && !f.empty);
	const out: Prompt[] = [];
	const crashFiles = a.files.filter((f) => f.kind === 'crash');
	const onlyEmptyCrash = crashFiles.length > 0 && usable.length === 0;
	if (onlyEmptyCrash) {
		out.push({
			kind: 'client',
			text: "crash.log is empty. That's normal when nothing crashed. Drop client.log from the same folder so I can see what happened."
		});
		return out;
	}
	if (usable.length && usable.every((f) => f.kind === 'settings' || f.kind === 'state')) {
		out.push({
			kind: 'client',
			text: 'These files describe your setup but never record errors. Drop client.log too.'
		});
	}
	if (has('crash') && !has('client') && usable.some((f) => f.crashes.length > 0)) {
		out.push({
			kind: 'client',
			text: 'Drop client.log from the same folder too, so I can see which graphics card and driver were in use.'
		});
	}
	if (
		has('client') &&
		crashFiles.length === 0 &&
		!a.setup.cleanQuit &&
		a.setup.os !== 'linux' &&
		a.setup.os !== 'macos' &&
		verdict !== 'problems'
	) {
		out.push({
			kind: 'crash',
			text: 'client.log stops without saying why. If the game closed on you, drop crash.log from the same folder too.'
		});
	}
	return out;
}

export function diagnose(a: Analysis, catalog: Catalog): MatchResult {
	const order = new Map(catalog.signatures.map((s, i) => [s.id, i]));
	const found: Diagnosis[] = [];
	const noise: NoiseFold[] = [];
	const usable = a.files.filter((f) => !f.binary && !f.empty);

	for (const sig of catalog.signatures) {
		if (!sig.match && !sig.hint) continue;
		const exact = sig.match ? evalRule(a, sig.match, sig.blame === 'noise' ? Infinity : MAX_EVIDENCE) : null;
		if (exact) {
			if (sig.blame === 'noise') {
				noise.push({ sig, evidence: dedupe(exact) });
				continue;
			}
			found.push({
				sig,
				confidence: 'exact',
				evidence: dedupe(exact),
				children: [],
				needsUpdate: false,
				hint: null
			});
			continue;
		}
		if (sig.hint && sig.blame !== 'noise') {
			const partial = evalRule(a, sig.hint.match);
			if (partial) {
				found.push({
					sig,
					confidence: 'partial',
					evidence: dedupe(partial),
					children: [],
					needsUpdate: false,
					hint: sig.hint.say
				});
			}
		}
	}

	for (const d of found) {
		const fixedIn = d.sig.status.fixed_in;
		d.needsUpdate = fixedIn !== null && a.setup.build !== null && a.setup.build < fixedIn;
	}

	const byId = new Map(found.map((d) => [d.sig.id, d]));
	const parentOf = new Map<string, Diagnosis>();
	const sortedForParents = [...found].sort((x, y) => compare(x, y, order));
	for (const parent of sortedForParents) {
		for (const childId of parent.sig.leads_to ?? []) {
			const child = byId.get(childId);
			if (!child || child === parent || parentOf.has(childId)) continue;
			let p: Diagnosis | undefined = parent;
			let cycle = false;
			while (p) {
				if (p === child) cycle = true;
				p = parentOf.get(p.sig.id);
			}
			if (cycle) continue;
			parentOf.set(childId, parent);
			parent.children.push(child);
		}
	}
	const roots = found.filter((d) => !parentOf.has(d.sig.id));
	const sortTree = (list: Diagnosis[]) => {
		list.sort((x, y) => compare(x, y, order));
		for (const d of list) sortTree(d.children);
	};
	sortTree(roots);
	const flat: Diagnosis[] = [];
	const walk = (list: Diagnosis[]) => {
		for (const d of list) {
			flat.push(d);
			walk(d.children);
		}
	};
	walk(roots);

	const explained = new Set<string>();
	for (const d of [...flat, ...noise]) for (const e of d.evidence) explained.add(`${e.file}:${e.line}`);
	const unexplainedErrors: Evidence[] = [];
	a.files.forEach((f, i) => {
		for (const l of f.lines) {
			if (l.level === 'ERROR' && !explained.has(`${i}:${l.n}`)) unexplainedErrors.push({ file: i, line: l.n });
		}
		for (const c of f.crashes) {
			if (!explained.has(`${i}:${c.line}`)) unexplainedErrors.push({ file: i, line: c.line });
		}
	});

	let verdict: Verdict;
	if (usable.length === 0) verdict = 'empty';
	else if (flat.length) verdict = 'problems';
	else if (unexplainedErrors.length) verdict = 'unknown';
	else if (a.setup.cleanQuit || !present(a.files, 'client')) verdict = 'healthy';
	else verdict = 'inconclusive';

	return {
		verdict,
		diagnoses: roots,
		flat,
		noise,
		unexplainedErrors,
		prompts: promptsFor(a, verdict)
	};
}
