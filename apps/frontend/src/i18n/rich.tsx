import React from 'react';

/**
 * Renders the tiny markup subset allowed inside translation strings:
 * `<b>` / `<strong>` (bold), `<em>` (brand-accented emphasis) and `<br/>`.
 *
 * Anything else stays literal text, so a dictionary string can never inject
 * markup into the page.
 */
const TOKEN = /(<(?:b|strong|em)>[\s\S]*?<\/(?:b|strong|em)>|<br\s*\/?>)/g;

export function renderRich(text: string): React.ReactNode {
  const parts = text.split(TOKEN).filter((p) => p !== '');
  if (parts.length === 1) return parts[0];

  return parts.map((part, i) => {
    if (/^<br\s*\/?>$/.test(part)) return <br key={i} />;

    const bold = part.match(/^<(?:b|strong)>([\s\S]*)<\/(?:b|strong)>$/);
    if (bold) return <strong key={i}>{bold[1]}</strong>;

    const em = part.match(/^<em>([\s\S]*)<\/em>$/);
    if (em) return <em key={i}>{em[1]}</em>;

    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

/**
 * The same markup subset, flattened to plain text.
 *
 * JSON-LD string values carry no markup: a literal `<b>` inside a schema.org
 * `Question`/`Answer` is quoted back verbatim in rich results. Structured data
 * built from dictionary strings must go through this first.
 */
export function stripRich(text: string): string {
  return text
    .replace(/<br\s*\/?>/g, ' ')
    .replace(/<\/?(?:b|strong|em)>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
