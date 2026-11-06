export interface PrintItem {
  master_width?: number | null;
  master_height?: number | null;
  license?: string | null;
  source?: string | null;
}

interface PrintRulesConfig {
  "print.min_short_edge_px": Record<string, number>;
  "print.region_products": Record<string, string>;
  "print.eligible": { licenses: string; excluded_sources: string };
}

const csv = (value: unknown): string[] =>
  String(value)
    .split(",")
    .map((v) => v.trim());

export function createPrintRules(config: PrintRulesConfig) {
  const minShortEdge = config["print.min_short_edge_px"];
  const regionProducts = config["print.region_products"];
  const licenses = csv(config["print.eligible"].licenses);
  const excludedSources = csv(config["print.eligible"].excluded_sources);

  function mayBeSold(item: PrintItem): boolean {
    return (
      !!item.license &&
      licenses.includes(item.license) &&
      !(item.source && excludedSources.includes(item.source))
    );
  }

  function printOptionsFor(item: PrintItem, region: string | null): string[] {
    const { master_width: w, master_height: h } = item;
    if (!region || !w || !h || !(region in regionProducts)) return [];
    if (!mayBeSold(item)) return [];
    const shortEdge = Math.min(w, h);
    return csv(regionProducts[region]).filter(
      (p) => p in minShortEdge && shortEdge >= minShortEdge[p],
    );
  }

  return { mayBeSold, printOptionsFor };
}
