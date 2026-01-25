/**
 * Ordered list of masterable categories.
 * Used for consistent display order across the app.
 */
export const CATEGORY_ORDER = [
	'Warframes',
	'Primary',
	'Secondary',
	'Melee',
	'Kitgun',
	'Zaw',
	'Amp',
	'Pets',
	'Sentinels',
	'SentinelWeapons',
	'Archwing',
	'ArchGun',
	'ArchMelee',
	'Necramechs',
	'Vehicles',
] as const;

export type MasterableCategory = (typeof CATEGORY_ORDER)[number];

/**
 * Sort categories by the defined order.
 * Unknown categories are placed at the end alphabetically.
 */
export function sortByCategory<T extends { category: string }>(items: T[]): T[] {
	return [...items].sort((a, b) => {
		const aIndex = CATEGORY_ORDER.indexOf(a.category as MasterableCategory);
		const bIndex = CATEGORY_ORDER.indexOf(b.category as MasterableCategory);

		// Both in order list: sort by order
		if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
		// Only a in list: a comes first
		if (aIndex !== -1) return -1;
		// Only b in list: b comes first
		if (bIndex !== -1) return 1;
		// Neither in list: alphabetical
		return a.category.localeCompare(b.category);
	});
}
