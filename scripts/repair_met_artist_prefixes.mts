#!/usr/bin/env node
//
// Restore hedging prefixes dropped from Met artists, and record attribution
// history ("Formerly attributed to") in the credit line.
// Updates are guarded on the old values, so re-running is safe.
//
//   bun scripts/repair_met_artist_prefixes.mts            # dry run
//   bun scripts/repair_met_artist_prefixes.mts --commit

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const STAMP = new Date().toISOString().slice(0, 16).replace(":", "");
const AUDIT = path.join(
  ROOT,
  `data/reference/met-prefix-repair-audit-${STAMP}.json`,
);
const COMMIT = process.argv.includes("--commit");

// [native_id, [stored artist, new artist] | null, notes to append to credit]
const ROWS: [string, [string, string] | null, string[]][] = [
  ["7999", ["John Coney", "Probably John Coney"], []],
  ["10028", null, ["Formerly attributed to John La Farge"]],
  ["11191", null, ["Formerly attributed to Henry Inman"]],
  ["12739", null, ["Formerly attributed to Pavel Petrovich Svinin"]],
  ["12977", null, ["Formerly attributed to John Smibert"]],
  ["36021", null, ["Formerly attributed to Guanxiu"]],
  ["36032", null, ["Formerly Attributed to Li Gonglin"]],
  ["36033", null, ["Formerly Attributed to Jiang Shen"]],
  ["36049", null, ["Formerly Attributed to Guo Xi"]],
  ["36066", null, ["Formerly Attributed to Yao Wenhan"]],
  ["36146", null, ["Formerly attributed to Wang Gong"]],
  ["51389", null, ["Formerly attributed to Wu Bing"]],
  ["221463", null, ["Formerly attributed to Jean François Bony"]],
  ["267935", null, ["Formerly attributed to Mathew B. Brady"]],
  ["267977", null, ["Formerly attributed to Mathew B. Brady"]],
  ["267978", null, ["Formerly attributed to Mathew B. Brady"]],
  ["267981", null, ["Formerly attributed to Mathew B. Brady"]],
  ["267997", null, ["Formerly attributed to Mathew B. Brady"]],
  ["268029", null, ["Formerly attributed to Mathew B. Brady"]],
  ["268059", null, ["Formerly attributed to Mathew B. Brady"]],
  ["268100", null, ["Formerly attributed to Mathew B. Brady"]],
  ["268101", null, ["Formerly attributed to Mathew B. Brady"]],
  ["268121", null, ["Formerly attributed to Mathew B. Brady"]],
  ["268128", null, ["Formerly attributed to Mathew B. Brady"]],
  ["268178", null, ["Formerly attributed to Mathew B. Brady"]],
  ["268216", null, ["Formerly attributed to Mathew B. Brady"]],
  ["268217", null, ["Formerly attributed to Mathew B. Brady"]],
  ["268225", null, ["Formerly attributed to Mathew B. Brady"]],
  ["268360", ["Platt D. Babbitt", "Attributed to Platt D. Babbitt"], []],
  ["283897", null, ["Formerly attributed to Mathew B. Brady"]],
  ["302676", ["Alma A. Pelot", "Attributed to Alma A. Pelot"], []],
  [
    "334241",
    null,
    ["Formerly attributed to Goya (Francisco de Goya y Lucientes)"],
  ],
  ["334258", null, ["Formerly attributed to copy after Honoré Daumier"]],
  ["334313", null, ["Formerly attributed to Eugène Delacroix"]],
  ["334314", null, ["Formerly attributed to Jacques Louis David"]],
  ["334696", null, ["Formerly attributed to Jean Bernard Restout"]],
  [
    "334697",
    null,
    [
      "Formerly attributed to Hans Baldung (called Hans Baldung Grien)",
      "Formerly attributed to Anonymous, German, 16th century",
    ],
  ],
  ["334702", null, ["Formerly attributed to Martin Fréminet"]],
  ["334781", null, ["Formerly attributed to Albrecht Dürer"]],
  ["334795", null, ["Formerly attributed to Johann Georg Bergmüller"]],
  [
    "334800",
    ["Lucas Cranach the Elder", "Workshop of Lucas Cranach the Elder"],
    [],
  ],
  ["334803", null, ["Formerly attributed to Wendel Dietterlin, the Elder"]],
  ["334818", null, ["Formerly attributed to Albrecht Dürer"]],
  ["334821", null, ["Formerly attributed to Adam Elsheimer"]],
  ["334858", null, ["Formerly attributed to Federico Zuccaro (Zuccari)"]],
  [
    "334859",
    null,
    ["Formerly attributed to Jacopo Tintoretto (Jacopo Robusti)"],
  ],
  ["334862", null, ["Formerly attributed to Anonymous, German, 19th century"]],
  ["334863", null, ["Formerly attributed to Anonymous, German, 19th century"]],
  ["334864", null, ["Formerly attributed to Johann Friedrich Overbeck"]],
  ["334867", null, ["Formerly attributed to Anonymous, German, 19th century"]],
  [
    "334874",
    null,
    [
      "Formerly attributed to Hans Holbein the Younger",
      "Formerly attributed to Anonymous, German, 16th century",
    ],
  ],
  ["334883", null, ["Formerly attributed to Joseph Heintz the Elder"]],
  ["334891", null, ["Formerly attributed to Johann Matthias Kager"]],
  ["334894", null, ["Formerly attributed to Lucas Kilian"]],
  ["334923", null, ["Formerly attributed to Anonymous, German"]],
  ["334930", null, ["Formerly attributed to Maria Sibylla Merian"]],
  ["334970", null, ["Formerly attributed to Israhel van Meckenem"]],
  ["334997", null, ["Formerly attributed to Claude Gillot"]],
  ["335037", null, ["Formerly attributed to Johann Tobias Sergel"]],
  ["335044", null, ["Formerly attributed to Pieter Aertsen"]],
  ["335110", null, ["Formerly attributed to Paul Bril"]],
  ["335119", null, ["Formerly attributed to Jan Brueghel the Elder"]],
  ["335120", null, ["Formerly attributed to Jan Brueghel the Elder"]],
  ["335123", null, ["Formerly attributed to School of Jan Brueghel the Elder"]],
  [
    "335125",
    null,
    [
      "Formerly attributed to Pieter Bruegel the Elder",
      "Formerly attributed to Cornelis Cort",
      "Formerly attributed to Pieter Brueghel the Younger",
      "Formerly attributed to Joos van Liere",
    ],
  ],
  [
    "335173",
    null,
    ["Formerly attributed to Peter Candid (Pieter de Witte, Pietro Candido)"],
  ],
  ["335177", null, ["Formerly attributed to Dirck Vellert"]],
  ["335202", null, ["Formerly attributed to Simon van der Does"]],
  ["335261", null, ["Formerly attributed to Allart van Everdingen"]],
  [
    "335262",
    null,
    ["Formerly attributed to Anonymous, Netherlandish, 17th century"],
  ],
  ["335268", null, ["Formerly attributed to Anonymous, Dutch, 17th century"]],
  [
    "335269",
    null,
    ["Formerly attributed to Anonymous, Netherlandish, 17th century"],
  ],
  [
    "335270",
    null,
    ["Formerly attributed to Anonymous, Netherlandish, 17th century"],
  ],
  ["335272", null, ["Formerly attributed to Anonymous, Dutch, 17th century"]],
  [
    "335276",
    null,
    ["Formerly attributed to Anonymous, Netherlandish, 16th century"],
  ],
  [
    "335328",
    null,
    ["Formerly attributed to Anonymous, Netherlandish, 16th century"],
  ],
  ["335365", null, ["Formerly attributed to Hans von Aachen"]],
  ["335368", null, ["Formerly attributed to Johann Jakob Scheuchzer"]],
  ["335416", null, ["Formerly attributed to Juste Aurèle Meissonnier"]],
  ["335428", null, ["Formerly attributed to Jean Jacques Huvé"]],
  ["335448", null, ["Formerly attributed to Anthony van Dyck"]],
  [
    "335501",
    null,
    ["Formerly attributed to Anonymous, Netherlandish, 16th century"],
  ],
  [
    "335513",
    null,
    [
      "Formerly attributed to Anonymous, Flemish, 18th century",
      "Formerly attributed to Denijs Calvaert",
      "Formerly attributed to Jan de Bisschop",
    ],
  ],
  ["335683", null, ["Formerly attributed to Johann Jakob Scheuchzer"]],
  [
    "335685",
    null,
    [
      "Formerly attributed to Pieter Soutman",
      "Formerly attributed to Pieter de Kempeneer",
    ],
  ],
  ["335690", null, ["Formerly attributed to Matthias Wolf"]],
  ["335711", null, ["Formerly attributed to Tobias Stimmer"]],
  ["335714", null, ["Formerly attributed to Moritz von Schwind"]],
  ["335772", null, ["Formerly attributed to Anonymous, German, 19th century"]],
  ["335778", null, ["Formerly attributed to Anonymous, German, 19th century"]],
  ["335794", null, ["Formerly attributed to Anonymous, German, 19th century"]],
  ["335812", null, ["Formerly attributed to Giovanni Battista Cipriani"]],
  ["335813", null, ["Formerly attributed to Anonymous, German, 16th century"]],
  ["335814", null, ["Formerly attributed to Ennemond Alexandre Petitot"]],
  ["335830", null, ["Formerly attributed to Georges Lallemand"]],
  [
    "335859",
    null,
    ["Formerly attributed to Anonymous, Netherlandish, 16th century"],
  ],
  [
    "335862",
    null,
    ["Formerly attributed to Anonymous, Netherlandish, 16th century"],
  ],
  [
    "335864",
    null,
    ["Formerly attributed to Anonymous, Netherlandish, 16th century"],
  ],
  [
    "335865",
    null,
    ["Formerly attributed to Anonymous, Netherlandish, 16th century"],
  ],
  [
    "335866",
    null,
    ["Formerly attributed to Anonymous, Netherlandish, 16th century"],
  ],
  [
    "335872",
    null,
    [
      "Formerly attributed to Anonymous, Netherlandish, 16th century",
      "Formerly attributed to Anonymous, Italian, 16th century",
      "Formerly attributed to Hendrick Goltzius",
    ],
  ],
  [
    "335874",
    null,
    [
      "Formerly attributed to Anonymous, Netherlandish, 16th century",
      "Formerly attributed to an artist of the circle of Jan Gossart (called Mabuse)",
    ],
  ],
  [
    "335877",
    null,
    ["Formerly attributed to Anonymous, Netherlandish, 16th century"],
  ],
  [
    "335878",
    null,
    ["Formerly attributed to Anonymous, Netherlandish, 16th century"],
  ],
  ["335880", null, ["Formerly attributed to Anonymous, Flemish, 17th century"]],
  ["335885", null, ["Formerly attributed to Anonymous, 16th century"]],
  ["335886", null, ["Formerly attributed to Anonymous, 16th century"]],
  ["335893", null, ["Formerly attributed to Anonymous, 16th century"]],
  ["335899", null, ["Formerly attributed to Anonymous, 16th century"]],
  ["335900", null, ["Formerly attributed to Anonymous, 16th century"]],
  ["335901", null, ["Formerly attributed to Anonymous, 16th century"]],
  ["335913", null, ["Formerly attributed to Ennemond Alexandre Petitot"]],
  ["335914", null, ["Formerly attributed to Ennemond Alexandre Petitot"]],
  ["335915", null, ["Formerly attributed to Ennemond Alexandre Petitot"]],
  ["335916", null, ["Formerly attributed to Ennemond Alexandre Petitot"]],
  ["335917", null, ["Formerly attributed to Ennemond Alexandre Petitot"]],
  ["336021", null, ["Formerly attributed to Hans Speckaert"]],
  ["336088", null, ["Formerly attributed to Peter Vischer the Younger"]],
  [
    "336089",
    null,
    [
      "Formerly attributed to Peter Vischer the Younger",
      "Formerly attributed to Anonymous, German, 16th century",
    ],
  ],
  ["336408", null, ["Formerly attributed to Sébastien Bourdon"]],
  ["336483", null, ["Formerly attributed to Claude Lorrain (Claude Gellée)"]],
  ["336666", null, ["Formerly attributed to Noël Coypel"]],
  ["336776", null, ["Formerly attributed to Anonymous, French, 16th century"]],
  ["336777", null, ["Formerly attributed to Michel Corneille the Elder"]],
  ["336890", null, ["Formerly attributed to Anonymous, Italian, 18th century"]],
  ["336899", null, ["Formerly attributed to Jan Muller"]],
  [
    "336937",
    null,
    [
      "Formerly attributed to Anonymous, German, 17th century",
      "Formerly attributed to (?) Godefroy Stein",
    ],
  ],
  ["336948", null, ["Formerly attributed to Francesco Solimena"]],
  ["336977", null, ["Formerly attributed to Anonymous, French, 18th century"]],
  ["337078", null, ["Formerly attributed to Louis de Silvestre"]],
  ["337081", null, ["Formerly attributed to Antoine Watteau"]],
  ["337189", null, ["Formerly attributed to Théodore Géricault"]],
  ["337191", null, ["Formerly attributed to Théodore Géricault"]],
  ["337196", null, ["Formerly attributed to Antoine Watteau"]],
  ["337197", null, ["Formerly attributed to Antoine Watteau"]],
  ["337202", null, ["Formerly attributed to Anne Louis Girodet-Trioson"]],
  ["337346", null, ["Formerly attributed to Pieter Bruegel the Elder"]],
  [
    "337425",
    null,
    [
      "Formerly attributed to Hans Baldung (called Hans Baldung Grien)",
      "Formerly attributed to Sebald Beham",
    ],
  ],
  ["337482", null, ["Formerly attributed to Jean-Baptiste Jouvenet"]],
  ["337511", null, ["Formerly attributed to Antonio de Pereda"]],
  ["337526", null, ["Formerly attributed to Antoine Watteau"]],
  ["337586", null, ["Formerly attributed to Charles Le Brun"]],
  ["337682", null, ["Formerly attributed to circle of Antoine Watteau"]],
  ["337689", null, ["Formerly attributed to Nicolas Bernard Lépicié"]],
  ["337694", null, ["Formerly attributed to Anonymous, French, 18th century"]],
  ["337695", null, ["Formerly attributed to Anonymous, French, 18th century"]],
  ["337697", null, ["Formerly attributed to Eustache Le Sueur"]],
  ["337775", null, ["Formerly attributed to Pierre Mignard"]],
  [
    "337804",
    null,
    [
      "Formerly attributed to Jonas Umbach",
      "Formerly attributed to Anonymous, German, 18th century",
    ],
  ],
  ["337875", null, ["Formerly attributed to Charles Joseph Natoire"]],
  [
    "337900",
    null,
    ["Formerly attributed to Jean Pierre Norblin de la Gourdaine"],
  ],
  ["338018", null, ["Formerly attributed to Carracci School"]],
  ["338043", null, ["Formerly attributed to Carracci School"]],
  ["338046", null, ["Formerly attributed to Carracci School"]],
  ["338055", null, ["Formerly attributed to Francesco Allegrini"]],
  ["338112", null, ["Formerly attributed to Luigi Garzi"]],
  ["338152", null, ["Formerly attributed to John Singleton Copley"]],
  ["338153", null, ["Formerly attributed to John Singleton Copley"]],
  ["338154", null, ["Formerly attributed to John Singleton Copley"]],
  ["338155", null, ["Formerly attributed to John Singleton Copley"]],
  ["338156", null, ["Formerly attributed to John Singleton Copley"]],
  ["338157", null, ["Formerly attributed to John Singleton Copley"]],
  ["338158", null, ["Formerly attributed to John Singleton Copley"]],
  ["338159", null, ["Formerly attributed to John Singleton Copley"]],
  ["338160", null, ["Formerly attributed to John Singleton Copley"]],
  ["338195", null, ["Formerly attributed to Anonymous, French, 18th century"]],
  ["338364", ["Antonio Canaletto", "After Antonio Canaletto"], []],
  ["338371", null, ["Formerly attributed to Antonio Canova"]],
  ["338372", null, ["Formerly attributed to Antonio Canova"]],
  ["338373", null, ["Formerly attributed to Antonio Canova"]],
  ["338374", null, ["Formerly attributed to Antonio Canova"]],
  ["338375", null, ["Formerly attributed to Antonio Canova"]],
  ["338376", null, ["Formerly attributed to Antonio Canova"]],
  ["338377", null, ["Formerly attributed to Antonio Canova"]],
  ["338424", null, ["Formerly attributed to Carracci School"]],
  ["338427", null, ["Formerly attributed to Carracci School"]],
  [
    "338432",
    null,
    [
      "Formerly attributed to and circle of Giovanni Benedetto Castiglione (Il Grechetto)",
    ],
  ],
  [
    "338491",
    null,
    ["Formerly attributed to Cavaliere d'Arpino (Giuseppe Cesari)"],
  ],
  ["338528", null, ["Formerly attributed to Anonymous, Italian, 18th century"]],
  [
    "338561",
    null,
    ["Formerly attributed to Pietro da Cortona (Pietro Berrettini)"],
  ],
  [
    "338708",
    ["Pieter Bruegel the Elder", "After Pieter Bruegel the Elder"],
    [],
  ],
  ["338778", null, ["Formerly attributed to Alexandr Andreevic Ivanov"]],
  ["339162", null, ["Formerly attributed to Gabriel de Saint-Aubin"]],
  [
    "339685",
    null,
    [
      "Formerly attributed to Joseph Marie Vien",
      "Formerly attributed to Jean-Baptiste Marie Pierre",
    ],
  ],
  ["339692", null, ["Formerly attributed to Anonymous, French, 19th century"]],
  ["339703", null, ["Formerly attributed to Hubert Robert"]],
  ["339724", null, ["Formerly attributed to Auguste Rodin"]],
  ["339725", null, ["Formerly attributed to Auguste Rodin"]],
  ["339768", null, ["Formerly attributed to Bernard Picart"]],
  ["339770", null, ["Formerly attributed to Bernard Picart"]],
  ["339771", null, ["Formerly attributed to Bernard Picart"]],
  ["339780", null, ["Formerly attributed to Joseph Benoît Suvée"]],
  ["339786", null, ["Formerly attributed to Robert Levrac de Tournières"]],
  ["339799", null, ["Formerly attributed to Charles Le Brun"]],
  [
    "339806",
    null,
    ["Formerly attributed to Carle (Antoine Charles Horace) Vernet"],
  ],
  ["339816", null, ["Formerly attributed to baron Antoine Jean Gros"]],
  ["339819", null, ["Formerly attributed to Jean-Baptiste Mauzaisse"]],
  [
    "339834",
    null,
    [
      "Formerly attributed to Antoine Watteau",
      "Formerly attributed to Anonymous, French, 18th century",
    ],
  ],
  [
    "339835",
    null,
    [
      "Formerly attributed to Antoine Watteau",
      "Formerly attributed to Anonymous, French, 18th century",
    ],
  ],
  ["339895", null, ["Formerly attributed to Jean Michel Moreau le Jeune"]],
  ["339896", null, ["Formerly attributed to Jean Michel Moreau le Jeune"]],
  ["339900", null, ["Formerly attributed to Jean-Baptiste Greuze"]],
  ["339903", null, ["Formerly attributed to Elisabeth Louise Vigée Le Brun"]],
  ["339904", null, ["Formerly attributed to Johan Carl Loth"]],
  ["339906", null, ["Formerly attributed to Claude Lorrain (Claude Gellée)"]],
  ["339911", null, ["Formerly attributed to Robert Nanteuil"]],
  ["339914", null, ["Formerly attributed to Jean-Baptiste Joseph Pater"]],
  [
    "339918",
    null,
    [
      "Formerly attributed to school of Nicolas Poussin",
      "Formerly attributed to Anonymous, French, 17th century",
    ],
  ],
  [
    "339923",
    null,
    [
      "Formerly attributed to Pierre Dumonstier",
      "Formerly attributed to Anonymous, French, 16th century",
    ],
  ],
  ["339932", null, ["Formerly attributed to Joseph Marie Vien"]],
  ["339936", null, ["Formerly attributed to Sébastien Le Clerc, le Jeune"]],
  ["339937", null, ["Formerly attributed to Sébastien Le Clerc, le Jeune"]],
  ["340804", null, ["Formerly attributed to Pier Francesco Mola"]],
  ["341599", null, ["Formerly attributed to Antonio Canova"]],
  ["342614", null, ["Formerly attributed to Marcantonio Raimondi"]],
  ["343322", null, ["Formerly attributed to Pierre Jean Boquet"]],
  ["343361", null, ["Formerly attributed to Ange Antoine Gabriel"]],
  [
    "344703",
    null,
    ["Formerly attributed to Cavaliere d'Arpino (Giuseppe Cesari)"],
  ],
  ["345445", null, ["Formerly attributed to Johann Gottlob Matthai"]],
  ["347375", null, ["Formerly attributed to School of Lucas van Leyden"]],
  [
    "347609",
    ["Rosso Fiorentino", "Attributed to Rosso Fiorentino"],
    [
      "Formerly attributed to Anonymous, French, School of Fontainebleau, 16th century",
    ],
  ],
  ["347667", null, ["Formerly attributed to Bernard van Orley"]],
  [
    "350972",
    null,
    [
      "Formerly attributed to Tobias Verhaecht",
      "Formerly attributed to Roelandt Savery",
    ],
  ],
  ["352026", null, ["Formerly attributed to Matthäus Gundelach"]],
  ["360256", null, ["Formerly attributed to Sebastiaen Vrancx"]],
  ["362216", null, ["Formerly attributed to School of Robert Adam"]],
  [
    "365645",
    [
      "Giovanni Francesco Barbieri, called Guercino",
      "After Giovanni Francesco Barbieri, called Guercino",
    ],
    [],
  ],
  ["366825", ["Erskine Nicol", "After Erskine Nicol"], []],
  ["367772", null, ["Formerly attributed to Giorgio Ghisi"]],
  [
    "369785",
    null,
    [
      "Formerly attributed to Peter Paul Rubens",
      "Formerly attributed to Lucas van Uden",
    ],
  ],
  [
    "371790",
    ["Pieter Bruegel the Elder", "After Pieter Bruegel the Elder"],
    [],
  ],
  ["371859", null, ["Formerly attributed to Enea Vico"]],
  ["383674", ["William Blake", "After William Blake"], []],
  ["383958", null, ["Formerly attributed to Anonymous, German, 19th century"]],
  [
    "385669",
    ["Marcus Gheeraerts the Elder", "After Marcus Gheeraerts the Elder"],
    [],
  ],
  [
    "395790",
    null,
    [
      "Formerly attributed to Wolfgang Krodel the Elder",
      "Formerly attributed to Lucas Cranach the Younger",
    ],
  ],
  ["396651", null, ["Formerly attributed to Ferdinand Kobell"]],
  ["397027", ["Lorenzo Loli", "Attributed to Lorenzo Loli"], []],
  [
    "403672",
    [
      "Antonio da Sangallo, the Younger",
      "After Antonio da Sangallo, the Younger",
    ],
    [],
  ],
  ["416719", ["Hans Baldung", "After Hans Baldung"], []],
  [
    "435730",
    [
      "Botticelli (Alessandro di Mariano Filipepi)",
      "Attributed to Botticelli (Alessandro di Mariano Filipepi)",
    ],
    [],
  ],
  [
    "435731",
    [
      "Botticelli (Alessandro di Mariano Filipepi)",
      "Follower of Botticelli (Alessandro di Mariano Filipepi)",
    ],
    [],
  ],
  [
    "436493",
    [
      "Domenico Ghirlandaio (Domenico Bigordi)",
      "Workshop of Domenico Ghirlandaio (Domenico Bigordi)",
    ],
    [],
  ],
  ["436548", ["Francisco de Goya", "Attributed to Francisco de Goya"], []],
  ["436549", ["Francisco de Goya", "Copy after Francisco de Goya"], []],
  ["436552", ["Francisco de Goya", "Copy after Francisco de Goya"], []],
  ["436553", ["Francisco de Goya", "Style of Francisco de Goya"], []],
  ["436554", ["Francisco de Goya", "Attributed to Francisco de Goya"], []],
  [
    "436568",
    [
      "Francesco Granacci (Francesco di Andrea di Marco)",
      "Workshop of Francesco Granacci (Francesco di Andrea di Marco)",
    ],
    [],
  ],
  ["436577", ["El Greco", "Workshop of El Greco"], []],
  [
    "436874",
    [
      "Sir Peter Lely (Pieter van der Faes)",
      "Workshop of Sir Peter Lely (Pieter van der Faes)",
    ],
    [],
  ],
  ["437403", ["Rembrandt van Rijn", "Style of Rembrandt van Rijn"], []],
  ["437404", ["Rembrandt van Rijn", "Style of Rembrandt van Rijn"], []],
  ["437406", ["Rembrandt van Rijn", "Follower of Rembrandt van Rijn"], []],
  ["437407", ["Rembrandt van Rijn", "Follower of Rembrandt van Rijn"], []],
  ["437408", ["Rembrandt van Rijn", "Style of Rembrandt van Rijn"], []],
  ["437409", ["Rembrandt van Rijn", "Style of Rembrandt van Rijn"], []],
  ["437411", ["Rembrandt van Rijn", "Style of Rembrandt van Rijn"], []],
  ["437413", ["Rembrandt van Rijn", "Style of Rembrandt van Rijn"], []],
  ["437414", ["Rembrandt van Rijn", "Style of Rembrandt van Rijn"], []],
  ["437416", ["Rembrandt van Rijn", "Style of Rembrandt van Rijn"], []],
  ["437418", ["Rembrandt van Rijn", "Style of Rembrandt van Rijn"], []],
  ["437419", ["Rembrandt van Rijn", "Style of Rembrandt van Rijn"], []],
  ["437421", ["Rembrandt van Rijn", "Style of Rembrandt van Rijn"], []],
  [
    "437646",
    [
      "Sebastiano del Piombo (Sebastiano Luciani)",
      "Attributed to Sebastiano del Piombo (Sebastiano Luciani)",
    ],
    [],
  ],
  [
    "437872",
    [
      "Velázquez (Diego Rodríguez de Silva y Velázquez)",
      "Workshop of Velázquez (Diego Rodríguez de Silva y Velázquez)",
    ],
    [],
  ],
  [
    "440985",
    [
      "Ugolino da Siena (Ugolino di Nerio)",
      "Attributed to Ugolino da Siena (Ugolino di Nerio)",
    ],
    [],
  ],
  ["459418", ["Andrea da Murano", "Attributed to Andrea da Murano"], []],
  ["641664", ["Frederic, Lord Leighton", "After Frederic, Lord Leighton"], []],
  ["642827", ["Isaac Oliver", "After Isaac Oliver"], []],
  ["642884", ["Sir Edward John Poynter", "After Sir Edward John Poynter"], []],
  ["726235", ["Jacob Floris", "After Jacob Floris"], []],
  [
    "744100",
    null,
    ["Formerly attributed to Monogrammist G.A. with the Caltrop"],
  ],
  ["811658", ["Claude-Joseph Vernet", "After Claude-Joseph Vernet"], []],
  ["811884", ["Claude-Joseph Vernet", "After Claude-Joseph Vernet"], []],
  ["811943", ["Claude-Joseph Vernet", "After Claude-Joseph Vernet"], []],
  ["828300", ["Jean Baptiste Vanmour", "After Jean Baptiste Vanmour"], []],
  [
    "830975",
    ["G. W. Foster", "Unidentified artist"],
    ["Possibly F. Glessner or G. W. Foster"],
  ],
];

