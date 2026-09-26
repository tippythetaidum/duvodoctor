import type { DriverVersion, Os, Vendor } from '../types.ts';

export function vendorFromId(id: string | null): Vendor {
	switch (id?.toLowerCase()) {
		case '0x10de':
			return 'nvidia';
		case '0x1002':
			return 'amd';
		case '0x8086':
			return 'intel';
		case '0x106b':
			return 'apple';
		case '0x1414':
			return 'microsoft-software';
		case '0x10005':
			return 'llvmpipe';
		default:
			return 'unknown';
	}
}

export const VENDOR_NAMES: Record<Vendor, string> = {
	nvidia: 'NVIDIA',
	amd: 'AMD',
	intel: 'Intel',
	apple: 'Apple',
	'microsoft-software': 'Microsoft Basic Render Driver (software)',
	llvmpipe: 'llvmpipe (software)',
	unknown: 'Unknown vendor'
};

function vulkanPacked(v: number): string {
	return `${v >>> 22}.${(v >>> 12) & 0x3ff}.${v & 0xfff}`;
}

export function decodeDriver(raw: number, vendor: Vendor, os: Os | null): DriverVersion {
	const v = raw >>> 0;
	switch (vendor) {
		case 'nvidia': {
			const minor = (v >>> 14) & 0xff;
			return {
				raw,
				decoded: `${(v >>> 22) & 0x3ff}.${String(minor).padStart(2, '0')}`,
				scheme: 'NVIDIA packing'
			};
		}
		case 'amd':
			return { raw, decoded: vulkanPacked(v), scheme: 'Vulkan packing' };
		case 'intel':
			if (os === 'linux') return { raw, decoded: vulkanPacked(v), scheme: 'Mesa (Vulkan packing)' };
			return { raw, decoded: null, scheme: 'Intel Windows packing is not checked yet' };
		default:
			return { raw, decoded: null, scheme: 'shown as reported' };
	}
}
