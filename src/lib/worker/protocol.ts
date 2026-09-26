import type { Analysis } from '../types.ts';
import type { MatchResult } from '../match/engine.ts';

export type Input = { type: 'file'; file: File } | { type: 'text'; name: string; text: string };

export interface AnalyseRequest {
	id: number;
	inputs: Input[];
}

export type AnalyseResponse =
	| { id: number; ok: true; analysis: Analysis; result: MatchResult }
	| { id: number; ok: false; error: string };
