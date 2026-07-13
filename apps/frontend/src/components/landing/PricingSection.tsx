'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { Check, Sparkles } from '@/components/icons';

type Feature = { label: string };

type Plan = {
  name: string;
  description: string;
  price: number | null; // null → "Custom"
  userRange: string;
  popular?: boolean;
  highlighted?: boolean;
  features: Feature[];
};

const plans: Plan[] = [
  {
    name: 'Starter',
    description: 'Best for small teams getting started',
    price: 2000,
    userRange: '1–10 users',
    features: [
      { label: 'All core modules' },
      { label: 'Email support' },
      { label: 'Best for SMEs' },
    ],
  },
  {
    name: 'Professional',
    description: 'For growing teams that need more power',
    price: 4000,
    userRange: '10–20 users',
    popular: true,
    highlighted: true,
    features: [
      { label: 'All modules + AI Compliance Engine & Regulatory Monitoring' },
      { label: 'Priority support' },
      { label: 'Training included' },
    ],
  },
  {
    name: 'Enterprise',
    description: 'For organizations that need full control',
    price: null,
    userRange: '20+ users',
    features: [
      { label: 'All features' },
      { label: 'Dedicated support' },
      { label: 'SLA guarantees' },
    ],
  },
];

const numberFormatter = new Intl.NumberFormat('en-US');

