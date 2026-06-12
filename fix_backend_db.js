const init = require('sql.js');
const fs = require('fs');
const dbPath = 'C:\\Users\\程云\\.qclaw\\workspace\\食术养生项目源码包\\backend\\data\\wellness.db';
const buf = fs.readFileSync(dbPath);
init().then(async SQL => {
  const db = new SQL.Database(buf);
  
  // Check current tables
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
  console.log('Tables count:', tables[0].values.length);
  
  // Check if user_badges exists
  try {
    db.exec('SELECT 1 FROM user_badges LIMIT 1');
    console.log('user_badges: already exists');
  } catch(e) {
    console.log('user_badges: creating...');
    db.run(`CREATE TABLE user_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      badge_id INTEGER NOT NULL,
      earned_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('user_badges: created');
  }
  
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  db.close();
  console.log('Done. New size:', fs.statSync(dbPath).size);
});
