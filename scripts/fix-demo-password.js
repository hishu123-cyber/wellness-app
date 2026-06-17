const crypto = require('crypto');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, '..', 'backend', 'data', 'wellness.db');
  const buf = fs.readFileSync(dbPath);
  const db = new SQL.Database(buf);

  const newSecret = 'ICMvGJjRnKpN71z8bSfXkHP4Ftm3Q6VWDYExsyOe5L2qUhol';

  // Fix demo user
  const demoHash = crypto.createHash('sha256').update('123456' + newSecret).digest('hex');
  db.run('UPDATE users SET hashed_password = ? WHERE username = ?', [demoHash, 'demo']);
  console.log('demo/123456 password FIXED');

  // Fix admin user
  const adminHash = crypto.createHash('sha256').update('admin888' + newSecret).digest('hex');
  db.run('UPDATE users SET hashed_password = ? WHERE username = ?', [adminHash, 'admin']);
  console.log('admin/admin888 password FIXED');

  // Fix test user if exists
  const testResult = db.exec('SELECT id FROM users WHERE username = "test"');
  if (testResult.length > 0 && testResult[0].values.length > 0) {
    const testHash = crypto.createHash('sha256').update('test123' + newSecret).digest('hex');
    db.run('UPDATE users SET hashed_password = ? WHERE username = ?', [testHash, 'test']);
    console.log('test/test123 password FIXED');
  }

  // Save
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  console.log('Database saved successfully');
}

main().catch(e => console.error('ERROR:', e.message));
