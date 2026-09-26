import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { analyse, parseBytes, parseText } from '../src/lib/parse/index.ts';
import { decodeBytes, MAX_FILE_BYTES } from '../src/lib/parse/decode.ts';
import { splitLines, MAX_LINE_CHARS, MAX_LINES } from '../src/lib/parse/lines.ts';
import { decodeDriver } from '../src/lib/parse/driver.ts';
import { diagnose } from '../src/lib/match/engine.ts';
import { catalog, fixturesDir, loadDir } from './helpers.ts';

const healthyClient = readFileSync(join(fixturesDir, 'joe/healthy-session/client.log'));

describe('decoding', () => {
	it('reads plain UTF-8', () => {
		const f = parseBytes('client.log', new Uint8Array(healthyClient));
		expect(f.encoding).toBe('utf-8');
		expect(f.lines.length).toBe(618);
		expect(f.kind).toBe('client');
	});

	it('reads CRLF, LF and doubled CR line endings the same way', () => {
		const lf = healthyClient.toString('utf8').replace(/\r*\n/g, '\n');
		for (const ending of ['\n', '\r\n', '\r\r\n']) {
			const f = parseBytes('client.log', new TextEncoder().encode(lf.replace(/\n/g, ending)));
			expect(f.lines.length).toBe(618);
			expect(f.lines[617].text.endsWith('Quit.')).toBe(true);
		}
	});

	it('reads UTF-16 with a byte order mark', () => {
		const text = healthyClient.toString('utf8');
		const buf = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]);
		const f = parseBytes('client.log', new Uint8Array(buf));
		expect(f.encoding).toBe('utf-16le');
		expect(f.lines.length).toBe(618);
		expect(analyse([f]).setup.build).toBe(44);
	});

	it('reads UTF-16 without a byte order mark', () => {
		const buf = Buffer.from(healthyClient.toString('utf8'), 'utf16le');
		const f = parseBytes('client.log', new Uint8Array(buf));
		expect(f.encoding).toBe('utf-16le');
		expect(f.lines[0].text).toContain('Luduvo 44-dirty');
	});

	it('refuses binary files without throwing', () => {
		const bytes = new Uint8Array(4096);
		for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 7919) % 256;
		const f = parseBytes('client.log', bytes);
		expect(f.binary).toBe(true);
		expect(f.lines).toEqual([]);
		const result = diagnose(analyse([f]), catalog);
		expect(result.verdict).toBe('empty');
	});

	it('handles an empty file', () => {
		const f = parseBytes('crash.log', new Uint8Array(0));
		expect(f.empty).toBe(true);
		expect(f.kind).toBe('crash');
	});

	it('cuts a 30 MB file at the cap and says so', () => {
		const line = '2026-09-17 - 20:23:13.302 [WARNING] Razor: up to 31 texel walks truncated at RAZOR_MAX_WALK; shadows missing\n';
		const big = Buffer.from(line.repeat(Math.ceil((30 * 1024 * 1024) / line.length)));
		expect(big.length).toBeGreaterThan(30 * 1024 * 1024);
		const start = performance.now();
		const f = parseBytes('client.log', new Uint8Array(big));
		const elapsed = performance.now() - start;
		expect(f.truncated).toBe(true);
		expect(f.size).toBe(big.length);
		expect(decodeBytes(new Uint8Array(big)).text.length).toBeLessThanOrEqual(MAX_FILE_BYTES);
		expect(elapsed).toBeLessThan(10000);
		const result = diagnose(analyse([f]), catalog);
		expect(result.noise.map((n) => n.sig.id)).toEqual(['razor-walks-noise']);
	});

	it('falls back to windows-1252 for text that is not UTF-8', () => {
		const bytes = new Uint8Array([...Buffer.from('2026-09-13 - 13:00:00.000 [INFO] C:\\Users\\M'), 0xd3, ...Buffer.from('NICA\\x\n')]);
		const f = parseBytes('client.log', bytes);
		expect(f.lines[0].text).toContain('MÓNICA');
	});
});

