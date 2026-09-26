import { describe, expect, it } from 'vitest';
import { previewPieces, redact } from '../src/lib/redact/redact.ts';

describe('redaction', () => {
	it('hides Windows usernames in every path style', () => {
		const cases: [string, string][] = [
			['C:\\Users\\alice\\AppData\\Roaming', 'C:\\Users\\<user>\\AppData\\Roaming'],
			['C:/Users/alice/AppData/Local', 'C:/Users/<user>/AppData/Local'],
			['C:\\\\Users\\\\alice\\\\AppData', 'C:\\\\Users\\\\<user>\\\\AppData'],
			['c:\\users\\Alice Smith\\Documents', 'c:\\users\\<user>\\Documents'],
			['D:\\Users\\bob', 'D:\\Users\\<user>'],
			['into C:\\Users\\bob holds', 'into C:\\Users\\<user> holds']
		];
		for (const [input, want] of cases) expect(redact(input).text).toBe(want);
	});

	it('marks non-Latin usernames without keeping them', () => {
		const escaped = 'C:\\Users\\xCE\\x9C\\xCE\\x91\\xCE\\xA1\\AppData\\Roaming';
		expect(redact(escaped).text).toBe('C:\\Users\\<non-ascii user>\\AppData\\Roaming');
		expect(redact('C:\\Users\\MÓNICA\\Saved Games').text).toBe('C:\\Users\\<non-ascii user>\\Saved Games');
		expect(redact('C:\\Users\\Мария\\AppData').text).toBe('C:\\Users\\<non-ascii user>\\AppData');
	});

	it('hides Linux and macOS home folders and user@host terminal lines', () => {
		expect(redact('/home/meowzers/.local/share/Luduvo').text).toBe('/home/<user>/.local/share/Luduvo');
		expect(redact('/Users/jane/Downloads/Luduvo').text).toBe('/Users/<user>/Downloads/Luduvo');
		expect(redact('pc@fedora:~$ luduvo --singleplayer').text).toBe('<user>@<host>:~$ luduvo --singleplayer');
		expect(redact('2026-09-20 - 12:00:00.000 [INFO] alice@DESKTOP-7K2M:~/Luduvo').text).toBe(
			'2026-09-20 - 12:00:00.000 [INFO] <user>@<host>:~/Luduvo'
		);
		expect(redact('  bob@work.laptop.lan:/opt/luduvo$ ./LuduvoGame').text).toBe('  <user>@<host>:/opt/luduvo$ ./LuduvoGame');
	});

	it('leaves placeholders people already typed', () => {
		expect(redact('C:\\Users\\[NAME]\\AppData').text).toBe('C:\\Users\\[NAME]\\AppData');
		expect(redact('/home/---/.local').text).toBe('/home/---/.local');
	});

	it('removes install_id but keeps the rest of state.json', () => {
		const out = redact('{\n\t"install_id":\t"11f96b9b-10d4-43d2-b58c-fedd3f99b578",\n\t"version":\t"44"\n}').text;
		expect(out).toContain('"install_id":\t"<removed>"');
		expect(out).toContain('"version":\t"44"');
	});

	it('removes tokens, emails and launch links', () => {
		const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
		expect(redact(`auth ${jwt} ok`).text).toBe('auth <token> ok');
		expect(redact('Authorization: Bearer abcdefghijklmnop123').text).toBe('Authorization: Bearer <token>');
		expect(redact('session_token=abcdef1234567890abcdef').text).toBe('session_token=<token>');
		expect(redact('mail me at someone.real@example.co.uk now').text).toBe('mail me at <email> now');
		expect(redact('opened luduvo://join?place=3&ticket=abc123').text).toBe('opened luduvo://<launch link removed>');
		expect(redact('launcher: luduvo:// handler registered').text).toBe('launcher: luduvo:// handler registered');
	});

	it("keeps Luduvo's server address unless asked", () => {
		const log = '[INFO] IP: 5.78.177.147, Port: 27020\n[INFO] connected to 5.78.177.147:27020 (encrypted)';
		expect(redact(log).text).toBe(log);
		expect(redact(log, { removeServer: true }).text).toBe(
			'[INFO] IP: <server>, Port: <port>\n[INFO] connected to <server> (encrypted)'
		);
	});

	it('leaves ordinary log lines alone', () => {
		const lines = [
			'2026-09-17 - 20:23:09.923 [INFO] [vk] pipelineCacheUUID=3d19fb82df5fbc02ef670dc3bf805afd',
			"2026-09-17 - 20:23:11.102 [INFO] Script '@core://scripts/Hotbar.client.lua' loaded",
			'crash: exception 0xc0000005 at C:\\WINDOWS\\System32\\DriverStore\\FileRepository\\u0203303.inf_amd64_e5876a26758f154c\\B026363\\amdvlk64.dll+0x224597c read 0x50'
		];
		for (const l of lines) expect(redact(l).text).toBe(l);
	});

	it('describes every removal for the preview', () => {
		const text = 'C:\\Users\\alice\\x and bob@example.com';
		const r = redact(text);
		expect(r.redactions.map((x) => [x.kind, x.original])).toEqual([
			['username', 'alice'],
			['email', 'bob@example.com']
		]);
		const pieces = previewPieces(text, r.redactions);
		expect(pieces.map((p) => p.text).join('')).toBe(text);
		expect(pieces.filter((p) => p.redaction).length).toBe(2);
	});
});
