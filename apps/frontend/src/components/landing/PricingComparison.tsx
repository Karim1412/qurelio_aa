'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { useI18n } from '@/i18n';

/** true → included · false → not included · string → a qualified value */
type Cell = boolean | string;

/** index of the highlighted column (Professional) */
const HL = 2;

export function PricingComparison() {
  const { t, tRich, m } = useI18n();
  const { columns, groups } = m.compare;
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
      { threshold: 0.06, rootMargin: '0px 0px -6% 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{`
        .cmp-root {
          font-family: "Poppins", -apple-system, system-ui, sans-serif;
          position: relative;
          overflow: hidden;
          padding: 96px 40px 110px;
          box-sizing: border-box;
          background:
            radial-gradient(ellipse 60% 40% at 50% 0%, rgba(77, 146, 196, 0.05), transparent 70%),
            linear-gradient(180deg, #FBFAF7 0%, #FFFFFF 55%, #FBFAF7 100%);
        }
        .cmp-inner { position: relative; max-width: 1240px; margin: 0 auto; }

        .cmp-eyebrow {
          text-align: center;
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--brand-accent, #4D92C4);
          font-weight: 600;
          margin: 0 0 18px;
        }
        .cmp-heading {
          font-size: clamp(30px, 4.2vw, 48px);
          font-weight: 700;
          letter-spacing: -0.025em;
          color: #1C1917;
          text-align: center;
          line-height: 1.1;
          margin: 0 auto 16px;
          max-width: 720px;
        }
        .cmp-heading em {
          font-style: normal;
          background: linear-gradient(90deg, #4D92C4 0%, #3F7BAB 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .cmp-sub {
          font-size: clamp(15px, 1.4vw, 17px);
          color: #78716C;
          line-height: 1.65;
          text-align: center;
          max-width: 560px;
          margin: 0 auto 28px;
        }

        /* entrance */
        .cmp-root .cmp-eyebrow,
        .cmp-root .cmp-heading,
        .cmp-root .cmp-sub,
        .cmp-root .cmp-legend,
        .cmp-root .cmp-tbl-wrap {
          opacity: 0;
          transform: translateY(14px);
          filter: blur(2px);
          transition:
            opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1),
            transform 1.2s cubic-bezier(0.16, 1, 0.3, 1),
            filter 0.9s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .cmp-root.is-in-view .cmp-eyebrow,
        .cmp-root.is-in-view .cmp-heading,
        .cmp-root.is-in-view .cmp-sub,
        .cmp-root.is-in-view .cmp-legend,
        .cmp-root.is-in-view .cmp-tbl-wrap {
          opacity: 1; transform: none; filter: blur(0);
        }
        .cmp-root.is-in-view .cmp-eyebrow  { transition-delay: 0.06s; }
        .cmp-root.is-in-view .cmp-heading  { transition-delay: 0.16s; }
        .cmp-root.is-in-view .cmp-sub      { transition-delay: 0.26s; }
        .cmp-root.is-in-view .cmp-legend   { transition-delay: 0.34s; }
        .cmp-root.is-in-view .cmp-tbl-wrap { transition-delay: 0.44s; }

        /* legend */
        .cmp-legend {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 22px;
          margin: 0 0 30px;
          font-size: 12px;
          color: #8C8681;
        }
        .cmp-legend span { display: inline-flex; align-items: center; gap: 7px; }
        .cmp-legend .yes { color: #3F7BAB; font-weight: 700; }
        .cmp-legend .no  { color: #C4BFB8; font-weight: 700; }

        /* table shell */
        .cmp-tbl-wrap {
          position: relative;
          background: linear-gradient(180deg, #FFFFFF 0%, #FDFCF9 100%);
          border: 1px solid rgba(231, 229, 224, 0.85);
          border-radius: 22px;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.95),
            0 18px 50px -34px rgba(15, 23, 42, 0.18);
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .cmp-tbl {
          width: 100%;
          min-width: 860px;
          border-collapse: collapse;
          font-size: 13px;
        }

        .cmp-tbl thead th {
          background: #FFFFFF;
          padding: 20px 14px 18px;
          text-align: center;
          font-size: 13.5px;
          font-weight: 700;
          color: #1C1917;
          letter-spacing: -0.005em;
          border-bottom: 1px solid rgba(231, 229, 224, 0.95);
          white-space: nowrap;
        }
        .cmp-tbl thead th:first-child {
          text-align: left;
          min-width: 300px;
          padding-left: 24px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #A8A29E;
        }
        .cmp-tbl thead th.hl {
          background: linear-gradient(180deg, #F4F8FD 0%, #FFFFFF 100%);
          color: #3F7BAB;
        }
        .cmp-th-price {
          display: block;
          margin-top: 5px;
          font-size: 11.5px;
          font-weight: 500;
          color: #A8A29E;
          letter-spacing: 0;
        }
        .cmp-tbl thead th.hl .cmp-th-price { color: #5C7E9B; }

        /* group rows */
        .cmp-grp td {
          padding: 16px 24px 9px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #4D92C4;
          background: rgba(244, 241, 235, 0.5);
          border-top: 1px solid rgba(231, 229, 224, 0.9);
          border-bottom: 1px solid rgba(231, 229, 224, 0.9);
        }

        .cmp-tbl tbody tr:not(.cmp-grp):hover td { background: rgba(244, 241, 235, 0.45); }
        .cmp-tbl tbody td {
          padding: 12px 14px;
          border-bottom: 1px solid rgba(231, 229, 224, 0.55);
          transition: background 0.25s ease;
        }
        .cmp-tbl tbody td:first-child {
          text-align: left;
          padding-left: 24px;
          color: #44403C;
          font-weight: 400;
          line-height: 1.5;
        }
        .cmp-tbl tbody td.cell {
          text-align: center;
          font-weight: 500;
          color: #57534E;
          font-size: 12.5px;
          white-space: nowrap;
        }
        .cmp-tbl tbody td.cell.hl { background: rgba(77, 146, 196, 0.045); }
        .cmp-tbl tbody tr:not(.cmp-grp):hover td.cell.hl { background: rgba(77, 146, 196, 0.08); }
        .cmp-tbl tbody td.cell.yes { color: #3F7BAB; font-weight: 700; font-size: 15px; }
        .cmp-tbl tbody td.cell.no  { color: #D6D1CA; font-weight: 700; font-size: 15px; }
        .cmp-tbl tbody tr:last-child td { border-bottom: none; }

        .cmp-scroll-hint {
          display: none;
          margin: 12px 0 0;
          text-align: center;
          font-size: 11.5px;
          color: #A8A29E;
        }

        @media (max-width: 1100px) {
          .cmp-root { padding: 88px 28px 100px; }
        }

        @media (max-width: 900px) {
          .cmp-root { padding: 80px 20px 92px; }
          .cmp-scroll-hint { display: block; }

          /* Once the table scrolls sideways the feature name has to travel with
             it, otherwise a ✓ three columns over belongs to nothing. Sticky needs
             an opaque backdrop: the row/group tints are translucent and would let
             the scrolled-under cells bleed through. */
          .cmp-tbl thead th:first-child,
          .cmp-tbl tbody td:first-child {
            position: sticky;
            left: 0;
            z-index: 2;
            background: #FFFFFF;
            box-shadow: 1px 0 0 rgba(231, 229, 224, 0.9);
          }
          .cmp-tbl .cmp-grp td:first-child { background: #F8F6F2; }
          .cmp-tbl tbody tr:not(.cmp-grp):hover td:first-child { background: #F8F6F2; }
        }

        @media (max-width: 600px) {
          .cmp-root { padding: 64px 14px 76px; }
          .cmp-legend { gap: 16px; margin-bottom: 22px; }
          /* Narrower measure = less sideways travel to reach the last plan. */
          .cmp-tbl { min-width: 620px; font-size: 12px; }
          .cmp-tbl thead th:first-child { min-width: 168px; padding-left: 14px; }
          .cmp-tbl thead th { padding: 16px 8px 14px; font-size: 12.5px; }
          .cmp-tbl tbody td { padding: 11px 8px; }
          .cmp-tbl tbody td:first-child { padding-left: 14px; }
          .cmp-grp td { padding: 14px 14px 8px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .cmp-root *, .cmp-root *::before, .cmp-root *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
          .cmp-root .cmp-eyebrow, .cmp-root .cmp-heading, .cmp-root .cmp-sub,
          .cmp-root .cmp-legend, .cmp-root .cmp-tbl-wrap {
            opacity: 1 !important; transform: none !important; filter: none !important;
          }
        }
      `}</style>

      <section
        ref={sectionRef}
        className={`cmp-root${inView ? ' is-in-view' : ''}`}
        aria-label={t('compare.sectionLabel')}
        id="compare"
      >
        <div className="cmp-inner">
          <p className="cmp-eyebrow">{t('compare.eyebrow')}</p>
          <h2 className="cmp-heading">{tRich('compare.heading')}</h2>
          <p className="cmp-sub">{t('compare.sub')}</p>

          <div className="cmp-legend">
            <span>
              <b className="yes">✓</b> {t('compare.legendIncluded')}
            </span>
            <span>
              <b className="no">✗</b> {t('compare.legendNotIncluded')}
            </span>
          </div>

          <div className="cmp-tbl-wrap">
            <table className="cmp-tbl">
              <thead>
                <tr>
                  <th scope="col">{t('compare.featureColumn')}</th>
                  {columns.map((col, i) => (
                    <th key={col.name} scope="col" className={i === HL ? 'hl' : undefined}>
                      {col.name}
                      <span className="cmp-th-price">{col.price}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <Fragment key={group.title}>
                    <tr className="cmp-grp">
                      <td colSpan={5}>{group.title}</td>
                    </tr>
                    {group.rows.map((row) => (
                      <tr key={row.label}>
                        <td>{row.label}</td>
                        {row.cells.map((cell, i) => (
                          <td key={i} className={cellClass(cell, i)}>
                            {typeof cell === 'boolean' ? (
                              <span
                                aria-label={
                                  cell ? t('compare.ariaIncluded') : t('compare.ariaNotIncluded')
                                }
                              >
                                {cell ? '✓' : '✗'}
                              </span>
                            ) : (
                              cell
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <p className="cmp-scroll-hint">{t('compare.scrollHint')}</p>
        </div>
      </section>
    </>
  );
}

function cellClass(cell: Cell, index: number) {
  const parts = ['cell'];
  if (cell === true) parts.push('yes');
  else if (cell === false) parts.push('no');
  if (index === HL) parts.push('hl');
  return parts.join(' ');
}
