/**
 * Migration: Add provider onboarding tables to existing database
 * Run: node migrate-onboarding.js
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database', 'wellness.db');

async function migrate() {
  const SQL = await initSqlJs();
  const buf = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buf);

  const tables = [
    `CREATE TABLE IF NOT EXISTS provider_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_type TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      gender TEXT,
      birthday TEXT,
      service_areas TEXT,
      specialty TEXT,
      introduction TEXT,
      experience_years INTEGER DEFAULT 0,
      avatar TEXT,
      cert_type TEXT,
      cert_number TEXT,
      cert_photo_front TEXT,
      cert_photo_back TEXT,
      id_card_front TEXT,
      id_card_back TEXT,
      medical_cert_type TEXT,
      medical_cert_number TEXT,
      practice_cert_number TEXT,
      practice_scope TEXT,
      practice_org TEXT,
      practice_org_proof TEXT,
      title_rank TEXT,
      multi_site_registered INTEGER DEFAULT 0,
      multi_site_proof TEXT,
      ocr_name TEXT,
      ocr_id_number TEXT,
      ocr_cert_info TEXT,
      ocr_verified INTEGER DEFAULT 0,
      real_name_verified INTEGER DEFAULT 0,
      face_verified INTEGER DEFAULT 0,
      face_verify_time TEXT,
      price_online REAL,
      price_visit REAL,
      price_video REAL,
      schedule TEXT,
      ai_review_result TEXT,
      ai_review_time TEXT,
      manual_reviewer_id INTEGER,
      manual_review_note TEXT,
      manual_review_time TEXT,
      interview_score REAL,
      interview_note TEXT,
      interview_time TEXT,
      reject_reason TEXT,
      probation_start TEXT,
      probation_end TEXT,
      probation_orders INTEGER DEFAULT 0,
      probation_avg_rating REAL DEFAULT 0,
      probation_passed INTEGER DEFAULT 0,
      agreement_signed INTEGER DEFAULT 0,
      agreement_signed_time TEXT,
      agreement_version TEXT,
      user_id INTEGER,
      provider_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS provider_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      operator_id INTEGER,
      operator_type TEXT DEFAULT 'system',
      note TEXT,
      extra_data TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS service_checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      provider_type TEXT NOT NULL,
      provider_id INTEGER NOT NULL,
      checkin_type TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      photo_url TEXT,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS provider_complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_type TEXT NOT NULL,
      provider_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      booking_id INTEGER,
      complaint_type TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      severity TEXT DEFAULT 'normal',
      admin_note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT
    )`,

    `CREATE TABLE IF NOT EXISTS provider_education (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_type TEXT NOT NULL,
      provider_id INTEGER NOT NULL,
      course_name TEXT NOT NULL,
      course_type TEXT NOT NULL,
      hours REAL NOT NULL,
      certificate_url TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS provider_renewals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_type TEXT NOT NULL,
      provider_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      education_hours REAL DEFAULT 0,
      min_education_hours REAL DEFAULT 15,
      complaint_count INTEGER DEFAULT 0,
      avg_rating REAL DEFAULT 5.0,
      renewal_status TEXT DEFAULT 'pending',
      reviewed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`
  ];

  for (const sql of tables) {
    db.run(sql);
  }

  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  console.log('✅ Migration complete - 6 new tables added to provider_onboarding system');

  // Verify
  const result = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log('All tables:', result[0].values.flat().join(', '));
}

migrate().catch(e => {
  console.error('❌ Migration error:', e.message);
  process.exit(1);
});
