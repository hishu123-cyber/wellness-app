const init = require('sql.js');
const fs = require('fs');
const dbPath = 'C:\\Users\\程云\\.qclaw\\workspace\\食术养生项目源码包\\database\\wellness.db';
const buf = fs.readFileSync(dbPath);
init().then(async SQL => {
  const db = new SQL.Database(buf);
  db.run(`CREATE TABLE IF NOT EXISTS user_badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    badge_type TEXT NOT NULL DEFAULT '',
    badge_name TEXT NOT NULL DEFAULT '',
    icon TEXT DEFAULT '🏅',
    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  db.close();
  console.log('user_badges table created OK');
});
