import { error } from '@sveltejs/kit';
import catalogJson from '$data/signatures.json';
import type { Catalog } from '$lib/match/catalog';
import type { EntryGenerator, PageLoad } from './$types';

const catalog = catalogJson as unknown as Catalog;

export const entries: EntryGenerator = () => catalog.signatures.map((s) => ({ id: s.id }));

export const load: PageLoad = ({ params }) => {
	const sig = catalog.signatures.find((s) => s.id === params.id);
	if (!sig) error(404, 'No such issue');
	const causedBy = catalog.signatures.filter((s) => s.leads_to?.includes(sig.id));
	const leadsTo = catalog.signatures.filter((s) => sig.leads_to?.includes(s.id));
	return { sig, causedBy, leadsTo };
};