describe('lines', () => {
	it('splits two log entries that landed on one line', () => {
		const { lines } = splitLines(
			'2026-09-20 - 22:16:33.111 [INFO] studio content: version 7 2026-09-20 - 22:16:35.915 [INFO] content store: version 7 is ready\n'
		);
		expect(lines.map((l) => l.text)).toEqual([
			'2026-09-20 - 22:16:33.111 [INFO] studio content: version 7',
			'2026-09-20 - 22:16:35.915 [INFO] content store: version 7 is ready'
		]);
	});

	it('keeps untimestamped terminal lines', () => {
		const { lines } = splitLines("2026-09-15 - 13:23:06.670 [INFO] [Script/S] test\nterminate called after throwing an instance of 'std::out_of_range'\n");
		expect(lines[1]).toMatchObject({ level: null, timestamped: false });
	});

	it('reads levels from lines with the time stripped', () => {
		const { lines } = splitLines('2026-09-13 - [ERROR] state before PKT_WIRE_SCHEMA; disconnecting');
		expect(lines[0].level).toBe('ERROR');
	});

	it('refuses to explode one line full of fake timestamps', () => {
		const fake = ' 2026-09-01 - 12:00:00.000 [INFO] x'.repeat(200_000);
		const start = performance.now();
		const { lines } = splitLines('2026-09-01 - 12:00:00.000 [INFO] start' + fake);
		expect(lines.length).toBe(1);
		expect(lines[0].clipped).toBe(true);
		const short = splitLines('2026-09-01 - 12:00:00.000 [INFO] a' + ' 2026-09-01 - 12:00:00.000 [INFO] b'.repeat(40));
		expect(short.lines.length).toBeLessThanOrEqual(8);
		expect(performance.now() - start).toBeLessThan(2000);
	});

	it('caps the number of lines and marks the file as cut short', () => {
		const start = performance.now();
		const f = parseBytes('client.log', new TextEncoder().encode('x\n'.repeat(10_000_000)));
		expect(f.lines.length).toBe(MAX_LINES);
		expect(f.truncated).toBe(true);
		expect(performance.now() - start).toBeLessThan(10000);
	});

	it('clips absurdly long lines', () => {
		const { lines } = splitLines('x'.repeat(MAX_LINE_CHARS * 3));
		expect(lines[0].clipped).toBe(true);
		expect(lines[0].text.length).toBe(MAX_LINE_CHARS);
	});
});

describe('file type detection', () => {
	it('uses the file name first', () => {
		expect(parseText('crash.log', 'anything').kind).toBe('crash');
		expect(parseText('Settings.cfg', 'x=1').kind).toBe('settings');
		expect(parseText('launcher-update.log', 'x').kind).toBe('launcher-update');
		expect(parseText('client (1).log', 'x').kind).toBe('client');
	});

	it('falls back to the content', () => {
		const pasted = (text: string) => parseText('pasted text', text).kind;
		expect(pasted(healthyClient.toString('utf8'))).toBe('client');
		expect(pasted('crash: exception 0xc0000005 at C:\\x\\amdvlk64.dll+0x224597c read 0x50')).toBe('crash');
		expect(pasted('{ "install_id": "x", "version": "44", "fail_count": 0 }')).toBe('state');
		expect(pasted('quality_level=10\ngraphics_api=Vulkan\nfullscreen=1')).toBe('settings');
		expect(pasted('2026-09-17 - 22:21:50.054 [INFO] launcher: up to date (44 seq=2000044000)')).toBe('launcher');
		expect(pasted('2026-09-17 - 22:21:52.416 [INFO] studio content: version 7 from C:\\x')).toBe('studio');
		expect(pasted('Faulting application name: Luduvo.exe\nException code: 0xc0000409')).toBe('event-viewer');
	});

	it('spots mixed terminal output on Linux', () => {
		const files = loadDir('forum/2638-1');
		expect(files[0].kind).toBe('terminal');
	});
});

