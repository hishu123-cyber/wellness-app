const fs = require('fs');
const initSqlJs = require('sql.js');

async function check() {
  try {
    const SQL = await initSqlJs();
    const buf = fs.readFileSync('./backend/data/wellness.db');
    const db = new SQL.Database(buf);
    const result = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
    if (result.length > 0) {
      console.log('Tables:', result[0].values.map(v => v[0]).join(', '));
    } else {
      console.log('No tables found');
    }
    db.close();
  } catch (e) {
    console.error('Error:', e.message);
  }
}

check();
