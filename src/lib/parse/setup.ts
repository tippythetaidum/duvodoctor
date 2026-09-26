import type { Adapter, Os, ParsedFile, SetupSummary } from '../types.ts';
import { decodeDriver, vendorFromId } from './driver.ts';

const HEADER = /\] Luduvo (\d+)(?:-dirty)? \(([0-9a-f]{7,40})\)(?: sha=[0-9a-f]+)?(?: network_epoch=(\d+))?/;
const LAUNCHER_BUILD = /launcher: up to date \((\d+) seq=/;
const VK_ADAPTER =
	/\[adapter (\d+)\] (.+?) \((\w+), vendor=(0x[0-9a-fA-F]+) device=(0x[0-9a-fA-F]+), (\d+) MB\)/;
const VK_SKIPPED = /\[adapter (\d+)\] (.+?) skipped: (.+)$/;
const VK_SELECTED = /Selected adapter (\d+): (.+?)(?: \((\w+)\))?$/;
const DX_ADAPTER =
	/\[d3d12\] adapter (\d+): '(.+?)' \((\w+), vendor=(0x[0-9a-fA-F]+) device=(0x[0-9a-fA-F]+), (\d+) MB\)/;
const DX_SKIPPED = /\[d3d12\] adapter '(.+?)' skipped: (.+)$/;
const DX_SELECTED = /\[d3d12\] selected adapter: '(.+?)'/;

function osFromText(text: string): Os | null {
	if (/[A-Za-z]:\\|\[d3d12\]|\.exe\b|DriverStore/.test(text)) return 'windows';
	if (/\/home\/|\.local\/share\/Luduvo|qt\.qpa|core dumped/.test(text)) return 'linux';
	if (/\/Users\/|\/Library\/|\.metallib|zsh: /.test(text)) return 'macos';
	return null;
}

export function buildSetup(files: ParsedFile[]): SetupSummary {
	const s: SetupSummary = {
		os: null,
		osFrom: null,
		build: null,
		sha: null,
		networkEpoch: null,
		backend: null,
		fallback: [],
		adapters: [],
		selected: null,
		driver: null,
		vkLoader: null,
		vkDevice: null,
		validation: null,
		blocklistOverride: false,
		resolution: null,
		connected: false,
		server: null,
		cleanQuit: false,
		errorCount: 0,
		settings: null,
		failCount: null,
		nonAsciiUser: false
	};
	let launcherBuild: number | null = null;
	let stateBuild: number | null = null;
	let driverRaw: number | null = null;
	let sawVulkan = false;
	let sawD3d12 = false;
	let vkSelectedIndex: number | null = null;
	let dxSelectedName: string | null = null;

	const adapterKey = (a: Adapter) => `${a.api}:${a.name}`;
	const byKey = new Map<string, Adapter>();
	const upsert = (a: Adapter) => {
		const key = adapterKey(a);
		const existing = byKey.get(key);
		if (existing) {
			for (const k of Object.keys(a) as (keyof Adapter)[]) {
				if (a[k] !== null && (existing[k] === null || k === 'skipped')) {
					(existing as unknown as Record<string, unknown>)[k] = a[k];
				}
			}
			return existing;
		}
		byKey.set(key, a);
		s.adapters.push(a);
		return a;
	};

	for (const f of files) {
		if (f.settings) s.settings = { ...(s.settings ?? {}), ...f.settings };
		if (f.state) {
			if (f.state.failCount !== null) s.failCount = f.state.failCount;
			if (f.state.version && /^\d+$/.test(f.state.version)) stateBuild = Number(f.state.version);
		}
		for (const c of f.crashes) {
			if (!s.os) {
				s.os = osFromText(c.path);
				s.osFrom = s.os ? 'crash.log paths' : null;
			}
		}
		for (const l of f.lines) {
			const t = l.text;
			if (l.level === 'ERROR') s.errorCount++;
			if (!s.os) {
				const os = osFromText(t);
				if (os) {
					s.os = os;
					s.osFrom = 'file paths in the log';
				}
			}
			if (/[A-Za-z]:[\\/]+Users[\\/]+(<non-ascii user>|[^\\/]*(\\x[0-9A-Fa-f]{2}|[^\x00-\x7f]))/.test(t))
				s.nonAsciiUser = true;

			let m = HEADER.exec(t);
			if (m) {
				s.build = Number(m[1]);
				s.sha = m[2];
				s.networkEpoch = m[3] ? Number(m[3]) : null;
				continue;
			}
			m = LAUNCHER_BUILD.exec(t);
			if (m) {
				launcherBuild = Number(m[1]);
				continue;
			}
			if (t.includes('[vk] ')) sawVulkan = true;
			if (t.includes('[d3d12] ')) sawD3d12 = true;

			m = /\[vk\] loader API ([\d.]+)/.exec(t);
			if (m) s.vkLoader = m[1];
			m = /\[vk\] device API ([\d.]+)/.exec(t);
			if (m) s.vkDevice = m[1];
			m = /\[vk\] driver version (\d+)/.exec(t);
			if (m) driverRaw = Number(m[1]);
			m = /\[vk\] validation requested=(\w+) enabled=(\w+)/.exec(t);
			if (m) s.validation = { requested: m[1] === 'true', enabled: m[2] === 'true' };
			if (/LDV_VK_SKIP_BLOCKLIST set/.test(t)) s.blocklistOverride = true;

			m = VK_ADAPTER.exec(t);
			if (m) {
				upsert({
					api: 'vulkan',
					index: Number(m[1]),
					name: m[2],
					type: m[3],
					vendorId: m[4].toLowerCase(),
					deviceId: m[5].toLowerCase(),
					vendor: vendorFromId(m[4]),
					memoryMb: Number(m[6]),
					skipped: null,
					software: m[3] === 'Software' || vendorFromId(m[4]) === 'llvmpipe'
				});
				continue;
			}
			m = VK_SKIPPED.exec(t);
			if (m) {
				upsert({
					api: 'vulkan',
					index: Number(m[1]),
					name: m[2],
					type: null,
					vendorId: null,
					deviceId: null,
					vendor: /intel/i.test(m[2]) ? 'intel' : /nvidia|geforce/i.test(m[2]) ? 'nvidia' : /amd|radeon/i.test(m[2]) ? 'amd' : 'unknown',
					memoryMb: null,
					skipped: m[3],
					software: false
				});
				continue;
			}
			m = VK_SELECTED.exec(t);
			if (m && !t.includes('[d3d12]')) {
				vkSelectedIndex = Number(m[1]);
				continue;
			}
			m = DX_ADAPTER.exec(t);
			if (m) {
				upsert({
					api: 'd3d12',
					index: Number(m[1]),
					name: m[2],
					type: m[3],
					vendorId: m[4].toLowerCase(),
					deviceId: m[5].toLowerCase(),
					vendor: vendorFromId(m[4]),
					memoryMb: Number(m[6]),
					skipped: null,
					software: m[3] === 'Software' || vendorFromId(m[4]) === 'microsoft-software'
				});
				continue;
			}
			m = DX_SKIPPED.exec(t);
			if (m) {
				const a = byKey.get(`d3d12:${m[1]}`);
				if (a) a.skipped = m[2];
				continue;
			}
			m = DX_SELECTED.exec(t);
			if (m) {
				dxSelectedName = m[1];
				continue;
			}

			if (/Vulkan backend failed; trying D3D12/.test(t)) s.fallback.push('Vulkan failed, so Luduvo tried D3D12');
			else if (/Vulkan unavailable: .*using D3D12/.test(t))
				s.fallback.push('Vulkan was unavailable, so Luduvo used D3D12');

			m = /Renderer up: (\d+x\d+)/.exec(t);
			if (m) s.resolution = m[1];
			m = /connected to (\S+:\d+|\(encrypted\))/.exec(t);
			if (m && !/failed to connect/.test(t)) {
				s.connected = true;
				s.server = m[1].startsWith('(') ? null : m[1];
			}
			if (/\] Quit\.\s*$/.test(t)) s.cleanQuit = true;
			if (/\.metallib|shaders[\\/]metal/.test(t)) s.backend ??= 'metal';
		}
	}

	s.build ??= launcherBuild ?? stateBuild;

	if (dxSelectedName) {
		s.backend = 'd3d12';
		s.selected = byKey.get(`d3d12:${dxSelectedName}`) ?? null;
	} else if (vkSelectedIndex !== null) {
		s.backend = 'vulkan';
		s.selected =
			s.adapters.find((a) => a.api === 'vulkan' && a.index === vkSelectedIndex && a.vendorId) ??
			s.adapters.find((a) => a.api === 'vulkan' && a.index === vkSelectedIndex) ??
			null;
	} else if (!s.backend) {
		s.backend = sawD3d12 ? 'd3d12' : sawVulkan ? 'vulkan' : null;
	}

	if (driverRaw !== null) {
		const vendor = s.selected?.vendor ?? 'unknown';
		s.driver = decodeDriver(driverRaw, vendor, s.os);
	}
	return s;
}
