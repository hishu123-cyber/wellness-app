/**
 * 数据库适配层 - 支持 Turso (libsql) 和 sql.js
 * Vercel Serverless 环境下，优先使用 Turso 云数据库
 * 开发环境可使用 sql.js 内存模式
 * 
 * 注意：为兼容现有服务模块，提供同步和异步两套 API
 */

let db = null;
let dbType = 'none';
let SQL = null;

// 检测环境
const hasTurso = process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN;

// =============================================
// 异步初始化
// =============================================

/**
 * 初始化数据库连接
 */
async function initDatabase() {
  if (db) return db;

  if (hasTurso) {
    // Turso 云数据库（生产环境推荐）
    try {
      const { createClient } = require('@libsql/client');
      db = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      });
      dbType = 'turso';
      console.log('[DB] 已连接 Turso 云数据库');
      return db;
    } catch (e) {
      console.error('[DB] Turso 连接失败:', e.message);
    }
  }

  // Fallback: sql.js 内存数据库
  try {
    const initSqlJs = require('sql.js');
    SQL = await initSqlJs();
    db = new SQL.Database();
    dbType = 'memory';
    console.log('[DB] 使用内存 SQLite（数据不会持久化）');
    
    // 初始化表结构
    await initTables();
    return db;
  } catch (e) {
    console.error('[DB] sql.js 初始化失败:', e.message);
    throw new Error('数据库初始化失败');
  }
}

/**
 * 获取数据库实例
 */
function getDb() {
  return db;
}

/**
 * 获取数据库类型
 */
function getDbType() {
  return dbType;
}

// =============================================
// 同步 API（兼容 sql.js，用于服务模块）
// =============================================

/**
 * 同步查询所有结果
 */
