/**
 * Size conversion reference for the size-guide dialog.
 *
 * Stock is tracked in EU sizes only (see docs/storefront-decisions.md). UK, US
 * and foot length are shown purely to help a shopper pick — they are never
 * used as separate inventory.
 *
 * Conversions follow the common retail approximation; half sizes are not
 * stocked, so each row is a single EU number.
 */
export interface SizeRow {
  eu: string;
  uk: string;
  usMen: string;
  usWomen: string;
  /** Foot length in centimetres — the most reliable way to self-measure. */
  cm: string;
}

export const SIZE_CHART: SizeRow[] = [
  { eu: "36", uk: "3.5", usMen: "4", usWomen: "5.5", cm: "22.5" },
  { eu: "37", uk: "4", usMen: "5", usWomen: "6.5", cm: "23.5" },
  { eu: "38", uk: "5", usMen: "6", usWomen: "7.5", cm: "24" },
  { eu: "39", uk: "6", usMen: "7", usWomen: "8.5", cm: "24.5" },
  { eu: "40", uk: "6.5", usMen: "7.5", usWomen: "9", cm: "25" },
  { eu: "41", uk: "7.5", usMen: "8.5", usWomen: "10", cm: "26" },
  { eu: "42", uk: "8", usMen: "9", usWomen: "10.5", cm: "26.5" },
  { eu: "43", uk: "9", usMen: "10", usWomen: "11.5", cm: "27.5" },
  { eu: "44", uk: "9.5", usMen: "10.5", usWomen: "12", cm: "28" },
  { eu: "45", uk: "10.5", usMen: "11.5", usWomen: "13", cm: "29" },
  { eu: "46", uk: "11", usMen: "12", usWomen: "13.5", cm: "29.5" },
];

export const SIZE_GUIDE_TIP =
  "Measure your foot at the end of the day, standing, from heel to longest toe. If you are between sizes, take the larger one.";
