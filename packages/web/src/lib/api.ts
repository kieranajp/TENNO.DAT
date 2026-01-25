const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export interface LoadoutItem {
	id: number;
	name: string;
	imageName: string | null;
	category: string;
}

export interface Loadout {
	warframe: LoadoutItem | null;
	primary: LoadoutItem | null;
	secondary: LoadoutItem | null;
	melee: LoadoutItem | null;
	focusSchool: string | null;
}

export interface MasterySummary {
	categories: Array<{
		category: string;
		total: number;
		mastered: number;
	}>;
	totals: { total: number; mastered: number };
	loadout: Loadout | null;
	lastSyncAt: string | null;
	displayName: string | null;
}

export interface MasteryItem {
	id: number;
	uniqueName: string;
	name: string;
	category: string;
	isPrime: boolean;
	masteryReq: number;
	maxRank: number;
	imageName: string | null;
	vaulted: boolean | null;
	xp: number | null;
	isMastered: boolean | null;
}

export interface PlayerSettings {
	id: number;
	playerId: string;
	platform: string;
	displayName: string | null;
	lastSyncAt: string | null;
}

export interface SyncResult {
	success: boolean;
	synced: number;
	mastered: number;
	error?: string;
}

export async function getMasterySummary(): Promise<MasterySummary> {
	const res = await fetch(`${API_BASE}/mastery/summary`);
	if (!res.ok) {
		throw new Error('Failed to fetch mastery summary');
	}
	return res.json();
}

export async function getMasteryItems(params?: {
	category?: string;
	mastered?: boolean;
	unmastered?: boolean;
}): Promise<MasteryItem[]> {
	const searchParams = new URLSearchParams();
	if (params?.category) searchParams.set('category', params.category);
	if (params?.mastered) searchParams.set('mastered', 'true');
	if (params?.unmastered) searchParams.set('unmastered', 'true');

	const res = await fetch(`${API_BASE}/mastery/items?${searchParams}`);
	if (!res.ok) {
		throw new Error('Failed to fetch mastery items');
	}
	return res.json();
}

export async function getSettings(): Promise<PlayerSettings | null> {
	const res = await fetch(`${API_BASE}/sync/settings`);
	if (!res.ok) {
		return null;
	}
	return res.json();
}

export async function saveSettings(playerId: string, platform: string): Promise<void> {
	const res = await fetch(`${API_BASE}/sync/settings`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ playerId, platform })
	});
	if (!res.ok) {
		throw new Error('Failed to save settings');
	}
}

export async function syncProfile(): Promise<SyncResult> {
	const res = await fetch(`${API_BASE}/sync/profile`, { method: 'POST' });
	return res.json();
}

export function getImageUrl(imageName: string | null): string | null {
	if (!imageName) return null;
	return `https://cdn.warframestat.us/img/${imageName}`;
}
