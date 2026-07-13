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
  { name: 'AlphaFlow 2 Volumetric Infusion Pump', reference: 'ALT-AF2-1900', sku: 'ALT-AF2-1900', categoryTags: ['Infusion pump (legacy)'], productType: 'finished', targetMarkets: marketLabels(['EU', 'GCC']) },
  { name: 'AlphaFlow SD Ambulatory Syringe Driver', reference: 'ALT-SD-3100', sku: 'ALT-SD-3100', categoryTags: ['Syringe driver'], productType: 'finished', targetMarkets: marketLabels(['EU', 'UK']) },
  { name: 'AlphaLine Standard IV Giving Set (sterile, single-use)', reference: 'ALT-GS-0450', sku: 'ALT-GS-0450', categoryTags: ['IV administration set'], productType: 'finished', targetMarkets: marketLabels(['EU', 'GCC', 'MAGHREB']) },
  { name: 'AlphaDock Charging & Docking Station', reference: 'ALT-DK-0075', sku: 'ALT-DK-0075', categoryTags: ['Accessory (electrical)'], productType: 'component', targetMarkets: marketLabels(['EU']) },
  { name: 'AF3 Control-Board Assembly (PCBA)', reference: 'ALT-PCB-2201', sku: 'ALT-PCB-2201', categoryTags: ['Electronic component'], productType: 'component', targetMarkets: marketLabels(['EU']) },
  { name: 'AF3 Li-Ion Battery Pack (replacement)', reference: 'ALT-BAT-2202', sku: 'ALT-BAT-2202', categoryTags: ['Spare part'], productType: 'raw_material', targetMarkets: marketLabels(['EU']) },
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
    let product = await productRepo.findOne({ where: { companyId, name: p.name } });
    if (product) {
      console.log(`= product exists: ${p.name}`);
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
