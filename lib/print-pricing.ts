import { TRANQUILO_CONFIG } from "./config.generated.ts";

interface Markup {
  margin: number;
  cardFee: number;
}

const CONFIGURED: Markup = {
  margin: Number(TRANQUILO_CONFIG["print.pricing"].margin),
  cardFee: Number(TRANQUILO_CONFIG["print.pricing"].card_fee),
};

const cents = (n: number) => Math.round(n * 100) / 100;

export function priceQuote(
  cost: { itemPrice: number; delivery: number },
  { margin, cardFee }: Markup = CONFIGURED,
) {
  const keep = 1 - margin - cardFee;
  if (keep <= 0) throw new Error("print pricing markup leaves no revenue");
  const gelatoCost = cost.itemPrice + cost.delivery;
  const total = Math.max(
    gelatoCost,
    Math.ceil((gelatoCost / keep) * 100) / 100,
  );
  return {
    total: cents(total),
    delivery: cost.delivery,
    item: cents(total - cost.delivery),
  };
}
