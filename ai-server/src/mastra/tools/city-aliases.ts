/**
 * The demo flight API stores city names inconsistently (some English, some
 * German — e.g. "Rome" but "Wien") and is name-sensitive, so a lookup for a
 * translated spelling like "Vienna" returns nothing. The synthetic hotel data,
 * on the other hand, echoes whatever name it is given. To keep flights and
 * hotels for the same city consistent (the plan ties them together by name),
 * we treat known exonyms as one city and pick a single canonical spelling.
 */
interface CityAliasGroup {
  /**
   * Canonical spelling — set to the spelling the flight API actually uses for
   * this city, so hotels (which just echo the name) stay consistent with
   * flights. Verified cases: the API uses the German "Wien" for Vienna and the
   * English "Rome" for Rome. For unverified cities the English name is used as
   * a best guess; adjust here if the API turns out to use another spelling.
   */
  canonical: string;
  /** Other spellings that map to the same city. */
  aliases: readonly string[];
}

const CITY_ALIAS_GROUPS: readonly CityAliasGroup[] = [
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

function findGroup(city: string): CityAliasGroup | undefined {
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
export function cityCandidates(city: string): string[] {
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
export function canonicalCity(city: string): string {
  const trimmed = city.trim();
  return findGroup(trimmed)?.canonical ?? trimmed;
}
