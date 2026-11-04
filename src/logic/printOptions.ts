import { TRANQUILO_CONFIG } from "../data/config.generated";

export type PrintProduct = "mini_print" | "poster" | "framed" | "tote" | "mug";

const MIN_SHORT_EDGE: Record<string, number> =
  TRANQUILO_CONFIG["print.min_short_edge_px"];
const REGION_PRODUCTS: Record<string, string> =
  TRANQUILO_CONFIG["print.region_products"];

interface MasterSize {
  master_width?: number | null;
  master_height?: number | null;
}

export function printOptionsFor(
  item: MasterSize,
  region: string | null,
): PrintProduct[] {
  const { master_width: w, master_height: h } = item;
  if (!region || !w || !h || !(region in REGION_PRODUCTS)) return [];
  const shortEdge = Math.min(w, h);
  return REGION_PRODUCTS[region]
    .split(",")
    .map((p) => p.trim())
    .filter(
      (p) => p in MIN_SHORT_EDGE && shortEdge >= MIN_SHORT_EDGE[p],
    ) as PrintProduct[];
}

export interface PrintOffer {
  product: PrintProduct;
  price: { amount: number; currency: string; startingAt?: true } | null;
  buyerPaysImportTax: boolean;
}

const IMPORT_TAX_REGIONS: string[] = (
  TRANQUILO_CONFIG["print.import_tax"].buyer_pays as string
)
  .split(",")
  .map((r) => r.trim());

const CURRENCY: Record<string, string> = TRANQUILO_CONFIG["print.currency"];
const PRICES = TRANQUILO_CONFIG as unknown as Record<
  string,
  Record<string, number> | undefined
>;

export function printOffersFor(
  item: MasterSize,
  region: string | null,
): PrintOffer[] {
  return printOptionsFor(item, region).map((product) => {
    const amount = region ? PRICES[`print.prices.${region}`]?.[product] : null;
    const startingAmount = region
      ? PRICES[`print.starting_prices.${region}`]?.[product]
      : null;
    const currency = region ? CURRENCY[region] : null;
    let price: PrintOffer["price"] = null;
    if (currency && amount) price = { amount, currency };
    else if (currency && startingAmount)
      price = { amount: startingAmount, currency, startingAt: true };
    return {
      product,
      price,
      buyerPaysImportTax: region ? IMPORT_TAX_REGIONS.includes(region) : false,
    };
  });
}

export function hasMasterSize(item: MasterSize): boolean {
  return Boolean(item.master_width && item.master_height);
}

export function printLinkEnabled(search: string): boolean {
  return (
    TRANQUILO_CONFIG.print.link_enabled ||
    new URLSearchParams(search).get("print") === "preview"
  );
}
