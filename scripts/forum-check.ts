// Daily read of the Luduvo forum's public pages. Runs in CI, never in the site itself.
// Writes src/data/luduvo.json (latest build and release note titles) and a markdown report.
// Usage: node scripts/forum-check.ts [--since 2026-09-25T07:00:00Z] [--report forum-report.md]
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Catalog } from '../src/lib/match/catalog.ts';
import {
	FORUM,
	buildFromTitle,
	checkLog,
	cookedToText,
	extractLog,
	hasFindings,
	nextData,
	postUrl,
	renderReport,
	type LogFinding,
	type LuduvoData,
	type Post,
	type ReleaseNote,
	type Report,
	type StaffPost
} from './forum-lib.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const dataPath = join(root, 'src/data/luduvo.json');
const catalog: Catalog = JSON.parse(readFileSync(join(root, 'src/data/signatures.json'), 'utf8'));

const UA = 'duvodoctor-daily-check (+https://github.com/tippythetaidum/duvodoctor)';
const STAFF = ['Isaac', 'IgorAlexey', 'Nikhil', 'dargs'];
const BUG_CATEGORIES: Record<number, string> = {
	16: 'Bug Reports',
	7: 'General Bugs',
	17: 'Studio Bugs',
	18: 'Engine Bugs',
	19: 'Website Bugs'
};
const HELP_CATEGORIES = new Set([4, 6, 15]);
const LAUNCH_WORDS =
	/crash|launch|start|client\.?log|error|black screen|won'?t|can'?t play|cannot play|failed|not (open|load)|vulkan|d3d12|directx|gpu|update/i;
const MAX_TOPICS = 30;

const args = process.argv.slice(2);
const arg = (name: string) => {
	const i = args.indexOf(name);
	return i >= 0 ? args[i + 1] : undefined;
};
const until = new Date();
const since = new Date(arg('--since') ?? until.getTime() - 25 * 3600 * 1000);
const reportPath = arg('--report') ?? join(root, 'forum-report.md');

