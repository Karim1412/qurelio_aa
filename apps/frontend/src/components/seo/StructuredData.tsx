import { dictionaries, stripRich } from '@/i18n';
import { getRequestLocale } from '@/i18n/server';
import { planPricing, PRICING_CURRENCY } from '@/lib/pricing';
import { LOCALES } from '@/i18n/config';
import { SITE_NAME, SITE_URL } from '@/lib/site';

/**
 * schema.org JSON-LD for the public landing page.
 *
 * This is the machine-readable description of what Qurelio is. Search engines use
 * it for rich results and entity resolution; AI assistants lean on it heavily when
 * summarising an unfamiliar product, because it states the category, audience and
 * capabilities as data rather than as marketing prose they have to infer.
 *
 * Every value that also appears on screen (plan prices, FAQ questions and answers)
 * is read from the same source the page renders from — `@/lib/pricing` and the
 * dictionaries — rather than restated here. Structured data that contradicts the
 * visible page is a rich-result violation, and a hand-copied price is exactly how
 * that happens six months after the price changes.
 *
 * Rendered from a server component, so it ships in the initial HTML and is visible
 * to crawlers that do not execute JavaScript.
 */
export async function StructuredData() {
  const locale = await getRequestLocale();
  const m = dictionaries[locale];

  const pricedPlans = planPricing
    .map((p, i) => ({ ...p, ...m.pricing.plans[i] }))
    .filter((p): p is typeof p & { price: number } => p.price !== null);

  const prices = pricedPlans.map((p) => p.price);

  const graph = [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/brand/querlio-logo.png` },
      description:
        'Qurelio is an AI-powered compliance and quality management platform for teams that must prove their products meet the regulations of every market they sell to.',
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'sales',
        email: 'hello@qurelio.com',
        url: `${SITE_URL}/demo`,
        availableLanguage: ['English', 'French'],
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: [...LOCALES],
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#software`,
      name: SITE_NAME,
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'Quality Management System',
      operatingSystem: 'Web',
      url: SITE_URL,
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: [...LOCALES],
      description:
        'AI compliance and quality operations platform: document management, clause-by-clause conformity evaluation against ISO and regulatory standards, non-conformity and CAPA lifecycle, internal and supplier audits, and reporting.',
      featureList: [
        'Document management with versioning and approval workflow',
        'AI clause-by-clause conformity evaluation',
        'Non-conformity and CAPA lifecycle management',
        'Internal, supplier and certification audits',
        'Regulatory change monitoring',
        'Audit-ready reporting and exports',
      ],
      // Google drops the SoftwareApplication rich result outright when `offers`
      // is absent — it is a required property, not an optional enrichment. The
      // tailored (price-on-request) plan is excluded rather than given a made-up
      // figure: `offerCount` still counts every published plan.
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: PRICING_CURRENCY,
        lowPrice: Math.min(...prices),
        highPrice: Math.max(...prices),
        offerCount: planPricing.length,
        offers: pricedPlans.map((plan) => ({
          '@type': 'Offer',
          name: plan.name,
          description: plan.description,
          price: plan.price,
          priceCurrency: PRICING_CURRENCY,
          // Every figure in the table is a yearly subscription; without the
          // billing period an aggregator reads €9,600 as a one-off licence.
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: plan.price,
            priceCurrency: PRICING_CURRENCY,
            billingDuration: 1,
            billingIncrement: 1,
            unitCode: 'ANN',
          },
          url: `${SITE_URL}/#pricing`,
          availability: 'https://schema.org/InStock',
          seller: { '@id': `${SITE_URL}/#organization` },
        })),
      },
    },
    {
      // The landing page renders these questions verbatim, which is what makes
      // the FAQ eligible: Google requires the answer text to be visible on the
      // page, not supplied only as markup.
      '@type': 'FAQPage',
      '@id': `${SITE_URL}/#faq`,
      inLanguage: locale,
      mainEntity: m.faq.items.map((item) => ({
        '@type': 'Question',
        name: stripRich(item.q),
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a.map(stripRich).join(' '),
        },
      })),
    },
  ];

  return (
    <script
      type="application/ld+json"
      // Payload is built from static dictionaries and pricing constants, no user
      // input; `<` is escaped so the JSON can never terminate the surrounding
      // <script> element.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c'),
      }}
    />
  );
}
