/* Every source with live items in the catalogue, with one real image URL
 * and one real object-page URL each (copied from ingested rows, not
 * guessed from docs).
 *
 * The app keeps several hand-written per-source lists (the image proxy's
 * allowlist, the health check, labels, saved-collection keys, the API
 * docs). None of them fail loudly when a source is missing -- the gap
 * only shows up in production -- and new sources have repeatedly gone
 * live missing some of them. tests/live-sources.test.ts checks every list
 * against this one, so adding a source here is the single step that
 * surfaces every other place it needs to go.
 */
export const LIVE_SOURCES: Record<string, { image: string; page: string }> = {
  met: {
    image: "https://images.metmuseum.org/CRDImages/ad/web-large/144703.jpg",
    page: "https://www.metmuseum.org/art/collection/search/100",
  },
  smithsonian: {
    image: "https://ids.si.edu/ids/download?id=SAAM-1950.6.14_1_screen",
    page: "https://americanart.si.edu/collections/search/artwork/?id=4970",
  },
  cleveland: {
    image: "https://openaccess-cdn.clevelandart.org/1919.55/1919.55_web.jpg",
    page: "https://clevelandart.org/art/1919.55",
  },
  commons: {
    image: "https://upload.wikimedia.org/wikipedia/commons/8/8e/Example.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Example.jpg",
  },
  europeana: {
    image:
      "https://api.europeana.eu/thumbnail/v2/url.json?uri=http%3A%2F%2Fwww.webumenia.sk%2Fdielo%2FSVK%3ASNG.G_10045-12%2Fstiahnut&type=IMAGE",
    page: "https://www.europeana.eu/item/07101/G_10045_12",
  },
  npm: {
    image:
      "https://iiifod.npm.gov.tw/iiif/2/K1F%2FK1F001541N000000000PAA/full/,1200/0/default.jpg",
    page: "https://digitalarchive.npm.gov.tw/Collection/Detail?id=100&dep=U",
  },
  wellcome: {
    image:
      "https://iiif.wellcomecollection.org/image/V0043838/full/843,/0/default.jpg",
    page: "https://wellcomecollection.org/works/a22snhqe",
  },
  nga: {
    image:
      "https://api.nga.gov/iiif/7bbcfd01-e774-46e7-96d1-a3b03598cd8a/full/843,/0/default.jpg",
    page: "https://www.nga.gov/collection/art-object-page.1.html",
  },
  tepapa: {
    image: "https://media.tepapa.govt.nz/collection/271820/full",
    page: "https://collections.tepapa.govt.nz/object/1130277",
  },
};

export const LIVE_SOURCE_IDS = Object.keys(LIVE_SOURCES);
