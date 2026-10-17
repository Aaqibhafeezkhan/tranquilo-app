// "Cite this work": an MLA 9 or APA 7 citation for an artwork, built only
// from fields the item actually has. The work is cited at the institution
// that holds it, via its own object page -- not via Tranquilo, and not via
// the caption's grounding sources (those support the caption, not the
// work's identity).
//
// Deliberately conservative:
// - A missing field is dropped, never printed as a blank or "Unknown".
// - The artist string is used as stored. Both styles prefer "Surname,
//   Given" for people, but inverting names automatically goes wrong for
//   single names, workshops, cultures and non-Western name order, and a
//   wrong name is worse than an un-inverted one.
// - Plain text: the styles italicize the title, which a clipboard of plain
//   text can't carry.
// Citation styles are English-language conventions, so the text stays in
// English whatever the interface language is.
import { isRealArtist } from "../logic/logic";
import { institutionName } from "./ExportService";

export type CitationStyle = "mla" | "apa";

export interface CitableItem {
  source?: string | null;
  title?: string | null;
  artist?: string | null;
  date?: string | null;
  medium?: string | null;
  url?: string | null;
}

// MLA abbreviates months of five letters or more, and not with a uniform
// three letters (MLA Handbook 9, appendix 1).
const MLA_MONTHS = [
  "Jan.",
  "Feb.",
  "Mar.",
  "Apr.",
  "May",
  "June",
  "July",
  "Aug.",
  "Sept.",
  "Oct.",
  "Nov.",
  "Dec.",
];

function clean(value: string | null | undefined): string {
  return (value ?? "").trim();
}

// Ends a segment with a full stop unless it already ends in terminal
// punctuation ("Who Goes There?" stays as is).
function sentence(text: string): string {
  return /[.?!]$/.test(text) ? text : `${text}.`;
}

function mla(item: CitableItem, accessed: Date): string {
  const artist = isRealArtist(item.artist) ? clean(item.artist) : "";
  const title = clean(item.title) || "Untitled";
  const dateMedium = [clean(item.date), clean(item.medium)]
    .filter(Boolean)
    .join(", ");
  const url = clean(item.url).replace(/^https?:\/\//, "");
  const where = [institutionName(item), url].filter(Boolean).join(", ");
  const accessedOn = `Accessed ${accessed.getDate()} ${MLA_MONTHS[accessed.getMonth()]} ${accessed.getFullYear()}.`;
  return [artist, title, dateMedium, where]
    .filter(Boolean)
    .map(sentence)
    .concat(url ? [accessedOn] : [])
    .join(" ");
}

function apa(item: CitableItem): string {
  const artist = isRealArtist(item.artist) ? clean(item.artist) : "";
  const title = clean(item.title) || "Untitled";
  const medium = clean(item.medium);
  const titlePart = sentence(medium ? `${title} [${medium}]` : title);
  const datePart = `(${clean(item.date) || "n.d."}).`;
  const institution = clean(institutionName(item));
  // APA moves the title into the author position when there's no author.
  const lead = artist
    ? [sentence(artist), datePart, titlePart]
    : [titlePart, datePart];
  return [...lead, institution ? sentence(institution) : "", clean(item.url)]
    .filter(Boolean)
    .join(" ");
}

export function formatCitation(
  item: CitableItem,
  style: CitationStyle,
  accessed: Date = new Date(),
): string {
  return style === "mla" ? mla(item, accessed) : apa(item);
}
