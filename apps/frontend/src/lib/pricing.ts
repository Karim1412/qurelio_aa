/**
 * Figures behind the public pricing table.
 *
 * Extracted from `PricingSection` so the rendered table and the schema.org
 * `Offer` nodes in `<StructuredData />` quote the same numbers from one source.
 * A price that drifts between the visible page and its structured data is not
 * just an inconsistency: Google treats structured data that contradicts the page
 * as a rich-result violation and drops the enhancement for the whole site.
 *
 * Copy (name, scope, features) lives in the dictionaries under `pricing.plans`
 * and is index-matched to this array.
 */

/** ISO 4217 code for every figure below; the table renders it as `€`. */
export const PRICING_CURRENCY = 'EUR';

export type PlanPricing = {
  /** null → "Tailored", no numeric price. */
  price: number | null;
  /** null → this plan has no quarterly option (price stays annual). */
  quarterlyPrice: number | null;
  badgeTone?: 'brand' | 'gold';
  highlighted?: boolean;
};

export const planPricing: PlanPricing[] = [
  { price: 9600, quarterlyPrice: 2520 },
  { price: 24000, quarterlyPrice: 6300, badgeTone: 'gold', highlighted: true },
  { price: null, quarterlyPrice: null },
  { price: 6000, quarterlyPrice: null, badgeTone: 'brand' },
];
