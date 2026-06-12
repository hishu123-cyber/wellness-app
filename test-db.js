const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(__dirname, 'backend', 'data', 'wellness.db');

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
  db = new SQL.Database(buf);
  console.log('DB loaded, size:', buf.length);

  // Test query
  const user = queryOne('SELECT * FROM users WHERE username = ?', ['demo']);
  console.log('User found:', user ? user.username : 'not found');
}

test().catch(e => console.error(e));
