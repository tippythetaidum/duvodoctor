import { analyse, parseText } from '../src/lib/parse/index.ts';
import { diagnose } from '../src/lib/match/engine.ts';
import { redact } from '../src/lib/redact/redact.ts';
import type { Catalog } from '../src/lib/match/catalog.ts';

export const FORUM = 'https://forum.luduvo.com';

export interface Post {
	topicId: number;
	postNumber: number;
	title: string;
	username: string;
	createdAt: string;
	cooked: string;
}

export interface ReleaseNote {
	build: number | null;
	title: string;
	url: string;
	date: string;
}

export interface LuduvoData {
	latest_build: number;
	seen: string;
	source: string;
	release_notes: ReleaseNote[];
}

export interface LogFinding {
	url: string;
	title: string;
	build: number | null;
	gpu: string | null;
	backend: string | null;
	matches: string[];
	unexplained: string[];
}

export interface StaffPost {
	username: string;
	url: string;
	title: string;
	date: string;
	excerpt: string;
}

export interface Report {
	since: string;
	until: string;
	catalogBuild: number;
	data: LuduvoData;
	previousBuild: number;
	newReleaseNotes: { note: ReleaseNote; text: string }[];
	logs: LogFinding[];
	staff: StaffPost[];
	newTopics: { title: string; url: string; category: string }[];
	tracked: { title: string; url: string; newPosts: number }[];
	errors: string[];
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…' };

export function cookedToText(html: string): string {
	return html
		.replace(/<aside[\s\S]*?<\/aside>/gi, '')
		.replace(/<div class="lightbox-wrapper">[\s\S]*?<\/div>/gi, '')
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/(p|pre|li|blockquote|h\d|div|tr)>/gi, '\n')
		.replace(/<[^>]*>/g, '')
		.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, e: string) => {
			if (e[0] === '#') {
				const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
				return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
			}
			return ENTITIES[e.toLowerCase()] ?? whole;
		})
		.replace(/[\u2018\u2019]/g, "'")
		.replace(/[\u201c\u201d]/g, '"')
		.replace(/\u2122/g, '(TM)')
		.replace(/\u00ae/g, '(R)');
}

const LOGISH =
	/^(\d{4}-\d{2}-\d{2} - |crash: |qt\.qpa|terminate called|what\(\): |zsh: |Aborted|LuduvoApp: |curl: \(|\[(INFO|WARNING|ERROR)\] |Faulting (application|module) name|Exception code|The code execution cannot proceed)/;

/** Pulls the log-looking lines out of a post. Returns null when there are too few to be a log. */
export function extractLog(text: string): string | null {
	const lines = text
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => LOGISH.test(l));
	if (lines.length === 0) return null;
	if (lines.length < 2 && !lines[0].startsWith('crash: ')) return null;
	return lines.join('\n');
}

export function postUrl(topicId: number, postNumber: number): string {
	return `${FORUM}/t/${topicId}/${postNumber}`;
}

export function checkLog(post: Post, log: string, catalog: Catalog): LogFinding {
	const a = analyse([parseText('pasted text', log)]);
	const r = diagnose(a, catalog);
	const file = a.files[0];
	// A matched failure drags knock-on errors after it, so leftovers only matter when nothing matched.
	const leftovers = r.flat.length ? [] : r.unexplainedErrors;
	const unexplained = leftovers.slice(0, 3).map((e) => {
		const line = file.lines.find((l) => l.n === e.line)?.text ?? '';
		return redact(line.replace(/^\d{4}-\d{2}-\d{2} - [\d:.]+ /, '')).text.slice(0, 240);
	});
	return {
		url: postUrl(post.topicId, post.postNumber),
		title: post.title,
		build: a.setup.build,
		gpu: a.setup.selected?.name ?? a.setup.adapters.find((x) => !x.software)?.name ?? null,
		backend: a.setup.backend,
		matches: r.flat.map((d) => d.sig.id),
		unexplained
	};
}

export function buildFromTitle(title: string): number | null {
	const m = /\bLuduvo (\d{2,4})\b/.exec(title);
	return m ? Number(m[1]) : null;
}

/**
 * Only the build number, its first sighting and staff-written release note titles are published automatically.
 * A build counts once staff post its release notes, or once logs from two different threads show it.
 */
