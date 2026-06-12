const init = require('sql.js');
const fs = require('fs');
const dbPath = 'C:\\Users\\程云\\.qclaw\\workspace\\食术养生项目源码包\\database\\wellness.db';
const buf = fs.readFileSync(dbPath);
init().then(async SQL => {
  const db = new SQL.Database(buf);
  const badges = db.exec('SELECT * FROM tea_badges');
  console.log('tea_badges count:', badges[0] ? badges[0].values.length : 0);
  if (badges[0]) badges[0].values.forEach((v,i) => console.log(i, v));
  
  const earned = db.exec('SELECT badge_id FROM user_badges WHERE user_id = 1');
  console.log('\nuser_badges for user 1:', earned[0] ? earned[0].values.length : 0);
  
  db.close();
});
