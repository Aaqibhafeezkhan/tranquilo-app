import { createPrintRules, type PrintItem } from "../../lib/print-rules";
import { TRANQUILO_CONFIG } from "../data/config.generated";

export type PrintProduct = "mini_print" | "poster" | "framed" | "tote" | "mug";

const rules = createPrintRules(TRANQUILO_CONFIG);

export function printOptionsFor(
  item: PrintItem,
  region: string | null,
): PrintProduct[] {
  return rules.printOptionsFor(item, region) as PrintProduct[];
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
  item: PrintItem,
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

export function hasMasterSize(item: PrintItem): boolean {
  return Boolean(item.master_width && item.master_height);
}

export function printLinkEnabled(search: string): boolean {
  return (
    TRANQUILO_CONFIG.print.link_enabled ||
    new URLSearchParams(search).get("print") === "preview"
  );
}