function queryAll(sql, params = []) {
  if (!db) throw new Error('数据库未初始化');
  if (dbType === 'turso') {
    // Turso 不支持同步，抛出错误提示
    throw new Error('Turso 数据库不支持同步 API，请使用 queryAllAsync');
  }
  // sql.js 同步 API
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

/**
 * 同步查询单条结果
 */
function queryOne(sql, params = []) {
  if (!db) throw new Error('数据库未初始化');
  if (dbType === 'turso') {
    throw new Error('Turso 数据库不支持同步 API，请使用 queryOneAsync');
  }
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

/**
 * 同步执行 SQL
 */
function queryRun(sql, params = []) {
  if (!db) throw new Error('数据库未初始化');
  if (dbType === 'turso') {
    throw new Error('Turso 数据库不支持同步 API，请使用 queryRunAsync');
  }
  db.run(sql, params);
}

/**
 * 同步保存数据库
 */
function saveDb() {
  // sql.js 内存数据库无法持久化
  // Turso 自动持久化
}

// =============================================
// 异步 API（用于 Vercel Serverless）
// =============================================

/**
 * 异步查询所有结果
 */
async function queryAllAsync(sql, params = []) {
  if (!db) throw new Error('数据库未初始化');

  if (dbType === 'turso') {
    const result = await db.execute({ sql, args: params });
    return result.rows.map(row => {
      const obj = {};
      result.columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });
  } else {
    // sql.js 同步调用包装
    return queryAll(sql, params);
  }
}

/**
 * 异步查询单条结果
 */
async function queryOneAsync(sql, params = []) {
  if (!db) throw new Error('数据库未初始化');

  if (dbType === 'turso') {
    const result = await db.execute({ sql, args: params });
    if (result.rows.length === 0) return null;
    const obj = {};
    result.columns.forEach((col, i) => {
      obj[col] = result.rows[0][i];
    });
    return obj;
  } else {
    return queryOne(sql, params);
  }
}

/**
 * 异步执行 SQL
 */
async function queryRunAsync(sql, params = []) {
  if (!db) throw new Error('数据库未初始化');

  if (dbType === 'turso') {
    const result = await db.execute({ sql, args: params });
    return {
      changes: result.rowsAffected,
      lastInsertRowid: result.lastInsertRowid,
    };
  } else {
    db.run(sql, params);
    return { changes: db.getRowsModified(), lastInsertRowid: null };
  }
}

/**
 * 异步批量执行 SQL
 */
async function queryBatchAsync(statements) {
  if (!db) throw new Error('数据库未初始化');

  if (dbType === 'turso') {
    const batch = statements.map(sql => ({ sql }));
    await db.batch(batch);
  } else {
    for (const sql of statements) {
      db.run(sql);
    }
  }
}

/**
 * 异步保存数据库
 */
async function saveDbAsync() {
  // Turso 自动持久化
  // sql.js 内存数据库无法持久化
}

// =============================================
// 表结构初始化
// =============================================

async function initTables() {
  if (!db || dbType !== 'memory') return;

  const statements = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      hashed_password TEXT NOT NULL,
      nickname TEXT,
      avatar TEXT,
      phone TEXT,
      gender TEXT,
      birth_year INTEGER,
      height_cm REAL,
      weight_kg REAL,
      constitution TEXT,
      role TEXT DEFAULT 'user',
      is_vip INTEGER DEFAULT 0,
      vip_expires TEXT,
      vip_orders INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS constitution_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_text TEXT NOT NULL,
      category TEXT NOT NULL,
      weight REAL DEFAULT 1.0
    );

    CREATE TABLE IF NOT EXISTS constitution_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      scores TEXT,
      result_type TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS health_diaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      record_date TEXT NOT NULL,
      sleep_hours REAL,
      exercise_minutes INTEGER,
      exercise_type TEXT,
      meal_count INTEGER,
      water_glasses INTEGER,
      diet_note TEXT,
      mood_score INTEGER,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      ingredients TEXT,
      steps TEXT,
      benefits TEXT,
      suitable_constitution TEXT,
      suitable_season TEXT,
      image_url TEXT
    );

    CREATE TABLE IF NOT EXISTS solar_terms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date_mmdd TEXT,
      description TEXT,
      wellness_tips TEXT,
      food_recommendations TEXT,
      exercise_advice TEXT
    );

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      summary TEXT,
      content TEXT,
      category TEXT,
      tags TEXT,
      author TEXT,
      cover_image TEXT,
      view_count INTEGER DEFAULT 0,
      is_published INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS points_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      points INTEGER NOT NULL,
      action TEXT,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      checkin_date TEXT NOT NULL,
      consecutive_days INTEGER DEFAULT 1,
      points_earned INTEGER DEFAULT 5,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pay_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      out_trade_no TEXT UNIQUE NOT NULL,
      plan_id TEXT,
      amount INTEGER,
      status TEXT DEFAULT 'pending',
      paid_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS plan_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      plan_type TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      price REAL,
      purchased_at TEXT
    );

    CREATE TABLE IF NOT EXISTS tea_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      description TEXT,
      constitution TEXT,
      season TEXT,
      benefits TEXT,
      brewing_method TEXT,
      price REAL
    );

    CREATE TABLE IF NOT EXISTS tea_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      tea_id INTEGER,
      tea_name TEXT,
      score INTEGER DEFAULT 0,
      feeling TEXT,
      completed INTEGER DEFAULT 0,
      time_slot TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tea_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT,
      description TEXT,
      condition_type TEXT,
      condition_value INTEGER
    );

    CREATE TABLE IF NOT EXISTS user_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      badge_id INTEGER NOT NULL,
      earned_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tea_time_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      start_hour INTEGER,
      end_hour INTEGER,
      tea_type TEXT,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS tea_daily_tips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      tea_type TEXT
    );

    CREATE TABLE IF NOT EXISTS shop_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      description TEXT,
      price REAL,
      image_url TEXT,
      tags TEXT,
      sales_count INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS shop_cart (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shop_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      order_no TEXT UNIQUE NOT NULL,
      total_amount REAL,
      consignee TEXT,
      phone TEXT,
      address TEXT,
      remark TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shop_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT,
      price REAL,
      quantity INTEGER
    );

    CREATE TABLE IF NOT EXISTS chef_services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      title TEXT,
      avatar TEXT,
      score REAL DEFAULT 5.0,
      order_count INTEGER DEFAULT 0,
      price REAL,
      specialty TEXT,
      suitable_constitution TEXT,
      introduction TEXT,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS chef_bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      chef_id INTEGER NOT NULL,
      service_date TEXT,
      service_time TEXT,
      address TEXT,
      phone TEXT,
      note TEXT,
      menu_requirements TEXT,
      total_amount REAL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tcm_doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      title TEXT,
      hospital TEXT,
      specialty TEXT,
      introduction TEXT,
      avatar TEXT,
      rating REAL DEFAULT 5.0,
      consultation_count INTEGER DEFAULT 0,
      price_online REAL DEFAULT 99,
      price_video REAL DEFAULT 199,
      available INTEGER DEFAULT 1,
      certification TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tcm_consultations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      type TEXT DEFAULT 'text',
      status TEXT DEFAULT 'pending',
      symptoms TEXT,
      constitution TEXT,
      price REAL DEFAULT 0,
      doctor_notes TEXT,
      prescription_id INTEGER,
      rating INTEGER,
      review TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      accepted_at TEXT,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS tcm_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      consultation_id INTEGER NOT NULL,
      sender_type TEXT NOT NULL,
      sender_id INTEGER,
      content TEXT NOT NULL,
      msg_type TEXT DEFAULT 'text',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tcm_prescriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      consultation_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      diagnosis TEXT,
      prescription_text TEXT,
      decoction_method TEXT,
      dosage TEXT,
      precautions TEXT,
      days INTEGER DEFAULT 7,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS nutritionists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      title TEXT,
      avatar TEXT,
      hospital TEXT,
      specialty TEXT,
      introduction TEXT,
      rating REAL DEFAULT 5.0,
      service_count INTEGER DEFAULT 0,
      price REAL DEFAULT 199,
      available INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS nutritionist_bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      nutritionist_id INTEGER NOT NULL,
      service_date TEXT,
      service_time TEXT,
      address TEXT,
      phone TEXT,
      note TEXT,
      menu_requirements TEXT,
      total_amount REAL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS provider_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      provider_type TEXT NOT NULL,
      name TEXT NOT NULL,
      title TEXT,
      hospital TEXT,
      specialty TEXT,
      introduction TEXT,
      phone TEXT,
      email TEXT,
      license_url TEXT,
      certification TEXT,
      status TEXT DEFAULT 'pending',
      review_note TEXT,
      reviewed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS seasonal_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      solar_term TEXT NOT NULL,
      task_type TEXT,
      title TEXT NOT NULL,
      description TEXT,
      points INTEGER DEFAULT 10,
      icon TEXT
    );

    CREATE TABLE IF NOT EXISTS user_task_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      task_id INTEGER NOT NULL,
      completed_at TEXT DEFAULT (datetime('now'))
    );
  `;

  // 分割并执行每条语句
  const sqls = statements.split(';').filter(s => s.trim());
  for (const sql of sqls) {
    if (sql.trim()) {
      try {
        db.run(sql);
      } catch (e) {
        // 忽略已存在错误
      }
    }
  }

  console.log('[DB] 表结构初始化完成');
}

// =============================================
// 导出
// =============================================

module.exports = {
  // 初始化
  initDatabase,
  getDb,
  getDbType,
  
  // 同步 API（兼容现有服务模块）
  queryAll,
  queryOne,
  queryRun,
  saveDb,
  
  // 异步 API（用于 Vercel）
  queryAllAsync,
  queryOneAsync,
  queryRunAsync,
  queryBatchAsync,
  saveDbAsync,
};
