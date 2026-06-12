const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(__dirname, 'backend', 'data', 'wellness.db');

console.log('DB_PATH:', DB_PATH);
console.log('File exists:', fs.existsSync(DB_PATH));
console.log('File size:', fs.statSync(DB_PATH).size);

let db;

function queryOne(sql, params) {
  if (!params) params = [];
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

async function test() {
  const SQL = await initSqlJs();
  const buf = fs.readFileSync(DB_PATH);
  console.log('Buffer size:', buf.length);

  db = new SQL.Database(buf);
  console.log('DB created');

  // Check tables
  const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table'");
  const tables = [];
  while (stmt.step()) {
    tables.push(stmt.getAsObject().name);
  }
  stmt.free();
  console.log('Tables:', tables.join(', '));

  // Try query
  try {
    const user = queryOne('SELECT * FROM users WHERE username = ?', ['demo']);
    console.log('User:', user);
  } catch (e) {
    console.error('Query error:', e.message);
  }
}

test();
