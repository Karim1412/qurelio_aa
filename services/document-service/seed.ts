/**
 * Demo seed — creates several products (projects) with documents for the
 * "Althea Medtech / AlphaFlow" medical-device scenario (see Demo Dataset).
 *
 * Products come from product_registry.json; the flagship AlphaFlow 3 gets its
 * document folder from ./seed-data/AlphaFlow3/*.docx.
 *
 * Run from the repo root against the RUNNING stack (host ports):
 *   cd services/document-service
 *   SEED_DB_HOST=localhost SEED_DB_PORT=5433 SEED_MINIO_ENDPOINT=localhost \
 *     npx ts-node seed.ts
 *
 * (5433 = the host port Postgres is published on — see docker-compose.yml.)
 * Optionally target a specific tenant with SEED_COMPANY_ID=<uuid>; otherwise
 * the first company in the database is used.
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as Minio from 'minio';
import * as fs from 'fs';
import * as path from 'path';
import {
  Document,
  DocumentVersion,
  Product,
  FileFolder,
  DocumentType,
  DocumentStatus,
  DocumentApprovalStatus,
} from './src/database/entities/document.entity';
import { DocumentAccessRule } from './src/database/entities/document-access-rule.entity';
import { DocumentAuditEvent } from './src/database/entities/document-audit-event.entity';

// ── Minimal .env loader (repo root) for local runs; real env / SEED_* win ──
function loadEnv() {
  const p = path.join(__dirname, '..', '..', '.env');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[k] === undefined) process.env[k] = v;
  }
}
loadEnv();

const DB_HOST = process.env.SEED_DB_HOST || process.env.POSTGRES_HOST || 'localhost';
const DB_PORT = Number(process.env.SEED_DB_PORT || process.env.POSTGRES_PORT || 5432);
const MINIO_ENDPOINT = process.env.SEED_MINIO_ENDPOINT || process.env.MINIO_ENDPOINT || 'localhost';
const MINIO_PORT = Number(process.env.SEED_MINIO_PORT || process.env.MINIO_PORT || 9000);
const MINIO_BUCKET = process.env.MINIO_BUCKET || 'qurelio-docs';

// ── Market code → label (matches the company/product wizard labels) ────────
const MARKET_LABEL: Record<string, string> = {
  EU: 'European Union',
  UK: 'United Kingdom',
  GCC: 'Gulf (GCC / GSO)',
  MAGHREB: 'North Africa / Maghreb',
};
const marketLabels = (codes: string[]) => codes.map((c) => MARKET_LABEL[c] ?? c);

// ── Product definitions (from product_registry.json) ───────────────────────
type SeedProduct = Partial<Product> & { name: string };

const FLAGSHIP: SeedProduct = {
  name: 'AlphaFlow 3 Volumetric Infusion Pump',
  reference: 'ALT-AF3-2200',
  sku: 'ALT-AF3-2200',
  description:
    'Third-generation reusable volumetric infusion pump for hospital and clinical use. Mains- and battery-powered, with dose-error-reduction software (configurable drug library), air-in-line and occlusion detection, and a tamper-evident therapy event log.',
  brandName: 'AlphaFlow',
  productFamily: 'AlphaFlow Infusion Platform',
  productType: 'finished',
  productStatus: 'active',
  categoryTags: ['Active medical device — volumetric infusion pump'],
  intendedUse:
    'Mains- and battery-powered volumetric infusion pump for the controlled intravenous administration of fluids, medications, blood and blood products to adult, pediatric and neonatal patients in hospital and clinical environments. Delivery range 0.1–1200 mL/h with ±5% flow accuracy.',
  targetUsers: ['Medical professionals', 'B2B — Commercial / Distribution (hospital procurement)'],
  keyMaterials: [
    'Medical-grade polycarbonate housing',
    'Platinum-cured silicone pumping segment',
    'Rechargeable lithium-ion battery',
    'PCBA / embedded microcontroller',
    'DEHP-free, latex-free fluid path',
  ],
  physicalForm: 'Solid',
  hsTariffCode: '9018.90',
  countryOfOrigin: 'France',
  targetMarkets: marketLabels(['EU', 'UK', 'GCC']),
  requiredCertifications: [
    'CE marking under EU MDR 2017/745 (Class IIb)',
    'EN ISO 13485:2016 — QMS',
    'EN ISO 14971:2019 — risk management',
    'IEC 60601-1 — general electrical safety',
    'IEC 60601-2-24 — particular requirements for infusion pumps',
    'IEC 62304 — medical device software lifecycle',
    'IEC 62366-1 — usability engineering',
  ],
  applicableRegulations: [
    'EU MDR — Regulation (EU) 2017/745',
    'GDPR — Regulation (EU) 2016/679 (therapy log & servicing data)',
    'EU AI Act — Regulation (EU) 2024/1689 (drug-library dose calculation)',
  ],
  industryLabels: ['CE Marking'],
  productionSites: ['Lyon Manufacturing & R&D Centre', 'Sfax Assembly & Packaging Plant'],
  productionProcesses: [
    'Production / Assembly',
    'Electronics / PCBA Assembly',
    'Quality Control',
    'Software Development',
    'Packaging',
  ],
  criticalSuppliers: [
    'Nordcell GmbH (lithium-ion cells)',
    'Rhône PCBA Contract Manufacturing (electronics)',
    'PolySil Medical (silicone pump segments)',
  ],
  productCertifications: [
    {
      standardName: 'CE Certificate — EU MDR 2017/745, Class IIb',
      certifyingBody: 'TÜV SÜD Product Service (Notified Body 0123)',
      certificateNumber: 'G2-24-0148-MDR',
      marketScope: 'European Union / EEA',
      issueDate: '2024-02-15',
      expiryDate: '2029-02-14',
    },
    {
      standardName: 'IEC 60601-1 / 60601-2-24 — Test Report & Certificate',
      certifyingBody: 'TÜV SÜD',
      certificateNumber: 'TR-60601-AF3-2023',
      marketScope: 'EU / UK / GCC',
      issueDate: '2023-11-20',
      expiryDate: '2028-11-19',
    },
  ],
  onboardingStatus: 'COMPLETED',
  currentStep: 6,
};

const OTHER_PRODUCTS: SeedProduct[] = [
  {
    name: 'AlphaFlow 2 Volumetric Infusion Pump',
    reference: 'ALT-AF2-1900',
    sku: 'ALT-AF2-1900',
    description:
      'Second-generation reusable volumetric infusion pump — the predecessor to the AlphaFlow 3. Maintained for the installed base of hospitals still running the AF2 platform.',
    brandName: 'AlphaFlow',
    productFamily: 'AlphaFlow Infusion Platform',
    productType: 'finished',
    productStatus: 'active',
    categoryTags: ['Infusion pump (legacy)'],
    intendedUse:
      'Controlled intravenous administration of fluids and medications to adult and pediatric patients in hospital settings. Delivery range 1–999 mL/h with ±5% flow accuracy. Operated by trained healthcare professionals.',
    targetUsers: ['Medical professionals', 'B2B — Commercial / Distribution (hospital procurement)'],
    keyMaterials: ['Polycarbonate housing', 'Silicone pumping segment', 'NiMH battery pack', 'PCBA / embedded microcontroller'],
    physicalForm: 'Solid',
    hsTariffCode: '9018.90',
    countryOfOrigin: 'France',
    targetMarkets: marketLabels(['EU', 'GCC']),
    requiredCertifications: [
      'CE marking under EU MDR 2017/745 (Class IIb)',
      'EN ISO 13485:2016 — QMS',
      'EN ISO 14971:2019 — risk management',
      'IEC 60601-1 — general electrical safety',
      'IEC 60601-2-24 — infusion pumps',
      'IEC 62304 — medical device software',
    ],
    applicableRegulations: ['EU MDR — Regulation (EU) 2017/745', 'GDPR — Regulation (EU) 2016/679'],
    industryLabels: ['CE Marking'],
    productionSites: ['Lyon Manufacturing & R&D Centre', 'Sfax Assembly & Packaging Plant'],
    productionProcesses: ['Production / Assembly', 'Quality Control', 'Packaging'],
    criticalSuppliers: ['PolySil Medical (silicone pump segments)', 'Rhône PCBA Contract Manufacturing (electronics)'],
    productCertifications: [
      {
        standardName: 'CE Certificate — EU MDR 2017/745, Class IIb',
        certifyingBody: 'TÜV SÜD Product Service (Notified Body 0123)',
        certificateNumber: 'G2-21-0091-MDR',
        marketScope: 'European Union / EEA',
        issueDate: '2021-05-10',
        expiryDate: '2026-05-09',
      },
    ],
    onboardingStatus: 'COMPLETED',
    currentStep: 6,
  },
  {
    name: 'AlphaFlow SD Ambulatory Syringe Driver',
    reference: 'ALT-SD-3100',
    sku: 'ALT-SD-3100',
    description:
      'Compact, battery-powered ambulatory syringe driver for continuous subcutaneous and intravenous medication delivery, including palliative and home-care therapy under clinical supervision.',
    brandName: 'AlphaFlow',
    productFamily: 'AlphaFlow Infusion Platform',
    productType: 'finished',
    productStatus: 'active',
    categoryTags: ['Syringe driver'],
    intendedUse:
      'Continuous, programmable delivery of medication from a syringe to adult and pediatric patients in hospital, clinic and supervised home-care settings. Delivery range 0.1–99 mL/h. Operated by trained healthcare professionals.',
    targetUsers: ['Medical professionals', 'B2B — Commercial / Distribution (hospital procurement)'],
    keyMaterials: ['ABS / polycarbonate housing', 'Stepper-motor drive', 'Rechargeable lithium-ion battery', 'PCBA / embedded microcontroller'],
    physicalForm: 'Solid',
    hsTariffCode: '9018.31',
    countryOfOrigin: 'France',
    targetMarkets: marketLabels(['EU', 'UK']),
    requiredCertifications: [
      'CE marking under EU MDR 2017/745 (Class IIb)',
      'EN ISO 13485:2016 — QMS',
      'EN ISO 14971:2019 — risk management',
      'IEC 60601-1 — general electrical safety',
      'IEC 60601-2-24 — infusion pumps',
      'IEC 62304 — medical device software',
      'IEC 62366-1 — usability engineering',
    ],
    applicableRegulations: ['EU MDR — Regulation (EU) 2017/745', 'UK MDR 2002 (post-Brexit)', 'GDPR — Regulation (EU) 2016/679'],
    industryLabels: ['CE Marking'],
    productionSites: ['Lyon Manufacturing & R&D Centre', 'Sfax Assembly & Packaging Plant'],
    productionProcesses: ['Production / Assembly', 'Electronics / PCBA Assembly', 'Quality Control', 'Software Development', 'Packaging'],
    criticalSuppliers: ['Nordcell GmbH (lithium-ion cells)', 'Rhône PCBA Contract Manufacturing (electronics)'],
    productCertifications: [
      {
        standardName: 'CE Certificate — EU MDR 2017/745, Class IIb',
        certifyingBody: 'TÜV SÜD Product Service (Notified Body 0123)',
        certificateNumber: 'G2-23-0210-MDR',
        marketScope: 'European Union / EEA / United Kingdom',
        issueDate: '2023-03-01',
        expiryDate: '2028-02-29',
      },
    ],
    onboardingStatus: 'COMPLETED',
    currentStep: 6,
  },
  {
    name: 'AlphaLine Standard IV Giving Set (sterile, single-use)',
    reference: 'ALT-GS-0450',
    sku: 'ALT-GS-0450',
    description:
      'Sterile, single-use gravity/pump IV administration set with drip chamber, roller clamp and luer-lock connector. Compatible with the AlphaFlow pump range.',
    brandName: 'AlphaLine',
    productFamily: 'AlphaLine Disposables',
    productType: 'finished',
    productStatus: 'active',
    categoryTags: ['IV administration set'],
    intendedUse:
      'Single-use administration of intravenous fluids and medications to patients under the care of healthcare professionals. Sterile (ethylene-oxide), non-pyrogenic, DEHP-free fluid path.',
    targetUsers: ['Medical professionals', 'B2B — Commercial / Distribution (hospital procurement)'],
    keyMaterials: ['DEHP-free PVC tubing', 'ABS spike & drip chamber', 'Latex-free components', 'Polycarbonate luer-lock connector'],
    physicalForm: 'Solid',
    hsTariffCode: '9018.39',
    countryOfOrigin: 'Tunisia',
    targetMarkets: marketLabels(['EU', 'GCC', 'MAGHREB']),
    requiredCertifications: [
      'CE marking under EU MDR 2017/745 (Class IIa)',
      'EN ISO 13485:2016 — QMS',
      'EN ISO 8536-4 — infusion equipment',
      'EN ISO 11135 — ethylene-oxide sterilization',
      'EN ISO 10993-1 — biological evaluation',
    ],
    applicableRegulations: ['EU MDR — Regulation (EU) 2017/745', 'REACH — Regulation (EU) 1907/2006'],
    industryLabels: ['CE Marking'],
    productionSites: ['Sfax Assembly & Packaging Plant'],
    productionProcesses: ['Extrusion / Moulding', 'Production / Assembly', 'Sterilization', 'Quality Control', 'Packaging'],
    criticalSuppliers: ['PolyMed Tubing (DEHP-free PVC)', 'SteriPack (contract EO sterilization)'],
    productCertifications: [
      {
        standardName: 'CE Certificate — EU MDR 2017/745, Class IIa',
        certifyingBody: 'TÜV SÜD Product Service (Notified Body 0123)',
        certificateNumber: 'G1-24-0332-MDR',
        marketScope: 'European Union / EEA',
        issueDate: '2024-04-18',
        expiryDate: '2029-04-17',
      },
    ],
    onboardingStatus: 'COMPLETED',
    currentStep: 6,
  },
  {
    name: 'AlphaDock Charging & Docking Station',
    reference: 'ALT-DK-0075',
    sku: 'ALT-DK-0075',
    description:
      'Mains-powered multi-bay charging and docking station for the AlphaFlow pump range. Accessory to an active medical device.',
    brandName: 'AlphaFlow',
    productFamily: 'AlphaFlow Accessories',
    productType: 'component',
    productStatus: 'active',
    categoryTags: ['Accessory (electrical)'],
    intendedUse:
      'Charging, storage and data-sync docking for AlphaFlow infusion devices in clinical environments. Accessory intended to be used together with an active medical device.',
    targetUsers: ['Medical professionals', 'B2B — Commercial / Distribution (hospital procurement)'],
    keyMaterials: ['ABS / polycarbonate housing', 'Medical-grade power supply', 'PCBA / charge controller'],
    physicalForm: 'Solid',
    hsTariffCode: '8504.40',
    countryOfOrigin: 'France',
    targetMarkets: marketLabels(['EU']),
    requiredCertifications: [
      'IEC 60601-1 — general electrical safety',
      'IEC 60601-1-2 — electromagnetic compatibility',
      'CE marking (accessory to EU MDR device)',
    ],
    applicableRegulations: [
      'EU MDR — Regulation (EU) 2017/745 (accessory)',
      'RoHS — Directive 2011/65/EU',
      'WEEE — Directive 2012/19/EU',
    ],
    industryLabels: ['CE Marking'],
    productionSites: ['Lyon Manufacturing & R&D Centre'],
    productionProcesses: ['Electronics / PCBA Assembly', 'Production / Assembly', 'Quality Control'],
    criticalSuppliers: ['Rhône PCBA Contract Manufacturing (electronics)'],
    productCertifications: [],
    onboardingStatus: 'COMPLETED',
    currentStep: 6,
  },
  {
    name: 'AF3 Control-Board Assembly (PCBA)',
    reference: 'ALT-PCB-2201',
    sku: 'ALT-PCB-2201',
    description:
      'Populated printed-circuit-board assembly (main control board) for the AlphaFlow 3 pump. Internal electronic component / sub-assembly.',
    brandName: 'AlphaFlow',
    productFamily: 'AlphaFlow Components',
    productType: 'component',
    productStatus: 'active',
    categoryTags: ['Electronic component'],
    intendedUse:
      'Embedded control, motor drive and alarm handling for the AlphaFlow 3 infusion pump. Not placed on the market as a standalone device — integrated into a finished medical device.',
    targetUsers: ['B2B — OEM / Internal manufacturing'],
    keyMaterials: ['FR-4 printed circuit board', 'Embedded microcontroller', 'Passive & active SMD components', 'Lead-free solder'],
    physicalForm: 'Solid',
    hsTariffCode: '8534.00',
    countryOfOrigin: 'France',
    targetMarkets: marketLabels(['EU']),
    requiredCertifications: [
      'IPC-A-610 — acceptability of electronic assemblies',
      'IEC 62304 — medical device software (as integrated)',
    ],
    applicableRegulations: ['RoHS — Directive 2011/65/EU', 'REACH — Regulation (EU) 1907/2006'],
    industryLabels: [],
    productionSites: ['Lyon Manufacturing & R&D Centre'],
    productionProcesses: ['Electronics / PCBA Assembly', 'Quality Control'],
    criticalSuppliers: ['Rhône PCBA Contract Manufacturing (electronics)'],
    productCertifications: [],
    onboardingStatus: 'COMPLETED',
    currentStep: 6,
  },
  {
    name: 'AF3 Li-Ion Battery Pack (replacement)',
    reference: 'ALT-BAT-2202',
    sku: 'ALT-BAT-2202',
    description:
      'Rechargeable lithium-ion battery pack (replacement spare) for the AlphaFlow 3 pump, with integrated battery-management system.',
    brandName: 'AlphaFlow',
    productFamily: 'AlphaFlow Components',
    productType: 'raw_material',
    productStatus: 'active',
    categoryTags: ['Spare part'],
    intendedUse:
      'Field-replaceable power source for the AlphaFlow 3 infusion pump, providing ≥ 6 h runtime. Replaced by trained service technicians.',
    targetUsers: ['Medical professionals', 'B2B — OEM / Internal manufacturing'],
    keyMaterials: ['Lithium-ion cells', 'Battery-management PCBA', 'Polycarbonate enclosure'],
    physicalForm: 'Solid',
    hsTariffCode: '8507.60',
    countryOfOrigin: 'France',
    targetMarkets: marketLabels(['EU']),
    requiredCertifications: [
      'IEC 62133-2 — secondary lithium cell/battery safety',
      'UN 38.3 — lithium battery transport testing',
    ],
    applicableRegulations: [
      'EU Batteries Regulation (EU) 2023/1542',
      'REACH — Regulation (EU) 1907/2006',
      'RoHS — Directive 2011/65/EU',
    ],
    industryLabels: [],
    productionSites: ['Lyon Manufacturing & R&D Centre'],
    productionProcesses: ['Production / Assembly', 'Quality Control'],
    criticalSuppliers: ['Nordcell GmbH (lithium-ion cells)'],
    productCertifications: [],
    onboardingStatus: 'COMPLETED',
    currentStep: 6,
  },
];

// ── Flagship document folder (./seed-data/AlphaFlow3) → category ───────────
const DOC_CATEGORY: Record<string, string> = {
  'AlphaFlow 3 — Technical Documentation (MDR Annex II).docx': 'Technical File',
  'Risk Management File (ISO 14971).docx': 'Technical File',
  'CE Certificate — MDR Class IIb (TUV SUD).docx': 'Certificate',
  'Electrical Safety Test Report (IEC 60601-1 & -2-24).docx': 'Test Report',
  'Software V&V Report (IEC 62304).docx': 'Test Report',
  'Instructions for Use (IFU) v3.2.docx': 'Specification',
  'EU Declaration of Conformity.docx': 'Certificate',
  'Post-Market Surveillance Plan.docx': 'Quality Plan',
  'Product Specification - Datasheet.docx': 'Specification',
};
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function storageKey(companyId: string, productName: string, filename: string): string {
  const safe = productName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
  return `${companyId}/products/${safe}/${DocumentType.PRODUCT_DOC}/${Date.now()}-${filename}`;
}

const ds = new DataSource({
  type: 'postgres',
  host: DB_HOST,
  port: DB_PORT,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  entities: [Document, DocumentVersion, Product, FileFolder, DocumentAccessRule, DocumentAuditEvent],
  // Tables are already created by the services (auth + document) — no DDL from the seed.
  synchronize: false,
});

// Demo tenant login (created if it doesn't exist so `up` fills the DB end-to-end).
const DEMO_EMAIL = 'director@althea-medtech.demo';
const DEMO_PASSWORD = 'Demo@2024!';
// bcrypt hash of DEMO_PASSWORD (cost 12).
const DEMO_PASSWORD_HASH = '$2b$12$LaZUvntrbaibXuq98rlF.eGaaHSBCWjgnsnPvRxtSpNE/FPpWZ0z2';

async function seed() {
  console.log(`→ Postgres ${DB_HOST}:${DB_PORT} · MinIO ${MINIO_ENDPOINT}:${MINIO_PORT}`);
  await ds.initialize();

  // Resolve the target tenant + an uploader user (from the shared auth tables).
  let companyId: string = process.env.SEED_COMPANY_ID || '';
  if (!companyId) {
    // Prefer the demo tenant; create it if missing so `up` fills the DB with a working login.
    const existing = await ds.query('SELECT id FROM companies WHERE email = $1 LIMIT 1', [DEMO_EMAIL]);
    if (existing[0]) {
      companyId = existing[0].id;
      console.log(`= demo company exists (${DEMO_EMAIL})`);
    } else {
      const inserted = await ds.query(
        `INSERT INTO companies
           (name, company_code, field, email, phone, description, capacity, password_hash, status, is_email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', true)
         RETURNING id`,
        [
          'Althea Medical Devices S.A.S.',
          'QURALTH1',
          'Medical Devices',
          DEMO_EMAIL,
          '+33 4 00 00 00 00',
          'Demo tenant — AlphaFlow medical devices (seeded)',
          '184',
          DEMO_PASSWORD_HASH,
        ],
      );
      companyId = inserted[0].id;
      console.log(`+ demo company created — login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
    }
  }
  // Prefer a real member of the tenant; otherwise attribute to the company (director) principal.
  const uploaderRow = (
    await ds.query('SELECT id FROM users WHERE company_id = $1 ORDER BY created_at ASC LIMIT 1', [companyId])
  )[0];
  const uploadedBy: string = uploaderRow?.id || companyId;
  console.log(`→ Tenant ${companyId} · uploader ${uploadedBy}`);

  const productRepo = ds.getRepository(Product);
  const docRepo = ds.getRepository(Document);

  // ── Products (idempotent by companyId + name) ────────────────────────────
  const all: SeedProduct[] = [FLAGSHIP, ...OTHER_PRODUCTS];
  let flagshipId = '';
  for (const p of all) {
    const existing = await productRepo.findOne({ where: { companyId, name: p.name } });
    let product: Product;
    if (existing) {
      // Upsert: refresh the full profile so re-running enriches older minimal rows.
      product = await productRepo.save(productRepo.merge(existing, { ...p, companyId }));
      console.log(`~ product updated: ${p.name}`);
    } else {
      product = await productRepo.save(productRepo.create({ ...p, companyId }));
      console.log(`+ product created: ${p.name}`);
    }
    if (p === FLAGSHIP) flagshipId = product.id;
  }

  // ── Flagship documents (idempotent: skip if it already has docs) ─────────
  const existingDocs = await docRepo.count({ where: { productId: flagshipId } });
  if (existingDocs > 0) {
    console.log(`= flagship already has ${existingDocs} document(s) — skipping upload`);
  } else {
    const minio = new Minio.Client({
      endPoint: MINIO_ENDPOINT,
      port: MINIO_PORT,
      useSSL: (process.env.MINIO_USE_SSL || 'false') === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY,
    });
    if (!(await minio.bucketExists(MINIO_BUCKET))) {
      await minio.makeBucket(MINIO_BUCKET, 'us-east-1');
    }

    const dir = path.join(__dirname, 'seed-data', 'AlphaFlow3');
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.docx')) : [];
    let count = 0;
    for (const filename of files) {
      const category = DOC_CATEGORY[filename];
      if (!category) {
        console.log(`  · skipped (not a product doc): ${filename}`);
        continue; // e.g. the blocked "EN ISO 13485" standard sample
      }
      const buffer = fs.readFileSync(path.join(dir, filename));
      const key = storageKey(companyId, FLAGSHIP.name, filename);
      await minio.putObject(MINIO_BUCKET, key, buffer, buffer.length, { 'Content-Type': DOCX_MIME });
      await docRepo.save(
        docRepo.create({
          name: filename,
          mimeType: DOCX_MIME,
          sizeBytes: buffer.length,
          type: DocumentType.PRODUCT_DOC,
          status: DocumentStatus.READY,
          approvalStatus: DocumentApprovalStatus.APPROVED,
          storageKey: key,
          companyId,
          productId: flagshipId,
          uploadedBy,
          version: 1,
          tags: [category],
        }),
      );
      count++;
      console.log(`  + document: ${filename} [${category}]`);
    }
    console.log(`✓ ${count} document(s) attached to ${FLAGSHIP.name}`);
  }

  await ds.destroy();
  console.log('✅ Seed complete');
}

seed().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