export function PricingSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{`
        .pricing-root {
          font-family: "Poppins", -apple-system, system-ui, sans-serif;
          position: relative;
          overflow: hidden;
          padding: 110px 40px 130px;
          box-sizing: border-box;
          background:
            radial-gradient(ellipse 65% 45% at 50% 0%, rgba(77, 146, 196, 0.06), transparent 70%),
            radial-gradient(ellipse 55% 35% at 50% 100%, rgba(255, 232, 168, 0.10), transparent 70%),
            linear-gradient(180deg, #FBFAF7 0%, #FFFFFF 60%, #FBFAF7 100%);
        }
        .pricing-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(circle at 18% 28%, rgba(77, 146, 196, 0.05) 0%, transparent 32%),
            radial-gradient(circle at 82% 72%, rgba(255, 193, 7, 0.045) 0%, transparent 36%);
          pointer-events: none;
        }

        .pricing-inner { position: relative; max-width: 1180px; margin: 0 auto; }

        /* ─── Heading ─── */
        .pricing-eyebrow {
          text-align: center;
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--brand-accent);
          font-weight: 600;
          margin: 0 0 18px;
        }
        .pricing-heading {
          font-size: clamp(36px, 5vw, 60px);
          font-weight: 700;
          letter-spacing: -0.025em;
          color: #1C1917;
          text-align: center;
          line-height: 1.08;
          margin: 0 auto 18px;
          max-width: 760px;
        }
        .pricing-heading em {
          font-style: normal;
          font-weight: 700;
          background: linear-gradient(90deg, #4D92C4 0%, #3F7BAB 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .pricing-sub {
          font-size: clamp(16px, 1.5vw, 18px);
          color: #78716C;
          line-height: 1.65;
          text-align: center;
          max-width: 580px;
          margin: 0 auto 72px;
          font-weight: 400;
        }

        /* ─── Header entrance ─── */
        .pricing-root .pricing-eyebrow,
        .pricing-root .pricing-heading,
        .pricing-root .pricing-sub,
        .pricing-root .pricing-frame {
          opacity: 0;
          transform: translateY(14px);
          filter: blur(2px);
          transition:
            opacity 1.3s cubic-bezier(0.16, 1, 0.3, 1),
            transform 1.3s cubic-bezier(0.16, 1, 0.3, 1),
            filter 1.0s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform, filter;
        }
        .pricing-root.is-in-view .pricing-eyebrow,
        .pricing-root.is-in-view .pricing-heading,
        .pricing-root.is-in-view .pricing-sub,
        .pricing-root.is-in-view .pricing-frame {
          opacity: 1; transform: none; filter: blur(0);
        }
        .pricing-root.is-in-view .pricing-eyebrow { transition-delay: 0.08s; }
        .pricing-root.is-in-view .pricing-heading { transition-delay: 0.20s; }
        .pricing-root.is-in-view .pricing-sub     { transition-delay: 0.34s; }
        .pricing-root.is-in-view .pricing-frame   { transition-delay: 0.50s; }

        /* ─── Outer frame ─── */
        .pricing-frame {
          position: relative;
          background:
            radial-gradient(ellipse 80% 60% at 50% 0%, rgba(77, 146, 196, 0.05), transparent 70%),
            linear-gradient(180deg, #FFFFFF 0%, #FDFCF9 100%);
          border: 1px solid rgba(231, 229, 224, 0.85);
          border-radius: 28px;
          padding: 18px;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.95),
            0 18px 50px -32px rgba(15, 23, 42, 0.16);
        }
        .pricing-frame::before {
          content: '';
          position: absolute;
          left: 14%; right: 14%; top: -1px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(77, 146, 196, 0.4) 50%, transparent);
          pointer-events: none;
        }

        .pricing-grid {
          position: relative;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          align-items: stretch;
          gap: 0;
        }

        @media (max-width: 900px) {
          .pricing-frame   { padding: 12px; border-radius: 22px; }
          .pricing-grid    { grid-template-columns: 1fr; gap: 0; }
          .pricing-divider { display: none; }
          .pricing-root    { padding: 90px 22px 110px; }
        }

        /* Vertical separators */
        .pricing-divider {
          position: absolute;
          top: 28px; bottom: 28px;
          width: 1px;
          background: linear-gradient(
            to bottom,
            transparent 0%,
            rgba(168, 162, 158, 0.30) 18%,
            rgba(168, 162, 158, 0.30) 82%,
            transparent 100%
          );
          pointer-events: none;
        }
        .pricing-divider.left  { left: 33.333%; }
        .pricing-divider.right { left: 66.666%; }

        @media (max-width: 900px) {
          .pricing-divider-h {
            position: relative;
            height: 1px;
            margin: 0 28px;
            background: linear-gradient(
              to right,
              transparent 0%,
              rgba(168, 162, 158, 0.30) 50%,
              transparent 100%
            );
          }
        }
        @media (min-width: 901px) {
          .pricing-divider-h { display: none; }
        }

        /* ─── Card base ─── */
        .pricing-card {
          position: relative;
          padding: 46px 34px 38px;
          display: flex;
          flex-direction: column;
          background: transparent;
          border-radius: 18px;
          transition:
            transform 0.6s cubic-bezier(0.22, 1, 0.36, 1),
            background 0.5s cubic-bezier(0.22, 1, 0.36, 1);
          z-index: 1;
          /* Staggered entry */
          opacity: 0;
          transform: translateY(20px);
        }
        .pricing-root.is-in-view .pricing-card {
          opacity: 1;
          transform: translateY(0);
          transition:
            opacity 1.0s cubic-bezier(0.22, 1, 0.36, 1),
            transform 1.0s cubic-bezier(0.22, 1, 0.36, 1),
            background 0.5s cubic-bezier(0.22, 1, 0.36, 1);
          transition-delay: calc(0.68s + var(--idx, 0) * 0.14s);
        }
        .pricing-card:hover { transform: translateY(-4px); }

        /* ─── Featured card — brand-tinted, with a slow aurora breathing bg ─── */
        .pricing-card.featured {
          background:
            radial-gradient(ellipse 100% 55% at 50% 0%, rgba(77, 146, 196, 0.10), transparent 75%),
            linear-gradient(180deg, #FFFFFF 0%, #F4F8FD 100%);
          z-index: 3;
        }
        .pricing-card.featured::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 18px;
          padding: 1px;
          background: linear-gradient(
            145deg,
            rgba(77, 146, 196, 0.35) 0%,
            rgba(255, 193, 7, 0.18) 50%,
            rgba(77, 146, 196, 0.30) 100%
          );
          -webkit-mask:
            linear-gradient(#000 0 0) content-box,
            linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
                  mask-composite: exclude;
          pointer-events: none;
          background-size: 200% 200%;
          animation: pricing-aurora 14s ease-in-out infinite;
        }
        @keyframes pricing-aurora {
          0%, 100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
        .pricing-card.featured:hover {
          transform: translateY(-6px);
        }

        /* "Most Popular" tab — brand blue (cohesive with rest of design) */
        .pricing-popular-tab {
          position: absolute;
          top: -14px;
          left: 50%;
          transform: translateX(-50%);
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 10.5px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          font-weight: 600;
          color: #FFFFFF;
          background: linear-gradient(180deg, #5BA3D2 0%, #4D92C4 100%);
          border: 1px solid rgba(77, 146, 196, 0.55);
          padding: 7px 14px;
          border-radius: 100px;
          line-height: 1;
          white-space: nowrap;
        }
        .pricing-popular-tab svg {
          width: 10px;
          height: 10px;
        }

        .pricing-name {
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.20em;
          text-transform: uppercase;
          color: #57534E;
          margin: 0 0 8px;
        }
        .pricing-card.featured .pricing-name { color: #3F7BAB; }

        .pricing-desc {
          font-size: 13.5px;
          color: #78716C;
          line-height: 1.6;
          margin: 0 0 30px;
          font-weight: 400;
          min-height: 44px;
        }

        /* Price block */
        .pricing-price-row {
          display: flex;
          align-items: baseline;
          gap: 6px;
          margin-bottom: 6px;
          min-height: 58px;
        }
        .pricing-price-currency {
          font-size: 18px;
          font-weight: 600;
          color: #A8A29E;
          letter-spacing: -0.01em;
          align-self: flex-start;
          margin-top: 10px;
        }
        .pricing-card.featured .pricing-price-currency { color: #4D92C4; }
        .pricing-price {
          font-size: 54px;
          font-weight: 700;
          letter-spacing: -0.038em;
          color: #1C1917;
          line-height: 1;
          font-variant-numeric: tabular-nums;
        }
        .pricing-card.featured .pricing-price {
          background: linear-gradient(180deg, #1C1917 0%, #3F7BAB 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .pricing-price.is-text {
          font-size: 44px;
          letter-spacing: -0.025em;
        }
        .pricing-period {
          font-size: 12.5px;
          color: #A8A29E;
          margin: 6px 0 0;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        /* User range — chip-style instead of horizontal lines */
        .pricing-userrange {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin: 22px 0 26px;
          padding: 7px 14px;
          background: rgba(244, 241, 235, 0.6);
          border: 1px solid rgba(231, 229, 224, 0.9);
          border-radius: 100px;
          font-size: 12.5px;
          font-weight: 600;
          color: #44403C;
          letter-spacing: 0.01em;
          width: fit-content;
        }
        .pricing-card.featured .pricing-userrange {
          background: rgba(77, 146, 196, 0.08);
          border-color: rgba(77, 146, 196, 0.22);
          color: #3F7BAB;
        }
        .pricing-userrange-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #A8A29E;
        }
        .pricing-card.featured .pricing-userrange-dot { background: #4D92C4; }

        /* Soft divider above features */
        .pricing-features-rule {
          height: 1px;
          margin: 4px 0 22px;
          background: linear-gradient(
            to right,
            transparent 0%,
            rgba(168, 162, 158, 0.30) 20%,
            rgba(168, 162, 158, 0.30) 80%,
            transparent 100%
          );
        }
        .pricing-card.featured .pricing-features-rule {
          background: linear-gradient(
            to right,
            transparent 0%,
            rgba(77, 146, 196, 0.30) 20%,
            rgba(77, 146, 196, 0.30) 80%,
            transparent 100%
          );
        }

        .pricing-features {
          list-style: none;
          padding: 0;
          margin: 0 0 32px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .pricing-feature {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          font-size: 13.5px;
          color: #44403C;
          line-height: 1.55;
          font-weight: 400;
          /* per-item staggered enter */
          opacity: 0;
          transform: translateY(6px);
          transition:
            opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1),
            transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
          transition-delay: calc(0.86s + var(--idx, 0) * 0.14s + var(--fi, 0) * 0.10s);
        }
        .pricing-root.is-in-view .pricing-feature {
          opacity: 1;
          transform: translateY(0);
        }
        .pricing-feature-dot {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          margin-top: 1px;
          border-radius: 50%;
          flex-shrink: 0;
          background: #F4F1EB;
          color: #57534E;
          transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .pricing-card:hover .pricing-feature-dot { transform: scale(1.08); }
        .pricing-card.featured .pricing-feature-dot {
          background: linear-gradient(180deg, #5BA3D2 0%, #4D92C4 100%);
          color: #FFFFFF;
        }

        /* ─── CTA ─── */
        .pricing-cta {
          position: relative;
          overflow: hidden;
          width: 100%;
          padding: 13px 22px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: -0.005em;
          border-radius: 100px;
          cursor: pointer;
          outline: none;
          margin-top: auto;
          transition:
            background 0.35s cubic-bezier(0.22, 1, 0.36, 1),
            border-color 0.35s cubic-bezier(0.22, 1, 0.36, 1),
            color 0.35s ease,
            transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .pricing-cta.outline {
          background: #FFFFFF;
          border: 1px solid #E1DED7;
          color: #1C1917;
        }
        .pricing-cta.outline:hover {
          background: #FBFAF7;
          border-color: #4D92C4;
          color: #4D92C4;
          transform: translateY(-1.5px);
        }
        .pricing-cta.solid {
          background: linear-gradient(135deg, #4D92C4 0%, #3F7BAB 100%);
          border: 1px solid rgba(63, 123, 171, 0.5);
          color: #FFFFFF;
        }
        .pricing-cta.solid:hover {
          transform: translateY(-1.5px);
        }
        /* Sheen sweep on CTA hover (only on solid) */
        .pricing-cta.solid::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, transparent 30%, rgba(255, 255, 255, 0.35) 50%, transparent 70%);
          transform: translateX(-110%);
          transition: transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
          pointer-events: none;
        }
        .pricing-cta.solid:hover::after {
          transform: translateX(110%);
        }
        .pricing-cta:focus-visible {
          box-shadow: 0 0 0 3px rgba(77, 146, 196, 0.28);
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
          .pricing-card, .pricing-feature {
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      <section
        ref={sectionRef}
        className={`pricing-root${inView ? ' is-in-view' : ''}`}
        aria-label="Pricing"
        id="pricing"
      >
        <div className="pricing-inner">
          <p className="pricing-eyebrow">Pricing</p>
          <h2 className="pricing-heading">
            Simple, <em>transparent</em> pricing
          </h2>
          <p className="pricing-sub">
            Choose a plan that works best for you and your team. No hidden fees, no surprises — just clear value at every tier.
          </p>

          <div className="pricing-frame">
            <div className="pricing-grid">
              <div aria-hidden className="pricing-divider left" />
              <div aria-hidden className="pricing-divider right" />

              {plans.map((plan, i) => (
                <Fragment key={plan.name}>
                  {i > 0 && <div aria-hidden className="pricing-divider-h" />}
                  <PricingCard plan={plan} index={i} />
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function PricingCard({ plan, index }: { plan: Plan; index: number }) {
  const cardClass = plan.highlighted ? 'pricing-card featured' : 'pricing-card';
  const ctaClass = plan.highlighted ? 'pricing-cta solid' : 'pricing-cta outline';

  const isCustom = plan.price === null;

  return (
    <div
      className={cardClass}
      style={{ ['--idx' as string]: index } as React.CSSProperties}
    >
      

      <h3 className="pricing-name">{plan.name}</h3>
      <p className="pricing-desc">{plan.description}</p>

      <div className="pricing-price-row">
        {isCustom ? (
          <span className="pricing-price is-text">Custom</span>
        ) : (
          <>
            <span className="pricing-price-currency">TND</span>
            <span className="pricing-price">
              {numberFormatter.format(plan.price as number)}
            </span>
          </>
        )}
      </div>
      <p className="pricing-period">{isCustom ? 'Tailored pricing' : 'per month'}</p>

      <span className="pricing-userrange">
        <span className="pricing-userrange-dot" aria-hidden />
        {plan.userRange}
      </span>

      <div className="pricing-features-rule" aria-hidden />

      <ul className="pricing-features">
        {plan.features.map((feature, fi) => (
          <li
            key={feature.label}
            className="pricing-feature"
            style={{ ['--fi' as string]: fi } as React.CSSProperties}
          >
            <span className="pricing-feature-dot" aria-hidden>
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            {feature.label}
          </li>
        ))}
      </ul>

      <button type="button" className={ctaClass}>
        <span style={{ position: 'relative', zIndex: 1 }}>
          {isCustom ? 'Contact Sales' : 'Get Started'}
        </span>
      </button>
    </div>
  );
}
