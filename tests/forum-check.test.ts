import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	checkLog,
	cookedToText,
	extractLog,
	hasFindings,
	nextData,
	renderReport,
	type LogFinding,
	type LuduvoData,
	type Post,
	type Report
} from '../scripts/forum-lib.ts';
import { catalog, fixturesDir } from './helpers.ts';

const asCooked = (log: string) =>
	'<p>anyone else?</p>\n<p>' +
	log
		.trim()
		.split(/\r?\n/)
		.map((l) => l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/'([^']*)'/g, '\u2018$1\u2019'))
		.join('<br>\n') +
	'</p>';

const post = (topicId: number, postNumber: number, createdAt: string, cooked = ''): Post => ({
	topicId,
	postNumber,
	title: 'Cannot play games',
	username: 'someone',
	createdAt,
	cooked
});

const base: LuduvoData = { latest_build: 44, seen: '2026-09-15', source: 'https://forum.luduvo.com/t/2589', release_notes: [] };

describe('reading forum posts', () => {
	it('turns cooked HTML back into plain lines', () => {
		const text = cookedToText(
			'<aside class="quote"><blockquote><p>[ERROR] quoted from someone else</p></blockquote></aside><p>a &amp; b<br>\u2018x\u2019 AMD Radeon\u2122 Graphics &#39;y&#39;</p>'
		);
		expect(text).toBe("a & b\n'x' AMD Radeon(TM) Graphics 'y'\n");
	});

	it('only treats posts with real log lines as logs', () => {
		expect(extractLog('my game crashes, [ERROR] somewhere?')).toBeNull();
		expect(extractLog('crash: exception 0xc0000005 at C:\\x\\amdvlk64.dll+0x1 read 0x50')).not.toBeNull();
		const log = extractLog('help\n2026-09-26 - 06:38:32.727 [INFO] a\nthanks\n2026-09-26 - 06:38:32.728 [ERROR] b\n');
		expect(log?.split('\n')).toHaveLength(2);
	});

	it('runs the Doctor over a log pasted into a post', () => {
		const raw = readFileSync(join(fixturesDir, 'forum/3990-1/client.log'), 'utf8');
		const p = post(3990, 1, '2026-09-26T06:41:46Z', asCooked(raw));
		const log = extractLog(cookedToText(p.cooked));
		expect(log).not.toBeNull();
		const f = checkLog(p, log!, catalog);
		expect(f).toMatchObject({ build: 45, gpu: 'NVIDIA GeForce GTX 1650', backend: 'd3d12', unexplained: [] });
		expect(f.matches).toEqual(['d3d12-cluster-pso-fail', 'd3d12-without-vulkan-attempt']);
	});

	it('lists errors it does not recognise, redacted', () => {
		const p = post(1, 1, '2026-09-26T06:00:00Z');
		const f = checkLog(p, '2026-09-26 - 06:00:00.000 [INFO] x\n2026-09-26 - 06:00:01.000 [ERROR] brand new failure in C:\\Users\\Jane\\AppData', catalog);
		expect(f.matches).toEqual([]);
		expect(f.unexplained).toEqual(['[ERROR] brand new failure in C:\\Users\\<user>\\AppData']);
	});
});

describe('the published build number', () => {
	const seen = (url: string, build: number | null): LogFinding => ({ url, title: '', build, gpu: null, backend: null, matches: [], unexplained: [] });

	it('needs logs from two different threads', () => {
		const posts = [post(3990, 1, '2026-09-26T06:41:46Z'), post(3990, 5, '2026-09-26T08:28:36Z'), post(4011, 1, '2026-09-26T14:31:13Z')];
		const one = nextData(base, [], [seen('https://forum.luduvo.com/t/3990/1', 45), seen('https://forum.luduvo.com/t/3990/5', 45)], posts);
		expect(one.latest_build).toBe(44);
		const two = nextData(base, [], [seen('https://forum.luduvo.com/t/4011/1', 45), seen('https://forum.luduvo.com/t/3990/1', 45)], posts);
		expect(two).toMatchObject({ latest_build: 45, seen: '2026-09-26', source: 'https://forum.luduvo.com/t/3990/1' });
	});

	it('takes staff release notes on their own, and keeps the newest five', () => {
		const notes = [40, 41, 42, 43, 44, 46].map((b) => ({ build: b, title: `Luduvo ${b} Thing`, url: `https://forum.luduvo.com/t/${b}`, date: '2026-09-27' }));
		const next = nextData(base, notes, [], []);
		expect(next.latest_build).toBe(46);
		expect(next.release_notes.map((n) => n.build)).toEqual([46, 44, 43, 42, 41]);
	});

	it('ignores implausible jumps', () => {
		const posts = [post(1, 1, '2026-09-26T00:00:00Z'), post(2, 1, '2026-09-26T00:00:00Z')];
		const next = nextData(base, [], [seen('https://forum.luduvo.com/t/1/1', 999), seen('https://forum.luduvo.com/t/2/1', 999)], posts);
		expect(next.latest_build).toBe(44);
	});
});

describe('the report', () => {
	const report = (over: Partial<Report> = {}): Report => ({
		since: '2026-09-25T07:00:00.000Z',
		until: '2026-09-26T07:00:00.000Z',
		catalogBuild: 44,
		data: base,
		previousBuild: 44,
		newReleaseNotes: [],
		logs: [],
		staff: [],
		newTopics: [],
		tracked: [],
		errors: [],
		...over
	});

	it('says so when nothing happened', () => {
		expect(hasFindings(report())).toBe(false);
		expect(renderReport(report(), catalog)).toContain('Nothing new.');
	});

	it('flags a new build and escapes forum text', () => {
		const r = report({
			data: { ...base, latest_build: 45, seen: '2026-09-26', source: 'https://forum.luduvo.com/t/3990/1' },
			newTopics: [{ title: 'help @everyone | <b>broken</b>', url: 'https://forum.luduvo.com/t/1', category: 'Engine Bugs' }]
		});
		const text = renderReport(r, catalog);
		expect(hasFindings(r)).toBe(true);
		expect(text).toContain('**Build 45 is out**');
		expect(text).toContain('checked against build 44');
		expect(text).not.toContain('@everyone');
		expect(text).not.toContain('<b>');
		expect(text).toContain('\\|');
	});
});
