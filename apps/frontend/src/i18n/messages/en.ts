/**
 * English source dictionary.
 *
 * This file is the reference: `fr.ts` is typed against it, so a missing or
 * renamed key fails the type-check instead of silently falling back.
 *
 * Inline markup allowed in any string (rendered through `tRich` / `<Rich>`):
 *   <b>…</b> <strong>…</strong>  bold
 *   <em>…</em>                   brand-accented emphasis
 *   <br/>                        line break
 * Interpolation uses {name} placeholders.
 */

const en = {
  /* ─── SEO / social cards ─────────────────────────────────────────────── */
  seo: {
    title: 'Qurelio: The AI Compliance & Quality OS',
    /* Held near 155 characters: Google truncates the snippet past roughly that,
       and a cut-off sentence reads worse in the SERP than a shorter whole one. */
    description:
      'AI compliance and quality OS: turn your documents into a private Compliance Memory, evaluate them against public regulations, keep every AI output human-approved.',
    ogImageAlt: 'Qurelio: prove your compliance, every product, every market, every day.',
    demoTitle: 'Book a demo',
    demoDescription:
      'Book a walkthrough of Qurelio: see how quality teams evaluate evidence against ISO and regulatory clauses, and keep audits, non-conformities and records audit-ready.',
  },

  /* ─── Shared ─────────────────────────────────────────────────────────── */
  common: {
    language: 'Language',
    english: 'English',
    french: 'Français',
    loading: 'Loading…',
    optional: 'Optional',
    required: 'Required',
    cancel: 'Cancel',
    continue: 'Continue',
    previous: 'Previous',
    retry: 'Retry',
    signIn: 'Sign in',
    signUp: 'Sign up',
    backToHome: 'Return to home',
    backToSignIn: 'Back to sign in',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
  },

  /* ─── Navbar ─────────────────────────────────────────────────────────── */
  nav: {
    links: ['Home', 'Why Qurelio', 'How it works', 'Pricing', 'Contact'],
    searchPlaceholder: 'Search…',
    getStarted: 'Get started',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    logoAlt: 'Qurelio',
  },

  /* ─── Hero ───────────────────────────────────────────────────────────── */
  hero: {
    titleLead: 'Prove your',
    titleHighlight: 'compliance.',
    titleRest: 'Every product, every market, every day.',
    subtitle:
      'One platform to show your products meet the laws and regulations of every market you sell to. Documents, audits, non-conformities and evidence: organised, scored, and audit-ready every day, not just at certification time.',
    ctaDemo: 'Book a demo',
    ctaVideo: 'Watch video',
    socialProof: "Built with quality managers from Tunisia's export industry.",
  },

  /* ─── Why Qurelio ────────────────────────────────────────────────────── */
  why: {
    sectionLabel: 'Why Qurelio',
    eyebrow: 'Why Qurelio',
    heading: 'What makes Qurelio the <em>intelligent</em> compliance platform',
    sub: 'Built from the ground up for quality teams who need more than spreadsheets. Qurelio combines AI, automation, and deep regulatory intelligence into one unified platform. And because compliance is too important to leave to a machine, every AI result waits for your approval before it becomes real.',
    trust:
      '<b>100% legal by design.</b> Qurelio works exclusively with public, legally free regulatory texts: laws, decrees and official regulations. Licensed standards such as ISO/IEC are automatically detected and are never stored or analyzed.',
    features: {
      compliance: {
        tag: 'AI-powered',
        label: 'AI Compliance Engine',
        headline: 'Stay audit-ready, every day of the year',
        cta: 'Explore the Compliance Engine',
        blocks: [
          {
            title: 'Cut compliance prep by 70%',
            description:
              'Continuous AI assessment of your products against the public laws, decrees and regulations of your target markets, turning a 3-month exercise into a same-day, repeatable check.',
          },
          {
            title: 'Actionable, not abstract',
            description:
              'Every gap comes with a plain-language explanation, a recommended fix, an owner, and a deadline. No more 80-page audit reports nobody opens.',
          },
          {
            title: 'You stay in control',
            description:
              'Every AI-generated result (reports, action plans, detected gaps) lands in a review queue first. Nothing becomes an official record or an executable action until your Quality Manager approves it.',
          },
        ],
      },
      monitoring: {
        tag: 'AI-powered',
        label: 'Regulatory Monitoring',
        headline: 'Never be surprised by a regulation again',
        cta: 'Explore Regulatory Monitoring',
        blocks: [
          {
            title: 'Watches the laws that apply to you',
            description:
              'Qurelio tracks the public regulations relevant to your products and markets. When a law changes, you are the first to know exactly what it means for you.',
          },
          {
            title: 'Finds what you did not know to look for',
            description:
              'When a relevant regulation you never mentioned appears, Qurelio surfaces it and tells you precisely which products are affected, pending your review.',
          },
        ],
      },
      audit: {
        tag: 'Automated',
        label: 'Audit Automation',
        headline: 'Run audits without chasing a single email',
        cta: 'Explore Audit Automation',
        blocks: [
          {
            title: 'AI-drafted checklists and findings',
            description:
              'Define audit programs and assign auditors, then let AI draft checklists while the platform sends reminders, collects responses, and compiles findings automatically.',
          },
          {
            title: 'From audit to action in one click',
            description:
              'Findings flow straight into your action plans, with full traceability from observation to closure.',
          },
        ],
      },
      capa: {
        tag: 'Tracking',
        label: 'Non-Conformities & CAPA',
        headline: 'Solve issues at the root, not at the symptom',
        cta: 'Explore CAPA',
        blocks: [
          {
            title: 'Built-in 5 Whys, Ishikawa & 8D',
            description:
              'Capture non-conformities from any source (audits, QC, customer complaints) and run structured root cause analysis without leaving the platform.',
          },
          {
            title: 'Verified effectiveness',
            description:
              'Drive corrective and preventive actions through implementation, then automatically verify they worked. Close the loop, every time.',
          },
        ],
      },
      documents: {
        tag: 'Documents',
        label: 'Controlled Documents & File Library',
        headline: 'One source of truth: versioned, signed, distributed',
        cta: 'Explore Documents',
        blocks: [
          {
            title: 'Approval workflows that actually work',
            description:
              'Multi-stage review, e-signatures, and automatic distribution to the right people, with a complete, audit-ready trail. Private by default.',
          },
          {
            title: 'No more rogue versions',
            description:
              'Old versions are archived automatically. Anyone can find the current procedure in seconds, not in a shared drive labyrinth.',
          },
        ],
      },
      dashboards: {
        tag: 'Analytics',
        label: 'Live KPI Dashboards',
        headline: 'See your quality posture at a glance',
        cta: 'Explore Dashboards',
        blocks: [
          {
            title: 'Real-time, role-based views',
            description:
              'Compliance scores, open actions, audit status and quality KPIs for every site, team and regulation, live, not end-of-month.',
          },
          {
            title: 'Drill from KPI to evidence',
            description:
              'Click any number to trace it back to the source: audit, finding, document, or signature. Total transparency.',
          },
        ],
      },
    },
  },

  /* ─── How it works ───────────────────────────────────────────────────── */
  how: {
    sectionLabel: 'How Qurelio works',
    eyebrow: 'How it works',
    heading: 'How it <em>works</em>',
    sub: 'Three calm steps. From the day you describe your organization to the daily rhythm of staying compliant, Qurelio guides every move, and you approve every decision.',
    steps: [
      {
        action: 'Onboard',
        title: 'Teach Qurelio your organization',
        lead: 'Start where you are.',
        description:
          'Describe your company, products and markets, then bring your product folders and quality documents into one organised home. Qurelio builds a private compliance memory of your organization, so every answer is about your reality.',
        detailsLabel: 'What happens here',
        details: [
          'Guided onboarding captures your activity, markets and quality context',
          'Drag-and-drop bulk import of product folders and records',
          'Private by default: your memory is yours alone, never shared',
        ],
      },
      {
        action: 'Assess',
        title: 'Upload a regulation, get your verdict',
        lead: 'See the gaps clearly.',
        description:
          'Add any public law, decree or regulation that applies to you. Qurelio evaluates your products against it, clause by clause, and returns a compliance score and maturity level, with every gap explained in plain language.',
        detailsLabel: 'What you receive',
        details: [
          'Clause-by-clause compliance and maturity assessment',
          'Plain-language explanation of every gap',
          'Suggested fixes, each with an owner and a date, pending your approval',
        ],
      },
      {
        action: 'Monitor & improve',
        title: 'Never be surprised by a regulation again',
        lead: 'Keep the momentum.',
        description:
          'Qurelio keeps watching. When a regulation changes, or a relevant one you never mentioned appears, you get an alert that says exactly which products are affected and what to do. Every closed gap becomes a visible milestone.',
        detailsLabel: 'What stays with you',
        details: [
          'Alerts when regulatory changes affect your compliance',
          'Detection of applicable regulations you didn’t know about',
          'Live KPIs and a one-click evidence trail, ready for any auditor',
        ],
      },
    ],
  },

  /** Micro-labels drawn inside the landing illustrations. */
  illustrations: {
    dropFilesHere: 'Drop files here',
    decree: 'Decree',
    regulation: 'Regulation',
    law: 'Law',
    gapsFound: '3 gaps found',
    score: 'SCORE',
    closed: 'CLOSED',
    open: 'OPEN',
  },

  /* ─── Pricing ────────────────────────────────────────────────────────── */
  pricing: {
    sectionLabel: 'Pricing',
    eyebrow: 'Pricing',
    heading: 'Simple, <em>transparent</em> pricing',
    sub: 'Choose the plan that fits your regulatory complexity. Annual contracts, no implementation fee, no hidden costs. The legal guardrail, the human-in-the-loop quarantine and the audit trail are in <b>every</b> plan — what scales is your portfolio, not your safety.',
    billingGroupLabel: 'Billing period',
    annual: 'Annual',
    quarterly: 'Quarterly',
    quarterlyTag: '+5%',
    perYear: 'per year',
    perQuarter: 'per quarter',
    onRequest: 'On request',
    tailored: 'Tailored to your industry',
    context:
      '<b>How does Qurelio compare?</b> eQMS platforms for regulated industries range from $5,000–$15,000 / year for small teams to $25,000–$100,000+ / year for mid-market (SimplerQMS, Qualio, Greenlight Guru). Qurelio’s Professional plan, at €24,000 / year for 10 users, includes regulatory monitoring and AI compliance analysis — capabilities not included in standard eQMS pricing. No implementation fee. No per-module add-ons for core quality operations.',
    plans: [
      {
        name: 'Early Access Pilot',
        description: 'Professional, in full, at pilot pricing — shape the product with us.',
        priceNote: '€500 / month equivalent · 75% off Professional',
        quarterlyNote: 'Annual billing only for the pilot programme',
        scope: '5 users · Professional scope otherwise · open worldwide',
        ctaLabel: 'Request pilot access',
        ctaNote: 'contact@qurelio.com · open worldwide',
        badge: 'Early access',
        features: [
          'The complete Professional plan — no feature exceptions',
          'Dedicated onboarding session, no charge',
          'Priority addition of your regulatory sources to the monitored registry',
          'Direct feedback line to the product team + roadmap input',
          'Custom scope available after pilot',
          'Standard Professional pricing applies from client 6 onward',
        ],
      },
      {
        name: 'Starter',
        description:
          'Run quality operations properly, and get your first regulations under control.',
        priceNote: '€800 / month equivalent',
        quarterlyNote: 'Billed every 3 months · +5% on the annual price',
        scope: '3 users · 3 products · 2 active regulations',
        ctaLabel: 'Start free trial',
        ctaNote: '14-day trial · no credit card',
        badge: '',
        features: [
          'Onboarding wizard & organizational profile',
          'Product folder ingestion → private Compliance Memory',
          'Compliance engine — obligations, gap list, weighted score, every finding cited',
          'Legal Guardrail & HITL Quarantine on every AI output',
          'File Library, Non-Conformities & CAPA lifecycle',
          'Internal audits, root-cause tools, action plans',
          'Email support, 48h · assisted onboarding included',
        ],
      },
      {
        name: 'Professional',
        description: 'Everything in Starter — plus the regulatory landscape watching itself.',
        priceNote: '€2,000 / month equivalent',
        quarterlyNote: 'Billed every 3 months · +5% on the annual price',
        scope: '10 users · 25 products · unlimited regulations · 3 sites',
        ctaLabel: 'Start free trial',
        ctaNote: '14-day trial · no credit card',
        badge: 'Most popular',
        features: [
          'Everything in Starter, unmetered',
          'Regulatory Monitoring — substantive-vs-cosmetic change filtering',
          'Impact analysis on your obligations, products and scores',
          'Missing-regulation detection',
          'Qurelio AI Assistant — cited Q&A over your Compliance Memory',
          'Audit-Readiness Dossier + PDF / Excel / PowerPoint export',
          'Priority email + chat support · assisted onboarding included',
        ],
      },
      {
        name: 'Enterprise',
        description: 'Multi-site, multi-supplier, configured to your quality system.',
        priceNote: '€5,000 / month minimum · scoped to sites, products & markets',
        quarterlyNote: 'Semi-annual billing available on request',
        scope: 'Unlimited users, products & regulations · multi-site consolidation',
        ctaLabel: 'Request a quote',
        ctaNote: 'tailored scope · no fixed price',
        badge: '',
        features: [
          'Everything in Professional',
          'Supplier Quality Management — AVL, scorecards, risk tiering, SCAR',
          'External Supplier Portal with isolated access',
          'Multi-site portfolio — consolidated and per-site scoring',
          'Configurable scoring, custom roles & external auditor access',
          'SSO (Google, Microsoft, SAML 2.0) · public API & webhooks',
          'Dedicated Customer Success Manager + contractual SLA',
        ],
      },
    ],
  },

  /* ─── Plan comparison table ──────────────────────────────────────────── */
  compare: {
    sectionLabel: 'Plan comparison',
    eyebrow: 'Compare',
    heading: 'Every feature, <em>every plan</em>',
    sub: 'Organised by the five pillars of the platform. Scroll horizontally on smaller screens.',
    legendIncluded: 'included',
    legendNotIncluded: 'not included',
    featureColumn: 'Feature',
    scrollHint: 'Scroll the table sideways to see every plan →',
    ariaIncluded: 'included',
    ariaNotIncluded: 'not included',
    columns: [
      { name: 'Early Access', price: '€6,000 / yr' },
      { name: 'Starter', price: '€9,600 / yr' },
      { name: 'Professional', price: '€24,000 / yr' },
      { name: 'Enterprise', price: 'On request' },
    ],
    groups: [
      {
        title: 'Scope',
        rows: [
          { label: 'Users', cells: ['5 · worldwide', '3', '10', 'Unlimited'] },
          { label: 'Products in registry', cells: ['25', '3', '25', 'Unlimited'] },
          { label: 'Active regulations', cells: ['Unlimited', '2', 'Unlimited', 'Unlimited'] },
          { label: 'AI evaluation runs / year', cells: ['Fair use', '4', 'Fair use', 'Unlimited'] },
          { label: 'Sites / legal entities', cells: ['3', '1', '3', 'Unlimited'] },
        ],
      },
      {
        title: 'Pillar 1 — Context & Memory',
        rows: [
          { label: 'Onboarding wizard & organizational profile', cells: [true, true, true, true] },
          { label: 'Product folder ingestion → Compliance Memory', cells: [true, true, true, true] },
          { label: 'Product Registry & regulatory profile', cells: [true, true, true, true] },
          { label: 'OCR & text extraction', cells: [true, true, true, true] },
        ],
      },
      {
        title: 'Pillar 2 — Compliance Engine',
        rows: [
          { label: 'Public-regulation upload & analysis', cells: [true, true, true, true] },
          {
            label: 'Obligation extraction, cited to the source passage',
            cells: [true, true, true, true],
          },
          { label: 'Obligations Register + liability acceptance', cells: [true, true, true, true] },
          { label: 'Gap list & evidence mapping', cells: [true, true, true, true] },
          {
            label: 'Compliance score (criticality-weighted)',
            cells: [true, true, true, 'Configurable'],
          },
          { label: '5-level maturity model', cells: [true, true, true, 'Configurable'] },
          { label: 'Confidence indicators on every AI output', cells: [true, true, true, true] },
          {
            label: 'Re-evaluation & score history',
            cells: ['+ automatic', 'On demand', '+ automatic', '+ automatic'],
          },
          { label: 'AI-suggested NCs & CAPAs from gaps', cells: [true, true, true, true] },
        ],
      },
      {
        title: 'Pillar 3 — Regulatory Monitoring',
        rows: [
          { label: 'Monitored source registry', cells: [true, false, true, true] },
          {
            label: 'Scheduled change detection (cosmetic changes filtered)',
            cells: [true, false, true, true],
          },
          {
            label: 'Impact analysis on your obligations & scores',
            cells: [true, false, true, true],
          },
          { label: 'Missing-regulation detection', cells: [true, false, true, true] },
          { label: 'Severity-based alerts', cells: [true, false, true, true] },
        ],
      },
      {
        title: 'Pillar 4 — Quality Operations',
        rows: [
          {
            label: 'File Library — versioning, approval, ACL, search',
            cells: [true, true, true, true],
          },
          { label: 'Non-Conformities', cells: [true, true, true, true] },
          { label: 'CAPA lifecycle & effectiveness verification', cells: [true, true, true, true] },
          { label: 'Internal audits, checklists, findings → NC', cells: [true, true, true, true] },
          { label: 'Root-cause: 5-Whys · Ishikawa', cells: [true, true, true, true] },
          { label: 'Root-cause: 8D', cells: [true, false, true, true] },
          { label: 'Action Plan Center · Kanban · calendar', cells: [true, true, true, true] },
          { label: 'Training portal & competency matrix', cells: [true, true, true, true] },
          { label: 'Supplier Quality — AVL, scorecards, SCAR', cells: [false, false, false, true] },
          { label: 'External Supplier Portal', cells: [false, false, false, true] },
          {
            label: 'Management Review · Change Control · Calibration · CSAT · HSE',
            cells: [false, false, false, true],
          },
        ],
      },
      {
        title: 'Pillar 5 — Intelligence & Control',
        rows: [
          {
            label: 'Legal Guardrail — pre-upload liability consent',
            cells: [true, true, true, true],
          },
          {
            label: 'Legal Guardrail — licensed-standard detection & block',
            cells: [true, true, true, true],
          },
          { label: 'HITL Quarantine on every AI output', cells: [true, true, true, true] },
          { label: 'AI disclosure label on every AI output', cells: [true, true, true, true] },
          { label: 'Quarantine inbox & transition history', cells: [true, true, true, true] },
          { label: 'Qurelio AI Assistant (cited, tenant-scoped)', cells: [true, false, true, true] },
          {
            label: 'Dashboard & KPIs',
            cells: ['Full + heatmap', 'Standard', 'Full + heatmap', 'Full + consolidated'],
          },
          { label: 'Audit-readiness score', cells: [true, false, true, true] },
          { label: 'Drill-down & date filtering', cells: [true, false, true, true] },
        ],
      },
      {
        title: 'Reporting & export',
        rows: [
          { label: 'PDF scorecard', cells: [true, false, true, '+ branded'] },
          { label: 'Excel / PowerPoint export', cells: [true, false, true, '+ branded'] },
          { label: 'Audit-Readiness Dossier', cells: [true, false, true, true] },
        ],
      },
      {
        title: 'Platform & security',
        rows: [
          { label: 'Roles', cells: ['5', '3', '5', 'Custom'] },
          { label: 'Scoped External Auditor access', cells: [false, false, false, true] },
          { label: 'SSO — Google · Microsoft · SAML', cells: [false, false, false, true] },
          { label: 'Tenant data isolation', cells: [true, true, true, true] },
          { label: 'Append-only audit trail', cells: [true, true, true, true] },
          {
            label: 'Audit-log export & retention configuration',
            cells: [false, false, false, true],
          },
          { label: 'Public API & webhooks', cells: [false, false, false, true] },
          { label: 'Interface languages', cells: ['FR · EN', 'FR · EN', 'FR · EN', 'FR · EN'] },
        ],
      },
      {
        title: 'Support & onboarding',
        rows: [
          {
            label: 'Onboarding',
            cells: ['Dedicated', 'Self-service', '2 sessions', 'Full programme'],
          },
          {
            label: 'Support',
            cells: ['Priority email', 'Email · 48h', 'Email + chat', 'CSM + SLA'],
          },
          { label: 'Trial', cells: ['Negotiated', '14 days', '14 days', '30-day POC'] },
        ],
      },
    ],
  },

  /* ─── Scale & billing ────────────────────────────────────────────────── */
  scaleBilling: {
    sectionLabel: 'Scale and billing',
    eyebrow: 'Scale & billing',
    heading: 'You only pay for <em>what you monitor</em>',
    sub: 'Every plan extends along the four dimensions that actually grow with your portfolio: users, products, regulations and evaluation runs.',
    addOnsTitle: 'Add-ons',
    addOnsSub: 'Added at any time, prorated to your current billing period.',
    addOnColumn: 'Add-on',
    starterColumn: 'Starter',
    professionalColumn: 'Professional',
    enterpriseColumn: 'Enterprise',
    notAvailable: 'not available',
    included: 'Included',
    billingTitle: 'Billing',
    billingSub: 'All prices in EUR. Invoices issued in EUR.',
    addOns: [
      {
        label: 'Additional user',
        starter: '€90 / mo',
        professional: '€80 / mo',
        enterprise: '€75 / mo',
      },
      {
        label: 'Products — pack of 10',
        starter: '€1,200 / yr',
        professional: '€900 / yr',
        enterprise: 'Included',
      },
      {
        label: 'Active regulations — pack of 5',
        starter: '€1,800 / yr',
        professional: 'Included',
        enterprise: 'Included',
      },
      {
        label: 'Additional site / legal entity',
        starter: null,
        professional: '€2,400 / yr',
        enterprise: 'Included',
      },
      {
        label: 'AI evaluation runs — pack of 10',
        starter: '€600',
        professional: 'Fair use',
        enterprise: 'Included',
      },
      {
        label: 'Supplier Portal seats — pack of 25',
        starter: null,
        professional: null,
        enterprise: '€3,000 / yr',
      },
    ] as { label: string; starter: string | null; professional: string | null; enterprise: string | null }[],
    billingTerms: [
      { term: 'Standard', detail: 'Annual, billed once per year. Lowest price.' },
      { term: 'Quarterly', detail: 'Starter and Professional, +5% on the annual price.' },
      { term: 'Semi-annual', detail: 'Enterprise, on request.' },
      {
        term: 'Implementation',
        detail: '<b>None.</b> Onboarding is included in every plan at no extra charge.',
      },
      {
        term: 'Contract',
        detail:
          'Minimum 12 months. Auto-renews unless cancelled 30 days before the renewal date.',
      },
      {
        term: 'Changes',
        detail: 'Upgrade any time, prorated. Downgrades take effect at renewal.',
      },
    ],
  },

  /* ─── Pricing FAQ ────────────────────────────────────────────────────── */
  faq: {
    sectionLabel: 'Pricing questions',
    eyebrow: 'Questions',
    heading: 'What RA & QA teams <em>ask us first</em>',
    items: [
      {
        q: 'Is the regulatory content safe to use in a regulated environment?',
        a: [
          'Qurelio ingests only <b>public, freely reusable legal texts</b>. Every regulation in your workspace displays its source URL and its legal status, so you can verify it yourself at any time. Licensed standards — ISO, IEC and equivalents — are automatically detected on upload and are never stored, never embedded, and never sent to an AI model. That is enforced by the platform’s architecture, not by policy. Where a standard you need is licensed, Qurelio tells you which one to acquire and lets you work from your own copy.',
        ],
      },
      {
        q: 'How does Qurelio handle AI outputs in a regulated environment?',
        a: [
          'Every AI output carries a visible AI disclosure and is created in <b>Quarantine</b>. Nothing an AI produces becomes executable until your Quality Manager reviews it and accepts it — with edit, accept and reject controls and a full transition history of who accepted what, and when. Qurelio never makes an autonomous compliance decision, and every finding cites the passage of the source text it came from.',
          'The AI helps you work faster. You remain responsible. That is exactly what your auditors expect.',
        ],
      },
      {
        q: 'What happens to our compliance data?',
        a: [
          'Your data is isolated in a dedicated tenant environment — no other Qurelio client can reach your products, regulatory profiles, gap analyses or audit records. We sign a Data Processing Agreement before any data enters the system, and the audit trail is append-only. Your documents are never used to train a model.',
        ],
      },
      {
        q: 'Why is the compliance engine included in every plan?',
        a: [
          'Because it is the reason to use Qurelio. Plans differ by how much you run through it — how many products, regulations and evaluation runs — not by whether you get it at all. A Starter customer analyses two regulations against three products; an Enterprise customer runs an entire multi-site portfolio. Same engine, same guardrails, same audit trail.',
        ],
      },
      {
        q: 'Can I upgrade or downgrade my plan?',
        a: [
          'Yes. Upgrade at any time — the difference is prorated from your current billing period. Downgrades take effect at the next renewal date. Enterprise clients should speak to their Customer Success Manager directly.',
        ],
      },
      {
        q: 'Is there a free trial, and do you charge for onboarding?',
        a: [
          'Starter and Professional include a 14-day free trial, no credit card required. Enterprise clients receive a 30-day proof of concept built around their own regulatory context and product portfolio.',
          'Onboarding is included in every plan at no extra charge — we assist every client personally, regardless of plan. We do not charge implementation fees.',
        ],
      },
      {
        q: 'What is the Early Access Pilot programme?',
        a: [
          'An early-access programme open worldwide — the first five manufacturers to join, from any country. Pilot clients get the <b>complete Professional plan</b> at €6,000 / year, with priority for adding their national regulatory sources to the monitored registry — each source subject to legal clearance before it goes live. The interface is FR/EN today; Arabic is on the roadmap. Standard Professional pricing applies from client 6 onward. After the pilot, scope can be customised — users, modules, and regulations adapted to your exact quality system. Write to contact@qurelio.com to apply.',
        ],
      },
      {
        q: 'Can the plan be customised after the pilot?',
        a: [
          'Yes — and that is the point of the pilot. After your onboarding period, Early Access clients and Enterprise clients can adjust scope with us: the number of users, the modules active in their workspace, the regulatory sources being monitored, and the add-on dimensions (products, regulations, evaluation runs). We scope the arrangement to your actual quality system — not to a fixed tier. Contact your onboarding contact or write to contact@qurelio.com to discuss.',
        ],
      },
    ],
  },

  /* ─── About block (unused on the current landing, kept translated) ───── */
  about: {
    badge: 'Why Qurelio',
    headingLead: 'Quality management,',
    headingHighlight: 'simplified',
    sub: 'Qurelio helps organizations prove their products meet the public laws and regulations of every market they sell to. From document control to audits and non-conformities, teams get a single workspace that stays audit-ready.',
    stats: [
      { value: '70%', label: 'Less compliance prep' },
      { value: '100%', label: 'Human-approved AI' },
      { value: '24/7', label: 'Regulatory monitoring' },
    ],
    benefits: [
      {
        title: 'Structured Workflows',
        description:
          'Streamlined processes for documents, evaluations, and CAPAs that keep your team aligned.',
      },
      {
        title: 'Role-Based Access',
        description:
          'Granular permissions for admins, directors, and shop-floor teams, so everyone sees what matters.',
      },
      {
        title: 'AI-Powered Insights',
        description:
          'Intelligent analysis over your quality data to identify trends before they become issues.',
      },
    ],
  },

  /* ─── Contact ────────────────────────────────────────────────────────── */
  contact: {
    illustrationAlt: 'Send us a message',
    heading: 'Contact us',
    sub: 'Tell us about your products, your markets and your compliance challenges. We’ll show you what Qurelio can do with them.',
    nameLabel: 'Full name',
    namePlaceholder: 'Jane Doe',
    emailLabel: 'Email Address',
    emailPlaceholder: 'you@company.com',
    companyLabel: 'Company',
    companyPlaceholder: 'Your company',
    messageLabel: 'Message',
    messagePlaceholder: 'Tell us about your needs...',
    replyNoteLead: 'We typically reply within',
    replyNoteStrong: 'one business day.',
    submit: 'Send message',
    submitting: 'Sending…',
    sentTitle: 'Message sent!',
    sentBody: 'Thanks for reaching out. We’ll get back to you within one business day.',
    sendAnother: 'Send another message',
    toastSuccess: 'Message sent successfully',
    toastError: 'Could not send. Please try again.',
    inquiryFrom: 'Inquiry from {company}',
  },

  /* ─── Footer ─────────────────────────────────────────────────────────── */
  footer: {
    tagline:
      'Regulatory compliance, audits and quality operations: calm, clear, AI-assisted, and always under your control.',
    newsletterLabel: 'Stay in the loop',
    newsletterEmailLabel: 'Email address',
    newsletterPlaceholder: 'you@company.com',
    subscribe: 'Subscribe',
    subscribed: 'Subscribed',
    newsletterNote: 'One email per month. No spam, unsubscribe in one click.',
    columns: [
      {
        heading: 'Product',
        links: ['Features', 'How it works', 'Why Qurelio', 'Pricing'],
      },
      {
        heading: 'Resources',
        links: [
          'Blog',
          'Help Center',
          'Customer Stories',
          'Documentation',
          'Security & Compliance',
          'Newsletter',
          'Partners',
        ],
      },
      {
        heading: 'Company',
        links: ['About', 'Careers', 'Press', 'Contact'],
      },
    ],
    copyright: '© {year} Qurelio. Powered by Pura Solutions.',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
  },

  /* ─── Auth ───────────────────────────────────────────────────────────── */
  auth: {
    layout: {
      badge: 'ISO-ready quality workflows',
    },
    login: {
      heroTitle: 'Quality management, simplified',
      heroSubtitle:
        'Sign in to coordinate documents, audits, evaluations, and corrective actions in one workspace.',
      title: 'Sign in to your account',
      noAccount: 'Don’t have an account?',
      callout: 'Use your organization credentials. Contact your admin if you need access.',
      emailLabel: 'Email address',
      emailPlaceholder: 'you@company.com',
      passwordLabel: 'Password',
      forgotPassword: 'Forgot password?',
      remember: 'Remember me',
      submit: 'Sign in',
      submitting: 'Signing in…',
      newOrganization: 'New organization?',
      errorMissingToken: 'Login response missing token',
      errorNetwork:
        'Cannot reach the API. If you use Docker, rebuild the frontend and ensure the gateway is up.',
      errorNotVerified: 'Please verify your email first',
      errorLocked:
        'This account is temporarily locked for 30 minutes after too many failed login attempts.',
      errorInvalid: 'Incorrect email or password. Please try again.',
      errorGeneric: 'Login failed. Please try again.',
      welcome: 'Welcome back!',
    },
    registerHub: {
      heroTitle: 'Choose how you want to get started',
      heroSubtitle:
        'Pick the path that matches your situation. You can always contact support if you are unsure.',
      title: 'Create an account',
      sub: 'Select one of the options below to continue.',
      alreadyHaveAccount: 'Already have an account?',
      options: [
        {
          emphasis: 'For directors & organization owners',
          title: 'Register as a company',
          description:
            'Create a new organization workspace, invite your team, and manage ISO quality in one place.',
        },
        {
          emphasis: 'For employees & team members',
          title: 'Join as part of a company',
          description:
            'You received an invite or your admin asked you to create an account under an existing organization.',
        },
      ],
    },
    registerCompany: {
      heroTitle: 'Your ISO workspace starts here',
      heroSubtitle:
        'Register your organization to centralize documents, audits, and non-conformities in Qurelio.',
      title: 'Create Company Account',
      alreadyHaveAccount: 'Already have an account?',
      joiningInstead: 'Joining an existing company instead?',
      joinAsMember: 'Sign up as team member',
      companyNameLabel: 'Company name',
      fieldLabel: 'Field',
      fieldPlaceholder: 'Select field',
      emailLabel: 'Email',
      emailPlaceholder: 'company@email.com',
      phoneLabel: 'Phone number',
      descriptionLabel: 'Description',
      descriptionPlaceholder: 'Briefly describe your company and quality goals...',
      capacityLabel: 'Company capacity',
      capacityPlaceholder: 'Select size',
      capacitySuffix: 'employees',
      passwordLabel: 'Password',
      confirmPasswordLabel: 'Confirm password',
      submit: 'Create account',
      submitting: 'Creating account…',
      success: 'Account created! Please verify your email.',
      error: 'Registration failed. Please try again.',
      errors: {
        companyName: 'Company name required',
        field: 'Field required',
        email: 'Invalid email',
        description: 'Description too short',
        capacity: 'Capacity required',
        passwordMismatch: 'Passwords don’t match',
      },
    },
    registerUser: {
      heroTitle: 'Elevate your quality standards',
      heroSubtitle: 'Join our platform to streamline your quality management processes.',
      title: 'Create your Personal Account',
      alreadyHaveAccount: 'Already have an account?',
      creatingOrganization: 'Creating a new organization?',
      registerCompanyLink: 'Register your company',
      firstNameLabel: 'First name',
      firstNamePlaceholder: 'John',
      lastNameLabel: 'Last name',
      lastNamePlaceholder: 'Doe',
      emailLabel: 'Email',
      emailPlaceholder: 'your@email.com',
      phoneLabel: 'Phone number',
      companyCodeLabel: 'Company workspace code',
      companyCodePlaceholder: 'QUR12AB3',
      passwordLabel: 'Password',
      roleLabel: 'Select your role',
      rolePlaceholder: 'Choose a role…',
      submit: 'Create account',
      submitting: 'Creating account…',
      success: 'Account created! Please verify your email.',
      error: 'Registration failed. Please try again.',
      errors: {
        firstName: 'First name required',
        lastName: 'Last name required',
        email: 'Invalid email',
        companyCode:
          'Use the 8-character workspace code from your director (QUR plus 5 letters or digits)',
        role: 'Please select a role',
      },
    },
    forgotPassword: {
      title: 'Forgot your password?',
      sub: 'Please enter the email address associated with your account and we’ll email you a link to reset your password.',
      emailLabel: 'Email address',
      emailPlaceholder: 'example@gmail.com',
      submit: 'Send request',
      submitting: 'Sending…',
      remembered: 'Remembered your password?',
      sentTitle: 'Check your email',
      sentBody: 'We sent a password reset link to',
      enterResetCode: 'Enter reset code',
      returnToSignIn: '← Return to sign in',
      success: 'Reset link sent to your email',
      error: 'Failed to send reset email',
      invalidEmail: 'Invalid email',
    },
    resetPassword: {
      back: 'Back',
      title: 'Set new password',
      sub: 'Enter the code from your email and create a new password.',
      codeLabel: 'Code from email',
      newPasswordLabel: 'New password',
      confirmPasswordLabel: 'Confirm new password',
      togglePassword: 'Toggle password',
      passwordHint:
        '8–128 characters, with uppercase, lowercase, a number, and a special character.',
      submit: 'Set new password',
      submitting: 'Resetting…',
      returnToSignIn: 'Return to sign in',
      success: 'Password reset successfully!',
      error: 'Reset failed. Please try again.',
      errors: {
        code: 'Enter the code from email',
        passwordMismatch: 'Passwords don’t match',
      },
    },
    setupAccount: {
      title: 'Set your password',
      sub: 'Welcome to Qurelio! Create a password for',
      newPasswordLabel: 'New password',
      confirmPasswordLabel: 'Confirm password',
      passwordHint:
        '8–128 characters, with uppercase, lowercase, a number, and a special character.',
      submit: 'Activate my account',
      submitting: 'Activating…',
      backToSignIn: 'Back to sign in',
      invalidLink: 'Invalid setup link. Please ask your director to resend the invitation.',
      success: 'Password set! You can now sign in.',
      error: 'Setup failed. The link may have expired.',
      errors: {
        passwordMismatch: 'Passwords don’t match',
      },
    },
    verifyOtp: {
      back: '← Back',
      title: 'Verify your email',
      intro:
        'If you closed this page before, your account is still saved. Enter the same email you used to register, then the code from your email (valid 10 minutes). Use <b>Resend code</b> if it expired.',
      registrationEmailLabel: 'Registration email',
      sentTo: 'We’ve sent a 6-digit code to',
      submit: 'Verify email',
      submitting: 'Verifying…',
      noCode: 'Didn’t receive a code?',
      resendIn: 'Resend in {time}',
      resend: 'Resend code',
      changeEmail: 'Change email address',
      errorNoEmail: 'Enter the email you used to register',
      errorIncomplete: 'Please enter the complete 6-digit code',
      errorInvalidCode: 'Invalid or expired code',
      errorResendNoEmail: 'Enter your registration email first',
      errorResend: 'Failed to resend code',
      resendSuccess: 'New code sent!',
      successCompany:
        'Email verified. A super admin must still approve your company before you can log in.',
      successUser:
        'Email verified. Your company admin must activate your account before you can log in.',
    },
    validation: {
      email: 'Invalid email',
      passwordMin: 'At least 8 characters',
      passwordMax: 'Maximum 128 characters',
      passwordComplexity:
        'Use 8–128 characters with uppercase, lowercase, a number, and a special character.',
      passwordMinLogin: 'Password must be at least 6 characters',
      phoneRequired: 'Phone required',
      phoneInvalid: 'Enter a valid phone number with country code.',
      fixHighlighted: 'Please fix the highlighted fields.',
    },
  },

  /* ─── Book a demo ────────────────────────────────────────────────────── */
  demo: {
    page: {
      backToQurelio: 'Back to Qurelio',
      eyebrow: 'Book a demo',
      title: 'Choose a time that suits you',
      sub: 'Pick an available slot and tell us about your company. We confirm every request within {hours} hours. All times are shown in your local timezone.',
      loading: 'Loading available times…',
      loadFailedTitle: 'Could not load the calendar',
      loadFailedBody: 'Please check your connection and try again.',
      emptyTitle: 'No times available right now',
      emptyBody:
        'New slots are opened regularly. Please check back soon, or reach us from the contact section on the home page.',
      previousMonth: 'Previous month',
      nextMonth: 'Next month',
      weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      legendAvailable: 'Days with available times',
      selectDay: 'Select a day',
      pickHighlighted: 'Pick a highlighted day on the calendar',
      timeAvailable: '{count} time available',
      timesAvailable: '{count} times available',
      minutesShort: 'min',
      sentTitle: 'Request sent',
      sentBody:
        'We have your request for <b>{slot}</b>. Our team will confirm by email within {hours} hours, and the slot is held for you until then.',
      sentNote:
        'Nothing to prepare in the meantime. The demo will be built on what you’ve just told us.',
      pilotTitle: 'About the pilot programme',
      pilotBody:
        'Participants get early access, a locked-in launch price, and a monthly session with the product team. In return, we expect regular feedback on actual usage. We’ll tell you more when we talk.',
      backToHome: 'Back to home',
      bookAnother: 'Book another slot',
    },
    modal: {
      title: 'Book your demo',
      description:
        'These few questions help us prepare a demo that fits your actual business rather than a generic walkthrough.',
      slotDuration: '{minutes} minutes · shown in your local time',
      stepProgress: 'Step {current} of {total}: {label}',
      steps: ['You & your company', 'Your regulatory context', 'Your priorities & your demo'],
      replyNote: 'We reply within {hours} hours. Your slot is held until then.',
      submit: 'Send my request',
      q1: 'First and last name',
      q1Placeholder: 'Your name',
      q2: 'Your work email',
      q2Help: 'We send no newsletters and no automated prospecting.',
      q2Placeholder: 'you@company.com',
      q2PersonalHint:
        'A work address helps us prepare your demo, but this one is fine if it is the address you actually work from.',
      q3: 'Company name',
      q3Placeholder: 'Your company',
      q4: 'Your role',
      q4Other: 'Please specify your role',
      q4Consulting: 'Are you looking at Qurelio for your own firm, for your clients, or both?',
      q5: 'Phone / WhatsApp',
      q5Help: 'So we can agree on a slot faster. Include the country code, e.g. +216 XX XXX XXX.',
      q6: 'Field / Industry',
      q7: 'Company size',
      q8Active: 'Markets you are already active in',
      q8Help: 'At least one selection across both market lists.',
      q8Target: 'Markets you are targeting within 12–24 months',
      q9: 'Certifications or standards you hold or are pursuing',
      q10: 'How many products or references do you manage?',
      q11: 'How do you manage compliance today?',
      q11Which: 'Which one?',
      q12: 'Your main day-to-day challenges ({max} answers maximum)',
      q12Help: '{selected} of {max} selected',
      q13: 'When do you want a solution in place?',
      q14: 'Your role in this decision',
      q15: 'Would you like to join the pilot programme?',
      q15Help:
        'Early access, preferential launch pricing, and regular sessions with the product team to help shape what comes next.',
      q16: 'Anything specific you’d like to see during the demo?',
      q16Help:
        'A concrete case, a regulatory text, a specific bottleneck. We’ll build the demo around it.',
      q17: 'Preferred language for the demo',
      q18: 'Consent',
      pleaseSpecify: 'Please specify',
      consentContact:
        'I agree that {entity}, publisher of Qurelio, may use the information provided to prepare and schedule my demo and to contact me about it. This data is neither sold nor shared with third parties. I may request its correction or deletion at any time at {email}.',
      consentMarketing: 'I’d like to receive Qurelio product news and regulatory updates.',
      errors: {
        fullName: 'Enter your first and last name',
        email: 'Enter a valid work email',
        companyName: 'Enter your company name',
        role: 'Select your role',
        roleOther: 'Please specify your role',
        consultingScope:
          'Tell us whether this is for your own firm, your clients, or both',
        field: 'Select your primary industry',
        companyCapacity: 'Select your company size',
        markets: 'Select at least one market you are active in or targeting',
        certificationsOther: 'Please specify the other certification',
        complianceToday: 'Tell us how you manage compliance today',
        qmsName: 'Which QMS or eQMS do you use?',
        challenges: 'Select at least one challenge',
        challengesOther: 'Please specify the other challenge',
        timeline: 'Select when you want a solution in place',
        decisionRole: 'Select your role in the decision',
        pilotInterest: 'Tell us about the pilot programme',
        consent: 'Consent is required to process your request',
        submit: 'Could not send your request',
      },
    },
  },

  /**
   * Labels for option values that are sent to the API verbatim.
   *
   * The backend DTOs validate the exact English strings, so the stored value
   * never changes: only the label the visitor reads is translated. Keys here
   * are the canonical API values.
   */
  optionLabels: {
    /* Company fields (registration + demo) */
    Manufacturing: 'Manufacturing',
    Healthcare: 'Healthcare',
    Technology: 'Technology',
    Finance: 'Finance',
    Retail: 'Retail',
    Construction: 'Construction',
    Education: 'Education',
    Logistics: 'Logistics',
    'Food & Beverage': 'Food & Beverage',
    Other: 'Other',

    /* Company capacity */
    '1-10': '1-10',
    '11-50': '11-50',
    '51-200': '51-200',
    '201-500': '201-500',
    '500+': '500+',

    /* Team member roles */
    'Quality Manager': 'Quality Manager',
    Auditor: 'Auditor',
    Operator: 'Operator',

    /* Early-access roles */
    'Quality Manager / Quality Director (QM)': 'Quality Manager / Quality Director (QM)',
    'Quality Assurance Manager (QA)': 'Quality Assurance Manager (QA)',
    'Regulatory Affairs Manager (RA)': 'Regulatory Affairs Manager (RA)',
    'Responsible Pharmacist / Market Release Manager':
      'Responsible Pharmacist / Market Release Manager',
    'Executive management (CEO / Managing Director / owner)':
      'Executive management (CEO / Managing Director / owner)',
    'Production or Operations Manager': 'Production or Operations Manager',
    'Quality & regulatory consultant': 'Quality & regulatory consultant',

    /* Industries */
    'Pharmaceutical industry': 'Pharmaceutical industry',
    'Cosmetic industry': 'Cosmetic industry',
    'MedTech (Medical Technology)': 'MedTech (Medical Technology)',

    /* Consulting scope */
    'For my own firm': 'For my own firm',
    'For my clients': 'For my clients',
    Both: 'Both',

    /* Early-access company sizes */
    '1 – 10 employees': '1 – 10 employees',
    '11 – 50': '11 – 50',
    '51 – 200': '51 – 200',
    '201 – 500': '201 – 500',
    'More than 500': 'More than 500',

    /* Markets */
    'Tunisia (domestic market)': 'Tunisia (domestic market)',
    'European Union': 'European Union',
    'United Kingdom': 'United Kingdom',
    'United States': 'United States',
    'Gulf / Saudi Arabia (SFDA, GSO)': 'Gulf / Saudi Arabia (SFDA, GSO)',
    'North Africa (Algeria, Morocco, Libya, Egypt)':
      'North Africa (Algeria, Morocco, Libya, Egypt)',
    'Sub-Saharan Africa (WAEMU / ECOWAS)': 'Sub-Saharan Africa (WAEMU / ECOWAS)',

    /* Certifications */
    'ISO 9001': 'ISO 9001',
    'ISO 13485 (medical devices)': 'ISO 13485 (medical devices)',
    GMP: 'GMP',
    'GDP (distribution)': 'GDP (distribution)',
    'ISO 22716 (cosmetics)': 'ISO 22716 (cosmetics)',
    'HACCP / ISO 22000': 'HACCP / ISO 22000',
    'ISO 17025 (laboratories)': 'ISO 17025 (laboratories)',
    'CE marking': 'CE marking',
    'None so far': 'None so far',

    /* Product counts */
    '1 – 5': '1 – 5',
    '6 – 20': '6 – 20',
    '21 – 100': '21 – 100',
    'More than 100': 'More than 100',
    'Not sure / not applicable': 'Not sure / not applicable',

    /* Compliance today */
    'Excel files and shared documents': 'Excel files and shared documents',
    'Paper / physical binders': 'Paper / physical binders',
    'A QMS or eQMS already in place': 'A QMS or eQMS already in place',
    'An external provider / a consultant': 'An external provider / a consultant',
    'Nothing structured so far': 'Nothing structured so far',

    /* Challenges */
    'Keeping up with regulatory changes: monitoring is manual and time-consuming':
      'Keeping up with regulatory changes: monitoring is manual and time-consuming',
    'Checking whether our products or files meet a given regulatory text':
      'Checking whether our products or files meet a given regulatory text',
    'Redoing gap analyses in Excel, for every text and every product':
      'Redoing gap analyses in Excel, for every text and every product',
    'Managing non-conformities and CAPAs with reliable traceability':
      'Managing non-conformities and CAPAs with reliable traceability',
    'Rebuilding an audit or inspection file under time pressure':
      'Rebuilding an audit or inspection file under time pressure',
    'Not missing an expiry or renewal date (certificates, authorisations, qualifications)':
      'Not missing an expiry or renewal date (certificates, authorisations, qualifications)',
    'Handling several markets with different requirements':
      'Handling several markets with different requirements',
    'Finding the right document, in the right version, at the right time':
      'Finding the right document, in the right version, at the right time',
    'Tracking team training and qualifications': 'Tracking team training and qualifications',

    /* Timelines */
    'Immediately (within a month)': 'Immediately (within a month)',
    'This quarter (1 to 3 months)': 'This quarter (1 to 3 months)',
    'In 3 to 6 months': 'In 3 to 6 months',
    'Beyond 6 months / just gathering information for now':
      'Beyond 6 months / just gathering information for now',

    /* Decision roles */
    'I decide': 'I decide',
    'I recommend / I co-decide': 'I recommend / I co-decide',
    "I'm gathering information, others decide": "I'm gathering information, others decide",

    /* Pilot answers */
    "Yes, I'm interested": "Yes, I'm interested",
    "Maybe, I'd like to know more": "Maybe, I'd like to know more",
    "No, I'd just like to see the product": "No, I'd just like to see the product",

    /* Demo languages */
    French: 'French',
    English: 'English',
    Arabic: 'Arabic',
  },
};

export type Messages = typeof en;

export default en;
