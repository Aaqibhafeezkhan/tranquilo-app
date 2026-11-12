// Starts both lookups before awaiting either.
export function loadOpening<H, P>(
  fetchHeroes: (() => Promise<H[]>) | null,
  fetchPage: () => Promise<P>,
): Promise<{ heroes: H[]; page: P }> {
  const heroes = fetchHeroes ? fetchHeroes() : Promise.resolve([] as H[]);
  const page = fetchPage();
  return Promise.all([heroes, page]).then(([h, p]) => ({
    heroes: h,
    page: p,
  }));
}