const errors: string[] = [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(path: string): Promise<any> {
	await sleep(1200);
	try {
		const res = await fetch(FORUM + path, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return await res.json();
	} catch (e) {
		errors.push(`${path}: ${(e as Error).message}`);
		return null;
	}
}

const recent = (iso: string | undefined) => !!iso && new Date(iso) >= since && new Date(iso) <= until;

function toPost(p: { topic_id: number; post_number: number; username: string; created_at: string; cooked: string }, title: string): Post {
	return { topicId: p.topic_id, postNumber: p.post_number, title, username: p.username, createdAt: p.created_at, cooked: p.cooked ?? '' };
}

async function releaseNotes(): Promise<{ notes: ReleaseNote[]; fresh: { note: ReleaseNote; text: string }[] }> {
	const j = await get('/c/updates/release-notes/24.json');
	if (!j) return { notes: [], fresh: [] };
	const staffIds = new Set<number>(j.users.filter((u: { admin?: boolean; moderator?: boolean }) => u.admin || u.moderator).map((u: { id: number }) => u.id));
	const notes: ReleaseNote[] = [];
	const fresh: { note: ReleaseNote; text: string }[] = [];
	for (const t of j.topic_list.topics) {
		if (t.pinned) continue;
		const op = t.posters?.find((p: { description: string }) => /Original Poster/.test(p.description))?.user_id;
		if (!staffIds.has(op)) continue;
		const note = { build: buildFromTitle(t.title), title: t.title, url: `${FORUM}/t/${t.id}`, date: t.created_at.slice(0, 10) };
		notes.push(note);
		if (recent(t.created_at)) {
			const topic = await get(`/t/${t.id}.json`);
			const text = topic ? cookedToText(topic.post_stream.posts[0]?.cooked ?? '').slice(0, 4000) : '';
			fresh.push({ note, text });
		}
	}
	return { notes, fresh };
}

async function newTopics() {
	const out: { id: number; title: string; category: number }[] = [];
	for (let page = 0; page < 6; page++) {
		const j = await get(`/latest.json?order=created&page=${page}`);
		const topics = j?.topic_list?.topics ?? [];
		for (const t of topics) if (recent(t.created_at)) out.push({ id: t.id, title: t.title, category: t.category_id });
		if (!topics.length || topics.every((t: { created_at: string }) => new Date(t.created_at) < since)) break;
	}
	return out.filter((t) => t.category in BUG_CATEGORIES || (HELP_CATEGORIES.has(t.category) && LAUNCH_WORDS.test(t.title)));
}

function trackedTopicIds(): number[] {
	const ids = new Set<number>();
	for (const s of catalog.signatures) {
		const urls = [...s.steps.map((st) => st.link?.url), s.status.staff_note?.url];
		for (const u of urls) {
			const m = u && /forum\.luduvo\.com\/t\/(\d+)/.exec(u);
			if (m) ids.add(Number(m[1]));
		}
	}
	return [...ids];
}

async function staffPosts(): Promise<StaffPost[]> {
	const out: StaffPost[] = [];
	for (const username of STAFF) {
		const j = await get(`/user_actions.json?username=${encodeURIComponent(username)}&filter=4,5&limit=30`);
		for (const a of j?.user_actions ?? []) {
			if (!recent(a.created_at)) continue;
			out.push({
				username,
				url: postUrl(a.topic_id, a.post_number),
				title: a.title,
				date: a.created_at,
				excerpt: cookedToText(a.excerpt ?? '').replace(/\s+/g, ' ').trim().slice(0, 280)
			});
		}
	}
	return out.sort((a, b) => a.date.localeCompare(b.date));
}

async function main() {
	const prev: LuduvoData = JSON.parse(readFileSync(dataPath, 'utf8'));
	const { notes, fresh } = await releaseNotes();

	const posts = new Map<string, Post>();
	const topicsWithoutLogs: Report['newTopics'] = [];
	const tracked: Report['tracked'] = [];

	const candidates = (await newTopics()).slice(0, MAX_TOPICS);
	for (const t of candidates) {
		const j = await get(`/t/${t.id}.json`);
		if (!j) continue;
		let found = false;
		for (const p of j.post_stream.posts) {
			if (!recent(p.created_at)) continue;
			const post = toPost(p, t.title);
			posts.set(postUrl(post.topicId, post.postNumber), post);
			if (extractLog(cookedToText(post.cooked))) found = true;
		}
		if (!found && t.category in BUG_CATEGORIES)
			topicsWithoutLogs.push({ title: t.title, url: `${FORUM}/t/${t.id}`, category: BUG_CATEGORIES[t.category] });
	}

	for (const id of trackedTopicIds()) {
		if (candidates.some((t) => t.id === id)) continue;
		const j = await get(`/t/${id}/99999.json`);
		if (!j || !recent(j.last_posted_at)) continue;
		const newPosts = j.post_stream.posts.filter((p: { created_at: string }) => recent(p.created_at));
		if (!newPosts.length) continue;
		tracked.push({ title: j.title, url: `${FORUM}/t/${id}`, newPosts: newPosts.length });
		for (const p of newPosts) {
			const post = toPost(p, j.title);
			posts.set(postUrl(post.topicId, post.postNumber), post);
		}
	}

	const logs: LogFinding[] = [];
	for (const post of posts.values()) {
		const log = extractLog(cookedToText(post.cooked));
		if (log) logs.push(checkLog(post, log, catalog));
	}

	const staff = await staffPosts();
	const data = nextData(prev, notes, logs, [...posts.values()]);
	const report: Report = {
		since: since.toISOString(),
		until: until.toISOString(),
		catalogBuild: catalog.build,
		data,
		previousBuild: prev.latest_build,
		newReleaseNotes: fresh,
		logs,
		staff,
		newTopics: topicsWithoutLogs,
		tracked,
		errors
	};

	const changed = JSON.stringify(data) !== JSON.stringify(prev);
	if (changed) writeFileSync(dataPath, JSON.stringify(data, null, '\t') + '\n');
	writeFileSync(reportPath, renderReport(report, catalog));

	const summary = `${logs.length} logs, ${staff.length} staff posts, ${topicsWithoutLogs.length} other bug topics, ${errors.length} errors`;
	console.log(summary);
	if (process.env.GITHUB_OUTPUT) {
		appendFileSync(
			process.env.GITHUB_OUTPUT,
			`changed=${changed}\nfindings=${hasFindings(report)}\nbuild=${data.latest_build}\n`
		);
	}
	const requests = candidates.length + trackedTopicIds().length + STAFF.length + 2;
	if (errors.length >= requests) process.exit(1);
}

await main();