describe('your setup', () => {
	it("reads Joe's healthy session", () => {
		const { setup } = analyse(loadDir('joe/healthy-session'));
		expect(setup).toMatchObject({
			os: 'windows',
			build: 44,
			sha: '240800eaa6d4',
			networkEpoch: 40,
			backend: 'vulkan',
			vkLoader: '1.4.341',
			resolution: '2560x1406',
			connected: true,
			server: '5.78.177.147:27020',
			cleanQuit: true,
			failCount: 0
		});
		expect(setup.adapters.map((a) => a.name)).toEqual(['NVIDIA GeForce RTX 5080', 'AMD Radeon(TM) Graphics']);
		expect(setup.selected?.vendor).toBe('nvidia');
		expect(setup.driver).toMatchObject({ raw: 2559967232, decoded: '610.88' });
		expect(setup.settings?.graphics_api).toBe('Vulkan');
	});

	it('picks the selected adapter when it is not adapter 0', () => {
		const { setup } = analyse(loadDir('forum/2638-1'));
		expect(setup.os).toBe('linux');
		expect(setup.selected?.name).toBe('NVIDIA GeForce GTX 1650');
		expect(setup.selected?.index).toBe(1);
		expect(setup.adapters.find((a) => a.vendor === 'llvmpipe')?.software).toBe(true);
	});

	it('follows the D3D12 fallback on a hybrid laptop', () => {
		const { setup } = analyse(loadDir('forum/2431-3'));
		expect(setup.backend).toBe('d3d12');
		expect(setup.selected?.name).toBe('NVIDIA GeForce GTX 1650');
		expect(setup.fallback).toEqual(['Vulkan failed, so Luduvo tried D3D12']);
		expect(setup.adapters.find((a) => a.vendor === 'microsoft-software')?.skipped).toBe('software adapter');
	});

	it('records skipped adapters and their reasons', () => {
		const { setup } = analyse(loadDir('forum/3314-1'));
		const intel = setup.adapters.find((a) => a.api === 'vulkan');
		expect(intel?.skipped).toMatch(/Coffee Lake/);
	});

	it('spots a non-Latin username even after redaction', () => {
		expect(analyse(loadDir('forum/2424-9')).setup.nonAsciiUser).toBe(true);
		expect(analyse(loadDir('forum/2716-1')).setup.nonAsciiUser).toBe(true);
		expect(analyse(loadDir('joe/healthy-session')).setup.nonAsciiUser).toBe(false);
	});

	it('reads the build 45 header, which dropped the bracketed sha', () => {
		const { setup } = analyse(loadDir('forum/3990-1'));
		expect(setup).toMatchObject({ build: 45, sha: '790afcf2ee3f', networkEpoch: 47, backend: 'd3d12' });
		expect(setup.selected?.name).toBe('NVIDIA GeForce GTX 1650');
		expect(parseText('pasted text', '2026-09-26 - 06:38:32.727 [INFO] Luduvo 45 sha=790afcf2ee3f network_epoch=47').kind).toBe('client');
		expect(analyse([parseText('client.log', '2026-09-26 - 06:38:32.727 [INFO] Luduvo 45 is here')]).setup.build).toBeNull();
	});

	it('takes the build from state.json or the launcher when there is no header', () => {
		expect(analyse(loadDir('joe/localappdata')).setup.build).toBe(44);
		expect(analyse(loadDir('forum/2487-1')).setup.build).toBe(43);
	});
});

describe('crash.log', () => {
	it('pulls apart each crash line', () => {
		const [f] = loadDir('forum/3562-1');
		expect(f.crashes[0]).toMatchObject({
			code: '0xc0000005',
			module: 'bdcamvk64.dll',
			offset: '0x32fd',
			access: 'read',
			address: '0x0',
			moduleKind: 'other'
		});
	});

	it('recognises GPU drivers, Luduvo and Windows modules', () => {
		const [amd] = loadDir('forum/3046-1');
		expect(amd.crashes[0]).toMatchObject({ module: 'amdvlk64.dll', moduleKind: 'gpu-driver', offset: '0x1ccb80c' });
		const [editor] = loadDir('forum/2638-2');
		expect(editor.crashes.map((c) => c.moduleKind)).toEqual(['luduvo', 'luduvo', 'luduvo', 'luduvo', 'luduvo', 'windows']);
		expect(editor.crashes[5].access).toBeNull();
	});
});

describe('driver versions', () => {
	it('decodes NVIDIA', () => {
		expect(decodeDriver(2559967232, 'nvidia', 'windows').decoded).toBe('610.88');
	});
	it('decodes AMD', () => {
		expect(decodeDriver(8388961, 'amd', 'windows').decoded).toBe('2.0.353');
		expect(decodeDriver(8388887, 'amd', 'windows').decoded).toBe('2.0.279');
	});
	it('decodes Intel on Linux (Mesa) and leaves Windows raw', () => {
		expect(decodeDriver(109060098, 'intel', 'linux').decoded).toBe('26.2.2');
		expect(decodeDriver(109060098, 'intel', 'windows').decoded).toBeNull();
	});
	it('shows Apple as reported', () => {
		expect(decodeDriver(123, 'apple', 'macos')).toMatchObject({ raw: 123, decoded: null });
	});
});
