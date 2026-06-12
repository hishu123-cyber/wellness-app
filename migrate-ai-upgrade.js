/**
 * 数据库迁移脚本 - AI辨体+用户画像+节气打卡
 * 运行: node migrate-ai-upgrade.js
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database', 'wellness.db');

async function migrate() {
  console.log('🔄 开始AI升级数据库迁移...');
  
  const SQL = await initSqlJs();
  
  let db;
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    console.log('✅ 已加载现有数据库');
  } else {
    db = new SQL.Database();
    console.log('✅ 创建新数据库');
  }

  // 添加 task_checkins 表
  db.run(`
    CREATE TABLE IF NOT EXISTS task_checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      task_id TEXT NOT NULL,
      checkin_date TEXT NOT NULL,
      points_earned INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, task_id, checkin_date)
    )
  `);
  console.log('✅ task_checkins 表已创建');

  // 添加 ai_assessment_records 表
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_assessment_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      assessment_type TEXT NOT NULL DEFAULT 'comprehensive',
      primary_type TEXT,
      secondary_type TEXT,
      confidence REAL DEFAULT 0,
      detail TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  console.log('✅ ai_assessment_records 表已创建');

  // 给 users 表添加 points 字段（如果不存在）
  try {
    const cols = [];
    const stmt = db.prepare("PRAGMA table_info(users)");
    while (stmt.step()) {
      cols.push(stmt.getAsObject().name);
    }
    stmt.free();
    
    if (cols.indexOf('points') === -1) {
      db.run('ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0');
      console.log('✅ users.points 字段已添加');
    } else {
      console.log('⏭️ users.points 字段已存在，跳过');
    }
  } catch(e) {
    console.log('⚠️ 添加 points 字段:', e.message);
  }

  // 保存数据库
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  console.log('💾 数据库已保存');

  // 验证
  const tables = [];
  const tStmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  while (tStmt.step()) {
    tables.push(tStmt.getAsObject().name);
  }
  tStmt.free();
  console.log('\n📊 当前表数量:', tables.length);
  console.log('📋 新增表: task_checkins, ai_assessment_records');
  
  db.close();
  console.log('\n🎉 AI升级迁移完成！');
}

migrate().catch(function(e) {
  console.error('❌ 迁移失败:', e);
  process.exit(1);
});
