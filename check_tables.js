const init = require('sql.js');
const fs = require('fs');
const dbPath = 'C:\\Users\\程云\\.qclaw\\workspace\\食术养生项目源码包\\database\\wellness.db';
const buf = fs.readFileSync(dbPath);
init().then(async SQL => {
  const db = new SQL.Database(buf);
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
  console.log('=== Tables ===');
  tables[0].values.forEach(t => console.log(t[0]));
  try {
    const ub = db.exec('PRAGMA table_info(user_badges)');
    console.log('\n=== user_badges ===');
    ub[0].values.forEach(c => console.log(c[1], c[2]));
  } catch(e) { console.log('user_badges: NOT FOUND'); }
  try {
    const tb = db.exec('PRAGMA table_info(tea_badges)');
    console.log('\n=== tea_badges ===');
    tb[0].values.forEach(c => console.log(c[1], c[2]));
  } catch(e) { console.log('tea_badges: NOT FOUND'); }
  db.close();
});
