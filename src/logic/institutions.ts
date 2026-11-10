// The sources a visitor can filter by: museums and libraries that hold the
// works themselves. Aggregators (commons, europeana, tainacan) are left out
// because one of them stands for many institutions.
const INSTITUTION_LABELS: Record<string, string> = {
  met: "The Metropolitan Museum of Art",
  cleveland: "Cleveland Museum of Art",
  nga: "National Gallery of Art",
  aic: "Art Institute of Chicago",
  mia: "Minneapolis Institute of Art",
  tepapa: "Te Papa",
  npm: "National Palace Museum",
  wellcome: "Wellcome Collection",
  smithsonian: "Smithsonian Institution",
};

export interface InstitutionOption {
  value: string;
  label: string;
}

export function institutionLabel(source: string): string | null {
  return INSTITUTION_LABELS[source] ?? null;
}

export function institutionOptions(
  sources: readonly { value: string; count: number }[] | undefined,
): InstitutionOption[] {
  return (sources ?? [])
    .flatMap(({ value }) => {
      const label = institutionLabel(value);
      return label ? [{ value, label }] : [];
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}
