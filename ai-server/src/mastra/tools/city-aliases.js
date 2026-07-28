const CITY_ALIAS_GROUPS = [
  { canonical: 'Wien', aliases: ['Vienna'] },
  { canonical: 'Rome', aliases: ['Rom'] },
  { canonical: 'Munich', aliases: ['München', 'Muenchen'] },
  { canonical: 'Prague', aliases: ['Prag'] },
  { canonical: 'Cologne', aliases: ['Köln', 'Koeln'] },
  { canonical: 'Florence', aliases: ['Florenz'] },
  { canonical: 'Venice', aliases: ['Venedig'] },
  { canonical: 'Milan', aliases: ['Mailand'] },
  { canonical: 'Naples', aliases: ['Neapel'] },
  { canonical: 'Geneva', aliases: ['Genf'] },
  { canonical: 'Lisbon', aliases: ['Lissabon'] },
  { canonical: 'Warsaw', aliases: ['Warschau'] },
  { canonical: 'Copenhagen', aliases: ['Kopenhagen'] },
  { canonical: 'Athens', aliases: ['Athen'] },
  { canonical: 'Brussels', aliases: ['Brüssel', 'Bruessel'] },
];
function findGroup(city) {
  const lower = city.trim().toLowerCase();
  return CITY_ALIAS_GROUPS.find(
    (group) =>
      group.canonical.toLowerCase() === lower ||
      group.aliases.some((alias) => alias.toLowerCase() === lower),
  );
}
/**
 * Returns the spellings to try for a lookup: the caller's spelling first (exact
 * match wins), then the canonical spelling (the flight API's spelling, the most
 * likely hit), then the remaining variants.
 */
export function cityCandidates(city) {
  const trimmed = city.trim();
  const lower = trimmed.toLowerCase();
  const group = findGroup(trimmed);
  if (!group) {
    return [trimmed];
  }
  const ordered = [group.canonical, ...group.aliases];
  return [trimmed, ...ordered.filter((name) => name.toLowerCase() !== lower)];
}
/**
 * Maps any known spelling of a city to its canonical one, so flights and hotels
 * for the same city always use an identical name. Unknown cities pass through
 * unchanged.
 */
export function canonicalCity(city) {
  const trimmed = city.trim();
  return findGroup(trimmed)?.canonical ?? trimmed;
}
