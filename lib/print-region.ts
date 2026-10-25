import { TRANQUILO_CONFIG } from "./config.generated.ts";

const COUNTRY_CODE = /^[A-Za-z]{2}$/;

const REGIONS: [string, string[]][] = Object.entries(
  TRANQUILO_CONFIG["print.regions"] as Record<string, string>,
).map(([region, codes]) => [region, codes.split(",").map((c) => c.trim())]);

export function regionForCountry(country: unknown): string | null {
  if (typeof country !== "string" || !COUNTRY_CODE.test(country)) return null;
  const code = country.toUpperCase();
  for (const [region, countries] of REGIONS) {
    if (countries.includes(code)) return region;
  }
  return null;
}

export function printRegionFromHeaders(headers: Record<string, unknown>) {
  const raw = headers["x-vercel-ip-country"];
  const country =
    typeof raw === "string" && COUNTRY_CODE.test(raw)
      ? raw.toUpperCase()
      : null;
  return { country, region: regionForCountry(country) };
}