export function nextData(prev: LuduvoData, notes: ReleaseNote[], logs: LogFinding[], posts: Post[]): LuduvoData {
	const next: LuduvoData = { ...prev, release_notes: prev.release_notes };
	if (notes.length) {
		next.release_notes = [...notes]
			.sort((a, b) => (b.build ?? 0) - (a.build ?? 0) || b.date.localeCompare(a.date))
			.slice(0, 5);
	}
	const sightings: { build: number; date: string; url: string; topic: number | null }[] = [];
	for (const n of notes) if (n.build) sightings.push({ build: n.build, date: n.date, url: n.url, topic: null });
	for (const l of logs) {
		if (l.build === null) continue;
		const p = posts.find((x) => postUrl(x.topicId, x.postNumber) === l.url);
		if (p) sightings.push({ build: l.build, date: p.createdAt, url: l.url, topic: p.topicId });
	}
	const confirmed = (build: number) => {
		const s = sightings.filter((x) => x.build === build);
		return s.some((x) => x.topic === null) || new Set(s.map((x) => x.topic)).size >= 2;
	};
	const best = sightings
		.filter((s) => s.build > prev.latest_build && s.build <= prev.latest_build + 3 && confirmed(s.build))
		.sort((a, b) => b.build - a.build || a.date.localeCompare(b.date))[0];
	if (best) {
		next.latest_build = best.build;
		next.seen = best.date.slice(0, 10);
		next.source = best.url;
	}
	return next;
}

function md(text: string): string {
	return text
		.replace(/[\\`*_[\]<>|#]/g, (c) => `\\${c}`)
		.replace(/@/g, '@\u200b')
		.replace(/\s+/g, ' ')
		.trim();
}

function code(text: string): string {
	return '`' + text.replace(/`/g, "'").replace(/@/g, '@\u200b') + '`';
}

export function hasFindings(r: Report): boolean {
	return (
		r.data.latest_build !== r.previousBuild ||
		r.newReleaseNotes.length > 0 ||
		r.logs.length > 0 ||
		r.staff.length > 0 ||
		r.newTopics.length > 0 ||
		r.errors.length > 0
	);
}

export function renderReport(r: Report, catalog: Catalog): string {
	const title = (id: string) => catalog.signatures.find((s) => s.id === id)?.title ?? id;
	const out: string[] = [];
	out.push(`Forum check from ${r.since.slice(0, 16).replace('T', ' ')} to ${r.until.slice(0, 16).replace('T', ' ')} UTC.`, '');

	out.push('## Luduvo builds', '');
	if (r.data.latest_build !== r.previousBuild) {
		out.push(`- **Build ${r.data.latest_build} is out**, first seen ${r.data.seen}: ${r.data.source}. The site now says so.`);
	} else {
		out.push(`- Newest build seen: ${r.data.latest_build}.`);
	}
	if (r.data.latest_build > r.catalogBuild) {
		out.push(`- Known issues are still checked against build ${r.catalogBuild}. Check them against ${r.data.latest_build} and bump \`build\` in signatures.json.`);
	}
	for (const { note, text } of r.newReleaseNotes) {
		out.push(`- New release notes: [${md(note.title)}](${note.url})`, '', '  <details><summary>Text</summary>', '', ...text.split('\n').filter(Boolean).map((l) => `  > ${md(l)}`), '', '  </details>');
	}
	out.push('');

	if (r.logs.length) {
		out.push(`## Logs posted (${r.logs.length})`, '', '| Post | Build | Graphics | Doctor says |', '|---|---|---|---|');
		for (const l of r.logs) {
			const says = l.matches.length ? l.matches.map(title).map(md).join('; ') : '**nothing it recognises**';
			out.push(`| [${md(l.title)}](${l.url}) | ${l.build ?? '?'} | ${md(l.gpu ?? '?')}${l.backend ? `, ${l.backend}` : ''} | ${says} |`);
		}
		out.push('');
		const odd = r.logs.filter((l) => l.unexplained.length);
		if (odd.length) {
			out.push('### Errors the catalog doesn\'t explain', '');
			for (const l of odd) out.push(`- ${l.url}`, ...l.unexplained.map((u) => `  - ${code(u)}`));
			out.push('');
		}
	}

	if (r.staff.length) {
		out.push(`## Staff posts (${r.staff.length})`, '');
		for (const s of r.staff) out.push(`- ${md(s.username)} in [${md(s.title)}](${s.url}), ${s.date.slice(0, 10)}: ${md(s.excerpt)}`);
		out.push('');
	}

	if (r.tracked.length) {
		out.push('## Threads the site links to', '');
		for (const t of r.tracked) out.push(`- [${md(t.title)}](${t.url}): ${t.newPosts} new post${t.newPosts === 1 ? '' : 's'}`);
		out.push('');
	}

	if (r.newTopics.length) {
		out.push(`## New bug topics without a log (${r.newTopics.length})`, '');
		for (const t of r.newTopics) out.push(`- [${md(t.title)}](${t.url}) (${t.category})`);
		out.push('');
	}

	if (r.errors.length) {
		out.push('## Couldn\'t read', '', ...r.errors.map((e) => `- ${md(e)}`), '');
	}

	if (!hasFindings(r)) out.push('Nothing new.');
	return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