const sql = neon(process.env.DATABASE_URL!);

const withNotes = (credit: string, notes: string[]) =>
  `${credit}${credit.endsWith(".") ? "" : "."} ${notes.map((n) => `${n}.`).join(" ")}`;

interface AuditRow {
  native_id: string;
  title: string;
  artist: { from: string; to: string } | null;
  credit: { from: string; to: string } | null;
}
const audit: AuditRow[] = [];

for (const [native_id, artist, notes] of ROWS) {
  const rows = await sql.query(
    "SELECT title, artist, credit FROM items WHERE source = 'met' AND native_id = $1",
    [native_id],
  );
  const row = rows[0];
  if (!row) {
    console.log(`  skip  met ${native_id}: not found`);
    continue;
  }
  const artistChange =
    artist && row.artist === artist[0]
      ? { from: artist[0], to: artist[1] }
      : null;
  const creditNeedsNotes =
    notes.length > 0 && !notes.every((n) => (row.credit ?? "").includes(n));
  const creditChange = creditNeedsNotes
    ? { from: row.credit ?? "", to: withNotes(row.credit ?? "", notes) }
    : null;
  if (artist && !artistChange)
    console.log(`  skip  met ${native_id}: artist no longer "${artist[0]}"`);
  if (!artistChange && !creditChange) continue;
  if (artistChange)
    console.log(
      `  met ${native_id}: ${artistChange.from} -> ${artistChange.to}`,
    );
  audit.push({
    native_id,
    title: row.title as string,
    artist: artistChange,
    credit: creditChange,
  });
}
const artistCount = audit.filter((a) => a.artist).length;
const creditCount = audit.filter((a) => a.credit).length;
console.log(
  `${audit.length} row(s) to update: ${artistCount} artist, ${creditCount} credit`,
);
for (const a of audit.filter((x) => x.credit).slice(0, 4))
  console.log(`  e.g. met ${a.native_id}: ...${a.credit!.to.slice(-90)}`);

if (!COMMIT || !audit.length) {
  console.log("\nDRY RUN -- nothing written. Re-run with --commit.");
  process.exit(0);
}

fs.writeFileSync(
  AUDIT,
  `${JSON.stringify({ applied_at: new Date().toISOString(), rows: audit }, null, 2)}\n`,
);
console.log(`audit written: ${path.relative(ROOT, AUDIT)}`);

let updated = 0;
for (const r of audit) {
  const sets: string[] = [];
  const guards = ["source = 'met'", "native_id = $1"];
  const params: (string | null)[] = [r.native_id];
  if (r.artist) {
    params.push(r.artist.from, r.artist.to);
    sets.push(
      `artist_raw = coalesce(artist_raw, artist), artist = $${params.length}`,
    );
    guards.push(`artist = $${params.length - 1}`);
  }
  if (r.credit) {
    params.push(r.credit.from, r.credit.to);
    sets.push(`credit = $${params.length}`);
    guards.push(`coalesce(credit, '') = $${params.length - 1}`);
  }
  const res = await sql.query(
    `UPDATE items SET ${sets.join(", ")} WHERE ${guards.join(" AND ")} RETURNING 1`,
    params,
  );
  updated += res.length;
}
console.log(`${updated} row(s) updated.`);
