/**
 * Wellness App — Backend API Server
 * Node.js + Express 5 + sql.js
 *
 * Run: node server.js
 * API: http://localhost:8000
 */

// 日志模块（必须第一个引入）
const log = require('./lib/logger');
const LOG_DIR = log.getLogDir();

// Global crash diagnostics
process.on('uncaughtException', function(e) {
  try { require('fs').appendFileSync(path.join(LOG_DIR, 'crash.log'), new Date().toISOString() + ' ' + (e.stack || e.message) + '\n'); } catch(_) {}
  if (e.code === 'EPIPE') { process.exit(0); return; }
  process.exit(1);
});
process.on('unhandledRejection', function(e) {
  try { require('fs').appendFileSync(path.join(LOG_DIR, 'crash.log'), new Date().toISOString() + ' REJECTION: ' + (e.stack || e.message) + '\n'); } catch(_) {}
});

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const pay = require('./pay');

const DB_PATH = path.join(__dirname, 'backend', 'data', 'wellness.db');
const SECRET = process.env.WELLNESS_SECRET || (() => {
  // 开发环境默认密钥 - 生产环境请在环境变量设置 WELLNESS_SECRET
  const d = 'wellness-secret-key';
  if (process.env.NODE_ENV !== 'production') return d;
  log.error('WELLNESS_SECRET 环境变量未设置！生产环境必须设置此变量');
  log.error('请运行: export WELLNESS_SECRET="your-secret-key" 或配置在 PM2 ecosystem.config.js 中');
  process.exit(1);
})();
const PORT = process.env.PORT || 8000;
let db;

function queryAll(sql, params) {
  if (!params) params = [];
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}
function queryOne(sql, params) {
  if (!params) params = [];
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}
function queryRun(sql, params) {
  if (!params) params = [];
  db.run(sql, params);
}
function saveDb() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function hashPw(pw) { return crypto.createHash('sha256').update(pw + SECRET).digest('hex'); }
function makeToken(uid) {
  var p = JSON.stringify({ sub: uid, exp: Date.now() + 7*86400000 });
  return Buffer.from(p).toString('base64') + '.' + crypto.createHash('sha256').update(p + SECRET).digest('hex').slice(0,16);
}
function verifyToken(tok) {
  try {
    var parts = tok.split('.');
    var p = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    if (crypto.createHash('sha256').update(JSON.stringify(p) + SECRET).digest('hex').slice(0,16) !== parts[1] || p.exp < Date.now()) return null;
    return p.sub;
  } catch(e) { return null; }
}
function auth(req, res, next) {
  var h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return res.status(401).json({ detail: 'Unauthorized' });
  req.userId = verifyToken(h.slice(7));
  if (!req.userId) return res.status(401).json({ detail: 'Unauthorized' });
  next();
}
// demo 用户不能访问敏感接口（支付、VIP购买、订单、方案购买）
function requireRealUser(req, res, next) {
  var u = queryOne('SELECT role FROM users WHERE id = ?', [req.userId]);
  if (u && u.role === 'demo') return res.status(403).json({ detail: '演示账号无法操作此功能', code: 'demo_restricted' });
  next();
}
function userDict(u) {
  var isVip = u.is_vip == 1;
  var vipExp = u.vip_expires || null;
  if (isVip && vipExp && new Date(vipExp) < new Date()) isVip = false;
  return { id: u.id, username: u.username, nickname: u.nickname || '', avatar: u.avatar || '',
    gender: u.gender || '', birth_year: u.birth_year, height_cm: u.height_cm, weight_kg: u.weight_kg,
    constitution_type: u.constitution || '', is_vip: isVip, vip_expires: isVip ? vipExp : null };
}

function requireVip(req, res, next) {
  var u = queryOne('SELECT * FROM users WHERE id = ?', [req.userId]);
  if (!u) return res.status(404).json({ detail: 'User not found' });
  var isVip = u.is_vip == 1;
  if (isVip && u.vip_expires && new Date(u.vip_expires) < new Date()) isVip = false;
  if (!isVip) return res.status(403).json({ detail: 'VIP membership required', code: 'vip_required' });
  next();
}

var app = express();
app.use(cors());
app.use(express.json());
app.get("/landing",function(req,res){try{var buf=require('fs').readFileSync(path.join(__dirname,"体验入口.html"));res.setHeader('Content-Type','text/html; charset=utf-8');res.send(buf);}catch(e){res.status(500).send('Error');}});
app.get("/",function(req,res){try{var buf=require('fs').readFileSync(path.join(__dirname,"frontend","app.html"),'utf-8');res.setHeader('Content-Type','text/html; charset=utf-8');res.send(buf);}catch(e){console.log('[ROOT] ERR:',e.message);res.status(500).send('Error loading page');}});
app.get("/app",function(req,res){try{var buf=require('fs').readFileSync(path.join(__dirname,"frontend","app.html"),'utf-8');res.setHeader('Content-Type','text/html; charset=utf-8');res.send(buf);}catch(e){res.status(500).send('Error loading page');}});
// Digital Asset Links for TWA (must be BEFORE express.static)
app.get('/.well-known/assetlinks.json', function(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'xn__fiqs8s.shishu.twa',
        sha256_cert_fingerprints: [
          '3E:3A:53:F9:4D:E7:F5:5B:F3:7B:77:D2:1D:55:81:9D:88:C1:75:3E:85:5B:07:AE:A3:D7:97:34:0E:5B:98:76'
        ]
      }
    }
  ]);
});

app.use(express.static(path.join(__dirname, 'frontend'), {
  maxAge: 0,
  setHeaders: function(res, fp) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
}));



// Error handler will be placed after all routes (moved to end of file)

// ── 微信支付 ──

// 获取支付参数（创建订单）
app.post('/api/pay/create', auth, requireRealUser, async function(req, res) {
  try {
    var planId = (req.body || {}).plan_id || 'monthly';
    var plans = { monthly: { name: '月度会员', price: 1990, days: 30 }, 
      quarterly: { name: '季度会员', price: 4990, days: 90 }, 
      yearly: { name: '年度会员', price: 16800, days: 365 } };
    var plan = plans[planId];
    if (!plan) return res.status(400).json({ detail: 'Invalid plan' });

    // 获取用户 openId（需要小程序登录后获取）
    var user = queryOne('SELECT * FROM users WHERE id = ?', [req.userId]);
    var openId = user.wx_openid || 'mock-open-id';

    var outTradeNo = pay.generateOrderNo();
    var result = await pay.unifiedOrder({
      openId: openId,
      description: '体质养生·大健康 - ' + plan.name,
      total: plan.price,
      outTradeNo: outTradeNo,
      notifyUrl: req.headers.origin + '/api/pay/notify',
    });

    // 记录订单
    queryRun('INSERT INTO pay_orders (user_id, out_trade_no, plan_id, amount, status) VALUES (?, ?, ?, ?, ?)',
      [req.userId, outTradeNo, planId, plan.price, 'pending']);
    saveDb();

    if (pay.CONFIG.mchId) {
      res.json({ order_no: outTradeNo, pay_params: result.payParams });
    } else {
      // 模拟模式 — 直接完成支付
      res.json({ order_no: outTradeNo, mock: true, 
        message: '当前为模拟模式，配置商户号后启用真实支付' });
    }
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// 模拟支付完成（无商户号时使用）
app.post('/api/pay/mock-complete', auth, requireRealUser, function(req, res) {
  var orderNo = (req.body || {}).order_no;
  if (!orderNo) return res.status(400).json({ detail: 'order_no required' });
  
  var order = queryOne('SELECT * FROM pay_orders WHERE out_trade_no = ? AND user_id = ?', [orderNo, req.userId]);
  if (!order) return res.status(404).json({ detail: 'Order not found' });
  if (order.status !== 'pending') return res.json({ detail: 'Order already processed' });

  // 更新订单状态
  var plans = { monthly: 30, quarterly: 90, yearly: 365 };
  var days = plans[order.plan_id] || 30;
  
  var now = new Date();
  var u = queryOne('SELECT * FROM users WHERE id = ?', [req.userId]);
  var currentExp = (u.is_vip == 1 && u.vip_expires && new Date(u.vip_expires) > now) ? new Date(u.vip_expires) : now;
  currentExp.setDate(currentExp.getDate() + days);
  var expStr = currentExp.toISOString().slice(0, 10);

  queryRun('UPDATE pay_orders SET status = ?, paid_at = ? WHERE out_trade_no = ?', ['paid', new Date().toISOString(), orderNo]);
  queryRun('UPDATE users SET is_vip = 1, vip_expires = ?, vip_orders = vip_orders + 1 WHERE id = ?', [expStr, req.userId]);
  saveDb();

  res.json({ success: true, is_vip: true, vip_expires: expStr, plan: order.plan_id });
});

// 支付结果回调通知（微信服务器 -> 我们的服务器）
app.post('/api/pay/notify', function(req, res) {
  // 验证签名
  var result = pay.verifyNotify(req.headers, JSON.stringify(req.body));
  if (!result) {
    return res.status(401).json({ code: 'FAIL', message: '签名验证失败' });
  }

  // 处理订单
  var orderNo = result.out_trade_no;
  var order = queryOne('SELECT * FROM pay_orders WHERE out_trade_no = ?', [orderNo]);
  if (order && order.status === 'pending') {
    var plans = { monthly: 30, quarterly: 90, yearly: 365 };
    var days = plans[order.plan_id] || 30;
    
    var now = new Date();
    var u = queryOne('SELECT * FROM users WHERE id = ?', [order.user_id]);
    var currentExp = (u.is_vip == 1 && u.vip_expires && new Date(u.vip_expires) > now) ? new Date(u.vip_expires) : now;
    currentExp.setDate(currentExp.getDate() + days);
    var expStr = currentExp.toISOString().slice(0, 10);

    queryRun('UPDATE pay_orders SET status = ?, paid_at = ? WHERE out_trade_no = ?', 
      ['paid', new Date().toISOString(), orderNo]);
    queryRun('UPDATE users SET is_vip = 1, vip_expires = ?, vip_orders = vip_orders + 1 WHERE id = ?', 
      [expStr, order.user_id]);
    saveDb();
  }

  // 回复微信服务器
  res.json({ code: 'SUCCESS', message: '成功' });
});

// 查询订单状态
app.get('/api/pay/order/:orderNo', auth, function(req, res) {
  var order = queryOne('SELECT * FROM pay_orders WHERE out_trade_no = ? AND user_id = ?', 
    [req.params.orderNo, req.userId]);
  if (!order) return res.status(404).json({ detail: 'Not found' });
  res.json(order);
});

// Auth
// 密码强度校验
function validatePassword(pw) {
  if (!pw || pw.length < 6) return '密码至少6位';
  if (pw.length > 64) return '密码不能超过64位';
  if (/^[a-zA-Z0-9]+$/.test(pw)) return '密码需包含字母和数字以外的字符（如符号）';
  return null;
}

app.post('/api/auth/register', function(req, res) {
  var b = req.body || {};
  if (!b.username || !b.password) return res.status(400).json({ detail: 'username and password required' });

  // 限制注册 demo 前缀的用户名（系统保留）
  if (/^demo/i.test(b.username)) return res.status(403).json({ detail: '该用户名被系统保留' });

  // 密码强度校验
  var pwErr = validatePassword(b.password);
  if (pwErr) return res.status(400).json({ detail: pwErr });

  if (queryOne('SELECT id FROM users WHERE username = ?', [b.username]))
    return res.status(400).json({ detail: 'Username already exists' });
  queryRun('INSERT INTO users (username, hashed_password, nickname, phone, role) VALUES (?, ?, ?, ?, ?)',
    [b.username, hashPw(b.password), b.nickname || b.username, b.phone || '', 'user']);
  saveDb();
  var user = queryOne('SELECT * FROM users WHERE username = ?', [b.username]);
  res.json({ access_token: makeToken(user.id), token_type: 'bearer', user: userDict(user) });
});

app.post('/api/auth/login', function(req, res) {
  console.log('DEBUG: login called, db exists:', !!db);
  var b = req.body || {};
  if (!b.username || !b.password) return res.status(400).json({ detail: 'username and password required' });
  var user = queryOne('SELECT * FROM users WHERE username = ?', [b.username]);
  if (!user || user.hashed_password !== hashPw(b.password))
    return res.status(401).json({ detail: 'Invalid credentials' });
  res.json({ access_token: makeToken(user.id), token_type: 'bearer', user: userDict(user) });
});

app.get('/api/auth/me', auth, function(req, res) {
  var user = queryOne('SELECT * FROM users WHERE id = ?', [req.userId]);
  if (!user) return res.status(404).json({ detail: 'Not found' });
  res.json(userDict(user));
});

app.put('/api/auth/me', auth, function(req, res) {
  var data = req.body || {};
  var sets = []; var vals = [];
  for (var fi = 0; fi < ['nickname','gender','birth_year','height_cm','weight_kg'].length; fi++) {
    var f = ['nickname','gender','birth_year','height_cm','weight_kg'][fi];
    if (data[f] !== undefined) { sets.push(f + ' = ?'); vals.push(data[f]); }
  }
  if (sets.length) { vals.push(req.userId); queryRun('UPDATE users SET ' + sets.join(', ') + ' WHERE id = ?', vals); saveDb(); }
  res.json(userDict(queryOne('SELECT * FROM users WHERE id = ?', [req.userId])));
});

// Constitution
app.get('/api/constitution/questions', function(req, res) {
  res.json(queryAll('SELECT id, question_text, category FROM constitution_questions ORDER BY id'));
});

app.post('/api/constitution/assess', auth, function(req, res) {
  var answers = (req.body || {}).answers;
  if (!answers) return res.status(400).json({ detail: 'answers required' });
  var questions = queryAll('SELECT id, category, weight FROM constitution_questions');
  var qMap = {};
  for (var qi = 0; qi < questions.length; qi++) qMap[questions[qi].id] = questions[qi];
  var scores = {};
  var keys = Object.keys(answers);
  for (var ki = 0; ki < keys.length; ki++) {
    var q = qMap[parseInt(keys[ki])];
    if (q) scores[q.category] = (scores[q.category] || 0) + parseInt(answers[keys[ki]]) * q.weight;
  }
  var sorted = Object.keys(scores).sort(function(a, b) { return scores[b] - scores[a]; });
  var result = sorted.length ? sorted[0] : 'Du8260Du548CDu8D28';
  queryRun('INSERT INTO constitution_records (user_id, scores, result_type) VALUES (?, ?, ?)', [req.userId, JSON.stringify(scores), result]);
  queryRun('UPDATE users SET constitution = ? WHERE id = ?', [result, req.userId]);
  saveDb();
  res.json({ scores: scores, result_type: result });
});

app.get('/api/constitution/records', auth, function(req, res) {
  var rows = queryAll('SELECT id, scores, result_type, created_at FROM constitution_records WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
  for (var ri = 0; ri < rows.length; ri++) rows[ri].scores = JSON.parse(rows[ri].scores);
  res.json(rows);
});

// Diary
app.get('/api/diary', auth, function(req, res) {
  var sql = 'SELECT * FROM health_diaries WHERE user_id = ?';
  var params = [req.userId];
  if (req.query.start_date) { sql += ' AND record_date >= ?'; params.push(req.query.start_date); }
  if (req.query.end_date) { sql += ' AND record_date <= ?'; params.push(req.query.end_date); }
  sql += ' ORDER BY record_date DESC';
  res.json(queryAll(sql, params));
});

app.get('/api/diary/today', auth, function(req, res) {
  var today = new Date().toISOString().slice(0, 10);
  res.json(queryOne('SELECT * FROM health_diaries WHERE user_id = ? AND record_date = ?', [req.userId, today]) || null);
});

app.post('/api/diary', auth, function(req, res) {
  var data = req.body || {};
  var rd = data.record_date || new Date().toISOString().slice(0, 10);
  if (queryOne('SELECT id FROM health_diaries WHERE user_id = ? AND record_date = ?', [req.userId, rd]))
    return res.status(400).json({ detail: 'Entry exists for this date' });
  var fields = ['user_id', 'record_date']; var vals = [req.userId, rd];
  var diaryFields = ['sleep_hours','exercise_minutes','exercise_type','meal_count','water_glasses','diet_note','mood_score','note'];
  for (var fi = 0; fi < diaryFields.length; fi++) {
    var f = diaryFields[fi];
    if (data[f] !== undefined) { fields.push(f); vals.push(data[f]); }
  }
  queryRun('INSERT INTO health_diaries (' + fields.join(',') + ') VALUES (' + fields.map(function(){return '?';}).join(',') + ')', vals);
  saveDb();
  res.status(201).json(queryOne('SELECT * FROM health_diaries WHERE user_id = ? AND record_date = ?', [req.userId, rd]));
});

app.put('/api/diary/:id', auth, function(req, res) {
  if (!queryOne('SELECT id FROM health_diaries WHERE id = ? AND user_id = ?', [req.params.id, req.userId]))
    return res.status(404).json({ detail: 'Not found' });
  var data = req.body || {};
  var sets = []; var vals = [];
  var diaryFields = ['sleep_hours','exercise_minutes','exercise_type','meal_count','water_glasses','diet_note','mood_score','note'];
  for (var fi = 0; fi < diaryFields.length; fi++) {
    var f = diaryFields[fi];
    if (data[f] !== undefined) { sets.push(f + ' = ?'); vals.push(data[f]); }
  }
  if (sets.length) { vals.push(req.params.id); queryRun('UPDATE health_diaries SET ' + sets.join(', ') + ' WHERE id = ?', vals); saveDb(); }
  res.json(queryOne('SELECT * FROM health_diaries WHERE id = ?', [req.params.id]));
});

app.delete('/api/diary/:id', auth, function(req, res) {
  if (!queryOne('SELECT id FROM health_diaries WHERE id = ? AND user_id = ?', [req.params.id, req.userId]))
    return res.status(404).json({ detail: 'Not found' });
  queryRun('DELETE FROM health_diaries WHERE id = ?', [req.params.id]);
  saveDb();
  res.json({ message: 'Deleted' });
});

// Recipes
app.get('/api/recipes', function(req, res) {
  var sql = 'SELECT * FROM recipes WHERE 1=1';
  var params = [];
  if (req.query.constitution) { sql += ' AND suitable_constitution LIKE ?'; params.push('%' + req.query.constitution + '%'); }
  if (req.query.season) { sql += ' AND suitable_season LIKE ?'; params.push('%' + req.query.season + '%'); }
  if (req.query.category) { sql += ' AND category = ?'; params.push(req.query.category); }
  res.json(queryAll(sql, params));
});

// Recipe Image SVG - MUST come before :id route (more specific first)
app.get('/api/recipes/:id/image', function(req, res) {
  var r = queryOne('SELECT * FROM recipes WHERE id = ?', [Number(req.params.id)]);
  if (!r) return res.status(404).json({ detail: 'Not found' });
  var cat = r.category || 'default';
  var bg = '#4CAF50'; var fg = '#2E7D32'; var emoji = '\uD83E\uDD57';
  if (cat === '\u836F\u81B4\u6C64') { bg = '#4CAF50'; fg = '#2E7D32'; emoji = '\uD83C\uDF72'; }
  else if (cat === '\u7CA5\u7C7B') { bg = '#FF9800'; fg = '#E65100'; emoji = '\uD83E\uDD63'; }
  else if (cat === '\u8336\u996E') { bg = '#2196F3'; fg = '#1565C0'; emoji = '\uD83C\uDF75'; }
  else if (cat === '\u5C0F\u98DF') { bg = '#9C27B0'; fg = '#6A1B9A'; emoji = '\uD83E\uDD5F'; }
  var safeName = (r.name||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  var safeBenefits = (r.benefits||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  var cons = (r.suitable_constitution||'').replace(/&/g,'&amp;');
  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">';
  s += '<defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">';
  s += '<stop offset="0%" style="stop-color:' + bg + ';stop-opacity:.15"/>';
  s += '<stop offset="100%" style="stop-color:' + fg + ';stop-opacity:.3"/>';
  s += '</linearGradient></defs><rect width="400" height="200" rx="16" fill="url(#g)"/>';
  s += '<rect x="1" y="1" width="398" height="198" rx="16" fill="none" stroke="' + bg + '" stroke-opacity=".3" stroke-width="1"/>';
  s += '<text x="40" y="70" font-size="48">' + emoji + '</text>';
  s += '<text x="40" y="115" font-family="sans-serif" font-size="22" font-weight="bold" fill="' + fg + '">' + safeName + '</text>';
  s += '<text x="40" y="145" font-family="sans-serif" font-size="14" fill="#666">' + cat + ' \u00b7 ' + cons + '</text>';
  s += '<text x="40" y="170" font-family="sans-serif" font-size="12" fill="#999">' + safeBenefits + '</text></svg>';
  res.type('image/svg+xml').set('Cache-Control','public,max-age=86400').send(s);
});

app.get('/api/recipes/:id', function(req, res) {
  var r = queryOne('SELECT * FROM recipes WHERE id = ?', [Number(req.params.id)]);
  if (!r) return res.status(404).json({ detail: 'Not found' });
  res.json(r);
});

// Solar Terms
app.get('/api/solar-terms', function(req, res) {
  res.json(queryAll('SELECT * FROM solar_terms ORDER BY date_mmdd'));
});

app.get('/api/solar-terms/current', function(req, res) {
  var today = new Date().toISOString().slice(5, 10);
  var all = queryAll('SELECT * FROM solar_terms ORDER BY date_mmdd');
  for (var i = 0; i < all.length; i++) { if (all[i].date_mmdd >= today) return res.json(all[i]); }
  res.json(all.length ? all[0] : null);
});

// Articles
app.get('/api/articles', function(req, res) {
  var where = ' WHERE is_published = 1';
  var params = [];
  if (req.query.category) { where += ' AND category = ?'; params.push(req.query.category); }
  var total = queryOne('SELECT count(*) as total FROM articles' + where, params).total;
  var page = parseInt(req.query.page) || 1;
  var size = parseInt(req.query.size) || 10;
  params.push(size, (page - 1) * size);
  var items = queryAll('SELECT id, title, summary, category, tags, author, cover_image, view_count, created_at FROM articles' + where + ' ORDER BY created_at DESC LIMIT ? OFFSET ?', params);
  res.json({ total: total, page: page, size: size, items: items });
});

// Admin: All articles (including drafts) with is_published
app.get('/api/admin/articles', auth, function(req, res) {
  var u = queryOne('SELECT role FROM users WHERE id = ?', [req.userId]);
  if (!u || u.role !== 'admin') return res.status(403).json({ detail: 'Admin only' });
  var where = '';
  var params = [];
  if (req.query.category) { where = ' WHERE category = ?'; params.push(req.query.category); }
  var total = queryOne('SELECT count(*) as total FROM articles' + where, params).total;
  var items = queryAll('SELECT id, title, summary, category, tags, author, cover_image, view_count, is_published, created_at FROM articles' + where + ' ORDER BY created_at DESC', params);
  res.json({ total: total, items: items });
});

// Article Image SVG - MUST come before :id route
app.get('/api/articles/:id/image', function(req, res) {
  var a = queryOne('SELECT * FROM articles WHERE id = ?', [Number(req.params.id)]);
  if (!a) return res.status(404).json({ detail: 'Not found' });
  var catMap = { '\u4E2D\u533B\u517B\u751F': '\uD83D\uDCDC', '\u8FD0\u52A8\u517B\u751F': '\uD83C\uDFC3', '\u8282\u6C14\u517B\u751F': '\uD83C\uDF3F' };
  var emoji = catMap[a.category] || '\uD83D\uDCD6';
  var safeTitle = a.title.replace(/&/g,'&amp;').replace(/</g,'&lt;');
  var safeSummary = (a.summary||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="160" viewBox="0 0 400 160">';
  s += '<defs><linearGradient id="ag" x1="0%" y1="0%" x2="100%" y2="100%">';
  s += '<stop offset="0%" style="stop-color:#2196F3;stop-opacity:0.1"/>';
  s += '<stop offset="100%" style="stop-color:#1565C0;stop-opacity:0.2"/>';
  s += '</linearGradient></defs><rect width="400" height="160" rx="12" fill="url(#ag)"/>';
  s += '<text x="30" y="60" font-size="40">' + emoji + '</text>';
  s += '<text x="30" y="100" font-family="sans-serif" font-size="18" font-weight="bold" fill="#1565C0">' + safeTitle + '</text>';
  s += '<text x="30" y="130" font-family="sans-serif" font-size="13" fill="#666">' + safeSummary + '</text></svg>';
  res.type('image/svg+xml').set('Cache-Control','public,max-age=86400').send(s);
});

app.get('/api/articles/:id', function(req, res) {
  var a = queryOne('SELECT * FROM articles WHERE id = ?', [Number(req.params.id)]);
  if (!a) return res.status(404).json({ detail: 'Not found' });
  queryRun('UPDATE articles SET view_count = view_count + 1 WHERE id = ?', [Number(req.params.id)]);
  saveDb();
  res.json(queryOne('SELECT * FROM articles WHERE id = ?', [Number(req.params.id)]));
});

// ── 体质调理方案（付费内容） ──

// 9种体质调理方案详情
var CONSTITUTION_PLANS = {
  '气虚质': {
    title: '气虚质 49天调理方案',
    summary: '补气固本，由内而外恢复元气',
    price: 19.9,
    preview: [
      '每天早晨喝一杯黄芪红枣茶',
      '饮食宜食山药、莲子、小米等补气食物',
      '避免过度出汗，适合散步、太极等温和运动',
    ],
    full: [
      '【饮食调理】每日三餐搭配：早餐以小米粥/山药粥为主，午餐配黄芪炖鸡/莲子排骨汤，晚餐清淡易消化。',
      '【补气茶饮】黄芪10g + 红枣3颗 + 枸杞5g，每日开水冲泡代茶饮。',
      '【穴位按摩】每天按揉足三里（膝盖下3寸）、气海穴（肚脐下1.5寸）各3分钟。',
      '【运动方案】早晨6-7点散步30分钟，配合八段锦或太极拳（选其中一式练习）。',
      '【作息调理】晚上11点前入睡，保证8小时睡眠，午休30分钟。',
      '【情绪调理】避免过度思虑，每天花10分钟做深呼吸练习。',
      '【禁忌提示】慎食生冷、油腻食物，忌过度劳累和剧烈运动。'
    ]
  },
  '阳虚质': {
    title: '阳虚质 49天调理方案',
    summary: '温阳散寒，改善畏寒怕冷体质',
    price: 19.9,
    preview: [
      '早晨晒太阳15-20分钟（背部最佳）',
      '多吃韭菜、羊肉、生姜等温热食物',
      '避免生冷饮食和空调直吹',
    ],
    full: [
      '【饮食调理】温补为主：当归生姜羊肉汤每周2次，韭菜炒核桃、肉桂红糖水常食。忌冷饮、凉菜。',
      '【温阳茶饮】肉桂3g + 干姜5g + 红糖适量，沸水冲泡10分钟饮用，每日2杯。',
      '【穴位按摩】艾灸关元穴（肚脐下3寸）、命门穴（后腰正中）每周3次，每次15分钟。',
      '【运动方案】选择阳光充足时运动（上午9-11点为佳），推荐快走、慢跑、广播体操。',
      '【作息调理】早睡晚起（冬季尤其要注意），睡前热水泡脚20分钟（加艾叶更佳）。',
      '【情绪调理】多听激昂音乐，多参与社交活动，避免独处生闷。',
      '【禁忌提示】忌食西瓜、苦瓜、绿豆等寒性食物，避免游泳、冬泳等寒性运动。'
    ]
  },
  '阴虚质': {
    title: '阴虚质 49天调理方案',
    summary: '滋阴润燥，缓解口干咽燥手脚心热',
    price: 19.9,
    preview: [
      '多食百合、银耳、梨等滋阴食物',
      '避免熬夜，晚上11点前入睡',
      '少吃辛辣燥热食物',
    ],
    full: [
      '【饮食调理】滋阴润燥：百合银耳羹每日一碗，沙参玉竹煲老鸭每周2次，多吃黑芝麻、桑椹。',
      '【滋阴茶饮】麦冬10g + 玉竹10g + 枸杞5g，沸水冲泡代茶饮，可加少许蜂蜜。',
      '【穴位按摩】按压太溪穴（内踝后方）、涌泉穴（脚心）每晚各3分钟。',
      '【运动方案】选择温和运动：瑜伽、游泳、太极拳，避免大量出汗的剧烈运动。',
      '【作息调理】务必11点前入睡，午休30分钟左右，保持卧室湿度适中。',
      '【情绪调理】保持心境平和，练习冥想或书法，避免急躁发火。',
      '【禁忌提示】忌食辛辣（辣椒、花椒）、油炸食品，少喝咖啡和浓茶。'
    ]
  },
  '痰湿质': {
    title: '痰湿质 49天调理方案',
    summary: '化痰祛湿，告别肥胖困重',
    price: 19.9,
    preview: [
      '饮食清淡，少油少盐少糖',
      '多吃薏米、冬瓜、赤小豆等利湿食物',
      '坚持每天运动出汗',
    ],
    full: [
      '【饮食调理】化湿为主：薏米赤小豆粥每日早晨食用，冬瓜海带汤、陈皮炒瘦肉常食。忌甜食、肥肉。',
      '【祛湿茶饮】陈皮5g + 茯苓10g + 薏米15g，煮水代茶饮，每日1-2杯。',
      '【穴位按摩】按揉丰隆穴（小腿外侧中点）、阴陵泉（膝盖内侧下方）各3分钟。',
      '【运动方案】每日坚持中等强度运动40分钟以上，推荐跑步、快走、跳绳。',
      '【作息调理】早睡早起，醒后不要赖床，保持环境干燥通风。',
      '【情绪调理】保持心情舒畅，多与人交流，避免情绪压抑。',
      '【禁忌提示】忌甜食、油腻、生冷瓜果，少喝酒，减少久坐。'
    ]
  },
  '湿热质': {
    title: '湿热质 49天调理方案',
    summary: '清热祛湿，改善油光满面口苦',
    price: 19.9,
    preview: [
      '多吃绿豆、苦瓜、黄瓜等清热食物',
      '少喝酒、少吃辛辣烧烤',
      '保持皮肤清洁干爽',
    ],
    full: [
      '【饮食调理】清热利湿：绿豆薏米汤每周3-4次，苦瓜炒蛋、凉拌黄瓜常食。忌烧烤、辛辣。',
      '【清热茶饮】菊花5g + 金银花5g + 薄荷3g，沸水冲泡，每日1-2杯。',
      '【穴位按摩】按揉曲池穴（屈肘横纹端）、合谷穴（虎口）各2分钟。',
      '【运动方案】中等以上强度运动，跑步、球类运动最佳，运动后及时清洁。',
      '【作息调理】保证充足睡眠，不熬夜，居住环境注意通风。',
      '【情绪调理】避免急躁发怒，练习深呼吸和放松训练。',
      '【禁忌提示】忌烟酒、辛辣、油腻、甜食，少在湿热环境中久留。'
    ]
  },
  '血瘀质': {
    title: '血瘀质 49天调理方案',
    summary: '活血化瘀，改善肤色暗沉',
    price: 19.9,
    preview: [
      '多吃山楂、黑豆、油菜等活血食物',
      '坚持运动促进血液循环',
      '注意保暖，尤其是冬季',
    ],
    full: [
      '【饮食调理】活血化瘀：山楂红糖水每日1杯，黑豆煲鸡脚、醋泡花生常食。忌寒凉食物。',
      '【活血茶饮】玫瑰花5朵 + 丹参5g + 山楂5g，沸水冲泡代茶饮。',
      '【穴位按摩】按揉血海穴（膝盖内侧上方）、三阴交（内踝上3寸）各3分钟。',
      '【运动方案】坚持每日运动，推荐快走、跑步、跳舞等有氧运动。',
      '【作息调理】早睡早起，睡前温水泡脚，可加红花或艾叶。',
      '【情绪调理】多听舒缓音乐，培养兴趣爱好，保持心情愉悦。',
      '【禁忌提示】忌食寒凉、生冷食物，注意保暖避免受寒。'
    ]
  },
  '气郁质': {
    title: '气郁质 49天调理方案',
    summary: '疏肝理气，赶走郁闷情绪',
    price: 19.9,
    preview: [
      '多吃萝卜、佛手、柑橘等理气食物',
      '多与人交流，不要憋在心里',
      '适当运动释放压力',
    ],
    full: [
      '【饮食调理】理气解郁：玫瑰花茶每日饮用，佛手瓜炒肉、陈皮萝卜汤常食。忌咖啡、浓茶。',
      '【理气茶饮】玫瑰花5朵 + 佛手5g + 薄荷3g，沸水冲泡代茶饮。',
      '【穴位按摩】按揉太冲穴（脚背第一二趾骨间）、膻中穴（两乳连线中点）各3分钟。',
      '【运动方案】多参与团体运动：羽毛球、篮球、舞蹈，或户外登山散步。',
      '【作息调理】保持规律作息，睡前不玩手机，可听轻音乐助眠。',
      '【情绪调理】多与朋友倾诉，培养兴趣爱好，可写日记释放情绪。',
      '【禁忌提示】少喝咖啡、浓茶等兴奋饮品，避免过度独处。'
    ]
  },
  '特禀质': {
    title: '特禀质 49天调理方案',
    summary: '固本培元，增强免疫力',
    price: 19.9,
    preview: [
      '饮食温和，避免已知过敏原',
      '增强抵抗力，循序渐进锻炼',
      '保持居住环境清洁',
    ],
    full: [
      '【饮食调理】固本培元：黄芪山药粥每日食用，灵芝炖鸡汤每周2次，避免已知过敏食物。',
      '【固本茶饮】黄芪10g + 白术5g + 防风5g（玉屏风散），煮水代茶饮。',
      '【穴位按摩】按揉足三里（膝盖下3寸）、肺俞穴（背部第三胸椎旁）各3分钟。',
      '【运动方案】从温和运动开始：散步、太极、瑜伽，逐步增加强度。',
      '【作息调理】保证充足睡眠，换季时注意保暖，避免接触过敏原。',
      '【情绪调理】保持积极乐观，减少紧张恐惧情绪。',
      '【禁忌提示】远离已知过敏原（花粉、尘螨、海鲜等），换季前后加强防护。'
    ]
  },
  '平和质': {
    title: '平和质 49天调理方案',
    summary: '巩固健康，预防为主',
    price: 19.9,
    preview: [
      '继续保持良好生活习惯',
      '均衡营养，五谷为养',
      '适度运动，持之以恒',
    ],
    full: [
      '【饮食调理】均衡营养：五谷杂粮为主食，每日摄入12种以上食物，荤素搭配合理。',
      '【保健茶饮】枸杞5g + 菊花3g + 红枣2颗，沸水冲泡，每日1杯。',
      '【穴位按摩】每日按揉足三里（膝盖下3寸）、涌泉穴（脚心）各2分钟作为保健。',
      '【运动方案】每周5次中等强度运动，每次30分钟以上，种类多样化。',
      '【作息调理】保持规律作息，春夏晚睡早起，秋冬早睡晚起，顺应四季。',
      '【情绪调理】保持平和心态，遇事不急不躁，培养冥想或阅读习惯。',
      '【禁忌提示】避免暴饮暴食，不过度进补，保持"中庸"之道。'
    ]
  }
};

// 获取所有方案列表
app.get('/api/constitution/plans', function(req, res) {
  var data = [];
  for (var key in CONSTITUTION_PLANS) {
    if (CONSTITUTION_PLANS.hasOwnProperty(key)) {
      var p = CONSTITUTION_PLANS[key];
      data.push({ type: key, title: p.title, summary: p.summary, price: p.price });
    }
  }
  res.json(data);
});

// 获取某个体质类型的免费预览
app.get('/api/constitution/plans/:type/preview', function(req, res) {
  var plan = CONSTITUTION_PLANS[req.params.type];
  if (!plan) return res.status(404).json({ detail: 'Not found' });
  res.json({ type: req.params.type, title: plan.title, summary: plan.summary, price: plan.price, preview: plan.preview });
});

// 获取完整方案（需要已购买或VIP）
app.get('/api/constitution/plans/:type/full', auth, function(req, res) {
  var plan = CONSTITUTION_PLANS[req.params.type];
  if (!plan) return res.status(404).json({ detail: 'Not found' });

  // 检查是否已购买该方案
  var purchased = queryOne('SELECT id FROM plan_purchases WHERE user_id = ? AND plan_type = ? AND status = ?', 
    [req.userId, req.params.type, 'active']);
  
  // 检查是否VIP
  var user = queryOne('SELECT * FROM users WHERE id = ?', [req.userId]);
  var isVip = user && user.is_vip == 1;
  if (isVip && user.vip_expires && new Date(user.vip_expires) < new Date()) isVip = false;

  if (!purchased && !isVip) {
    return res.status(403).json({ detail: '请先购买该方案', code: 'purchase_required', price: plan.price });
  }

  res.json({ type: req.params.type, title: plan.title, full: plan.full });
});

// 购买方案
app.post('/api/constitution/plans/:type/purchase', auth, requireRealUser, function(req, res) {
  var plan = CONSTITUTION_PLANS[req.params.type];
  if (!plan) return res.status(404).json({ detail: 'Not found' });

  // 检查是否已购买
  var existing = queryOne('SELECT id FROM plan_purchases WHERE user_id = ? AND plan_type = ?', 
    [req.userId, req.params.type]);
  if (existing) return res.status(400).json({ detail: '已经购买过该方案' });

  // 检查是否VIP（VIP免费）
  var user = queryOne('SELECT * FROM users WHERE id = ?', [req.userId]);
  var isVip = user && user.is_vip == 1;
  if (isVip && user.vip_expires && new Date(user.vip_expires) < new Date()) isVip = false;

  // 简单购买流程（直接记录，无真实支付）
  queryRun('INSERT INTO plan_purchases (user_id, plan_type, status, price, purchased_at) VALUES (?, ?, ?, ?, ?)',
    [req.userId, req.params.type, 'active', isVip ? 0 : plan.price, new Date().toISOString()]);
  saveDb();

  res.json({ success: true, type: req.params.type, title: plan.title, is_vip_free: isVip });
});

// ── 积分系统 ──

// 获取用户积分
function getUserPoints(userId) {
  var row = queryOne('SELECT COALESCE(SUM(points), 0) as total FROM points_log WHERE user_id = ?', [userId]);
  return row ? row.total : 0;
}

// 记录积分
function addPoints(userId, points, action, note) {
  queryRun('INSERT INTO points_log (user_id, points, action, note) VALUES (?, ?, ?, ?)', 
    [userId, points, action, note || '']);
  saveDb();
}

// 获取积分和签到状态
app.get('/api/points/status', auth, function(req, res) {
  var total = getUserPoints(req.userId);
  var today = new Date().toISOString().slice(0, 10);
  var todayCheckin = queryOne('SELECT id, consecutive_days, points_earned FROM checkins WHERE user_id = ? AND checkin_date = ?', 
    [req.userId, today]);
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  var yesterdayStr = yesterday.toISOString().slice(0, 10);
  var yesterdayCheckin = queryOne('SELECT id, consecutive_days FROM checkins WHERE user_id = ? AND checkin_date = ?', 
    [req.userId, yesterdayStr]);

  res.json({
    total_points: total,
    checked_in_today: !!todayCheckin,
    consecutive_days: todayCheckin ? todayCheckin.consecutive_days : (yesterdayCheckin ? yesterdayCheckin.consecutive_days : 0),
    today_earned: todayCheckin ? todayCheckin.points_earned : 0
  });
});

// 获取积分明细
app.get('/api/points/log', auth, function(req, res) {
  var page = parseInt(req.query.page) || 1;
  var size = parseInt(req.query.size) || 20;
  var total = queryOne('SELECT COUNT(*) as total FROM points_log WHERE user_id = ?', [req.userId]).total;
  var rows = queryAll('SELECT points, action, note, created_at FROM points_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', 
    [req.userId, size, (page - 1) * size]);
  res.json({ total: total, page: page, size: size, items: rows });
});

// 签到
app.post('/api/points/checkin', auth, function(req, res) {
  var uid = req.userId;
  var today = new Date().toISOString().slice(0, 10);
  
  // 检查今天是否已签到
  var existing = queryOne('SELECT id FROM checkins WHERE user_id = ? AND checkin_date = ?', [uid, today]);
  if (existing) return res.status(400).json({ detail: '今天已签到' });

  // 计算连续天数
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  var yesterdayStr = yesterday.toISOString().slice(0, 10);
  var yesterdayCheckin = queryOne('SELECT consecutive_days FROM checkins WHERE user_id = ? AND checkin_date = ?', 
    [uid, yesterdayStr]);
  var consecutive = yesterdayCheckin ? yesterdayCheckin.consecutive_days + 1 : 1;

  // 计算积分奖励
  var points = 5;
  if (consecutive === 3) points = 10;
  else if (consecutive === 7) points = 20;
  else if (consecutive === 30) points = 50;
  else if (consecutive % 7 === 0) points = 15;

  queryRun('INSERT INTO checkins (user_id, checkin_date, consecutive_days, points_earned) VALUES (?, ?, ?, ?)',
    [uid, today, consecutive, points]);
  addPoints(uid, points, 'checkin', '签到奖励（连续' + consecutive + '天）');
  saveDb();

  res.json({ success: true, points_earned: points, consecutive_days: consecutive, total_points: getUserPoints(uid) });
});

// 用积分兑换
app.post('/api/points/redeem', auth, requireRealUser, function(req, res) {
  var item = (req.body || {}).item;
  if (!item) return res.status(400).json({ detail: 'item required' });

  var total = getUserPoints(req.userId);
  var items = {
    'vip_7days': { name: '7天VIP体验', cost: 500, action: function() {
      var now = new Date();
      var u = queryOne('SELECT * FROM users WHERE id = ?', [req.userId]);
      var exp = (u.is_vip == 1 && u.vip_expires && new Date(u.vip_expires) > now) ? new Date(u.vip_expires) : now;
      exp.setDate(exp.getDate() + 7);
      queryRun('UPDATE users SET is_vip = 1, vip_expires = ? WHERE id = ?', [exp.toISOString().slice(0, 10), req.userId]);
      saveDb();
      return '7天VIP已开通，有效期至' + exp.toISOString().slice(0, 10);
    }},
    'plan_unlock': { name: '解锁一个体质方案', cost: 200, action: function() {
      return '请在购买方案时选择"积分兑换"';
    }}
  };

  var target = items[item];
  if (!target) return res.status(400).json({ detail: '无效的兑换项目' });
  if (total < target.cost) return res.status(400).json({ detail: '积分不足，需要' + target.cost + '积分' });

  var result = target.action();
  addPoints(req.userId, -target.cost, 'redeem', target.name);
  saveDb();

  res.json({ success: true, redeemed: target.name, cost: target.cost, remaining: getUserPoints(req.userId), message: result });
});

// ── VIP / Membership ──

app.get('/api/vip/status', auth, function(req, res) {
  var u = queryOne('SELECT * FROM users WHERE id = ?', [req.userId]);
  if (!u) return res.status(404).json({ detail: 'Not found' });
  var isVip = u.is_vip == 1;
  var vipExp = u.vip_expires || null;
  if (isVip && vipExp && new Date(vipExp) < new Date()) isVip = false;
  res.json({ is_vip: isVip, vip_expires: vipExp, orders: u.vip_orders || 0,
    plans: [
      { id: 'monthly', name: '月度会员', price: 19.9, duration_days: 30, badge: '🔥' },
      { id: 'quarterly', name: '季度会员', price: 49.9, duration_days: 90, badge: '💎', popular: true },
      { id: 'yearly', name: '年度会员', price: 168, duration_days: 365, badge: '👑', tag: '省¥71' }
    ]
  });
});

// Mock purchase (no real payment)
app.post('/api/vip/purchase', auth, requireRealUser, function(req, res) {
  var plan = (req.body || {}).plan_id || 'monthly';
  var plans = { monthly: 30, quarterly: 90, yearly: 365 };
  var days = plans[plan] || 30;
  var prices = { monthly: 19.9, quarterly: 49.9, yearly: 168 };
  var now = new Date();
  var u = queryOne('SELECT * FROM users WHERE id = ?', [req.userId]);
  var currentExp = (u.is_vip == 1 && u.vip_expires && new Date(u.vip_expires) > now) ? new Date(u.vip_expires) : now;
  currentExp.setDate(currentExp.getDate() + days);
  var expStr = currentExp.toISOString().slice(0, 10);
  queryRun('UPDATE users SET is_vip = 1, vip_expires = ?, vip_orders = vip_orders + 1 WHERE id = ?', [expStr, req.userId]);
  saveDb();
  res.json({ success: true, is_vip: true, vip_expires: expStr, order: { plan: plan, price: prices[plan], days: days } });
});

// VIP-only: Weekly health report (PDF as HTML)
app.get('/api/vip/weekly-report', auth, requireVip, function(req, res) {
  var entries = queryAll('SELECT * FROM health_diaries WHERE user_id = ? ORDER BY record_date DESC LIMIT 7', [req.userId]);
  var u = queryOne('SELECT * FROM users WHERE id = ?', [req.userId]);
  var name = u.nickname || u.username;
  var scores = [];
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    var s = 0;
    if (e.sleep_hours) s += Math.min(30, (e.sleep_hours >= 7 && e.sleep_hours <= 8) ? 30 : e.sleep_hours >= 6 ? 20 : 10);
    if (e.exercise_minutes) s += Math.min(25, e.exercise_minutes >= 30 ? 25 : e.exercise_minutes >= 15 ? 15 : 10);
    if (e.meal_count) s += e.meal_count == 3 ? 15 : e.meal_count >= 2 ? 10 : 5;
    if (e.water_glasses) s += Math.min(20, e.water_glasses >= 8 ? 20 : e.water_glasses >= 5 ? 15 : 8);
    if (e.mood_score) s += e.mood_score >= 7 ? 10 : e.mood_score >= 4 ? 6 : 2;
    scores.push({ date: e.record_date, score: Math.min(100, s), mood: e.mood_score || '-', sleep: e.sleep_hours || '-', exercise: e.exercise_minutes || 0 });
  }
  var avgScore = scores.length ? Math.round(scores.reduce(function(a, b) { return a + b.score; }, 0) / scores.length) : 0;
  var html = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>健康周报</title>';
  html += '<style>body{font-family:sans-serif;padding:40px;color:#333;max-width:600px;margin:0 auto}';
  html += 'h1{color:#4CAF50;border-bottom:2px solid #4CAF50;padding-bottom:10px}';
  html += 'h2{color:#388E3C;margin-top:30px}';
  html += 'table{width:100%;border-collapse:collapse;margin:16px 0}';
  html += 'th,td{padding:8px 12px;text-align:center;border:1px solid #ddd}';
  html += 'th{background:#4CAF50;color:#fff}';
  html += 'tr:nth-child(even){background:#f5f5f5}';
  html += '.score{font-size:48px;font-weight:bold;color:#4CAF50;text-align:center;padding:20px}';
  html += '.footer{text-align:center;color:#999;font-size:12px;margin-top:40px;border-top:1px solid #eee;padding-top:20px}';
  html += '</style></head><body>';
  html += '<h1>' + name + ' 的健康周报</h1>';
  html += '<p style="color:#666">统计周期：' + (scores.length ? scores[scores.length-1].date : '-') + ' ~ ' + (scores.length ? scores[0].date : '-') + '</p>';
  html += '<div class="score">' + avgScore + '<span style="font-size:16px;color:#666;display:block">平均健康分</span></div>';
  html += '<h2>每日数据</h2><table><tr><th>日期</th><th>健康分</th><th>心情</th><th>睡眠(h)</th><th>运动(min)</th></tr>';
  for (var i = 0; i < scores.length; i++) {
    var s = scores[i];
    html += '<tr><td>' + s.date + '</td><td><strong>' + s.score + '</strong></td><td>' + s.mood + '</td><td>' + s.sleep + '</td><td>' + s.exercise + '</td></tr>';
  }
  html += '</table>';
  html += '<h2>健康建议</h2><ul>';
  if (avgScore >= 80) html += '<li>整体状态优秀！保持良好习惯。</li>';
  else if (avgScore >= 60) html += '<li>状态不错，可以继续改善睡眠和运动。</li>';
  else html += '<li>需要加强健康管理，建议从规律作息开始。</li>';
  html += '<li>注意根据体质类型选择合适的饮食调理。</li>';
  html += '<li>每天保持30分钟以上运动。</li></ul>';
  html += '<div class="footer">由 体质养生·大健康 App 生成</div></body></html>';
  res.type('text/html; charset=utf-8').send(html);
});

// VIP-only: Weekly health report (JSON version, for native rendering in mini-app)
app.get('/api/health/report/weekly', auth, requireVip, function(req, res) {
  var entries = queryAll('SELECT * FROM health_diaries WHERE user_id = ? ORDER BY record_date DESC LIMIT 7', [req.userId]);
  var u = queryOne('SELECT * FROM users WHERE id = ?', [req.userId]);
  var name = u.nickname || u.username;

  if (entries.length === 0) {
    return res.status(404).json({ detail: 'No diary entries found' });
  }

  var dailyData = [];
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    var s = 0;
    if (e.sleep_hours) s += Math.min(30, (e.sleep_hours >= 7 && e.sleep_hours <= 8) ? 30 : e.sleep_hours >= 6 ? 20 : 10);
    if (e.exercise_minutes) s += Math.min(25, e.exercise_minutes >= 30 ? 25 : e.exercise_minutes >= 15 ? 15 : 10);
    if (e.meal_count) s += e.meal_count == 3 ? 15 : e.meal_count >= 2 ? 10 : 5;
    if (e.water_glasses) s += Math.min(20, e.water_glasses >= 8 ? 20 : e.water_glasses >= 5 ? 15 : 8);
    if (e.mood_score) s += e.mood_score >= 7 ? 10 : e.mood_score >= 4 ? 6 : 2;
    dailyData.push({
      date: e.record_date,
      score: Math.min(100, s),
      mood: e.mood_score || '-',
      sleep: e.sleep_hours || 0,
      exercise: e.exercise_minutes || 0
    });
  }

  var avgScore = dailyData.length
    ? Math.round(dailyData.reduce(function(a, b) { return a + b.score; }, 0) / dailyData.length)
    : 0;

  var suggestions = [];
  if (avgScore >= 80) suggestions.push('整体状态优秀！保持良好习惯。');
  else if (avgScore >= 60) suggestions.push('状态不错，可以继续改善睡眠和运动。');
  else suggestions.push('需要加强健康管理，建议从规律作息开始。');
  suggestions.push('注意根据体质类型选择合适的饮食调理。');
  suggestions.push('每天保持30分钟以上运动。');

  res.json({
    user_name: name,
    start_date: dailyData.length ? dailyData[dailyData.length - 1].date : '-',
    end_date: dailyData.length ? dailyData[0].date : '-',
    avg_score: avgScore,
    daily_data: dailyData,
    suggestions: suggestions
  });
});

// VIP-only: Constitution trend (track changes over time)
app.get('/api/vip/constitution-trend', auth, requireVip, function(req, res) {
  var rows = queryAll('SELECT id, scores, result_type, created_at FROM constitution_records WHERE user_id = ? ORDER BY created_at ASC', [req.userId]);
  for (var i = 0; i < rows.length; i++) rows[i].scores = JSON.parse(rows[i].scores);
  res.json(rows);
});

// ── Shop / Marketplace ──

// Get product categories
app.get('/api/shop/categories', function(req, res) {
  var rows = queryAll('SELECT DISTINCT category FROM shop_products WHERE is_active = 1 ORDER BY category');
  var cats = rows.map(function(r) { return r.category; });
  res.json(['全部'].concat(cats));
});

// Get products list
app.get('/api/shop/products', function(req, res) {
  var sql = 'SELECT * FROM shop_products WHERE is_active = 1';
  var params = [];
  if (req.query.category && req.query.category !== '全部') { sql += ' AND category = ?'; params.push(req.query.category); }
  if (req.query.constitution) { sql += ' AND tags LIKE ?'; params.push('%' + req.query.constitution + '%'); }
  sql += ' ORDER BY sales_count DESC';
  res.json(queryAll(sql, params));
});

// Admin: All products (including inactive)
app.get('/api/admin/products', auth, function(req, res) {
  var u = queryOne('SELECT role FROM users WHERE id = ?', [req.userId]);
  if (!u || u.role !== 'admin') return res.status(403).json({ detail: 'Admin only' });
  var rows = queryAll('SELECT * FROM shop_products ORDER BY sales_count DESC', []);
  res.json(rows);
});

// Get product detail
app.get('/api/shop/products/:id', function(req, res) {
  var p = queryOne('SELECT * FROM shop_products WHERE id = ?', [Number(req.params.id)]);
  if (!p) return res.status(404).json({ detail: 'Not found' });
  res.json(p);
});

// Cart
app.get('/api/shop/cart', auth, function(req, res) {
  var rows = queryAll('SELECT c.id, c.quantity, p.* FROM shop_cart c JOIN shop_products p ON c.product_id = p.id WHERE c.user_id = ?', [req.userId]);
  res.json(rows);
});

app.post('/api/shop/cart/add', auth, function(req, res) {
  var pid = (req.body || {}).product_id;
  var qty = (req.body || {}).quantity || 1;
  if (!pid) return res.status(400).json({ detail: 'product_id required' });
  var existing = queryOne('SELECT id, quantity FROM shop_cart WHERE user_id = ? AND product_id = ?', [req.userId, pid]);
  if (existing) {
    queryRun('UPDATE shop_cart SET quantity = ? WHERE id = ?', [existing.quantity + qty, existing.id]);
  } else {
    queryRun('INSERT INTO shop_cart (user_id, product_id, quantity) VALUES (?, ?, ?)', [req.userId, pid, qty]);
  }
  saveDb();
  res.json({ success: true });
});

app.post('/api/shop/cart/update', auth, function(req, res) {
  var id = (req.body || {}).id;
  var qty = (req.body || {}).quantity;
  if (!id) return res.status(400).json({ detail: 'id required' });
  if (qty <= 0) { queryRun('DELETE FROM shop_cart WHERE id = ? AND user_id = ?', [id, req.userId]); }
  else { queryRun('UPDATE shop_cart SET quantity = ? WHERE id = ? AND user_id = ?', [qty, id, req.userId]); }
  saveDb();
  res.json({ success: true });
});

app.post('/api/shop/cart/remove', auth, function(req, res) {
  var id = (req.body || {}).id;
  if (!id) return res.status(400).json({ detail: 'id required' });
  queryRun('DELETE FROM shop_cart WHERE id = ? AND user_id = ?', [id, req.userId]);
  saveDb();
  res.json({ success: true });
});

// Orders
app.post('/api/shop/orders/create', auth, requireRealUser, function(req, res) {
  var data = req.body || {};
  if (!data.items || !data.items.length) return res.status(400).json({ detail: 'items required' });
  var orderNo = 'ORD' + Date.now() + '' + Math.floor(Math.random() * 1000);
  var total = 0;
  for (var oi = 0; oi < data.items.length; oi++) {
    var item = data.items[oi];
    var prod = queryOne('SELECT * FROM shop_products WHERE id = ?', [item.product_id]);
    if (!prod) continue;
    total += prod.price * (item.quantity || 1);
  }
  queryRun('INSERT INTO shop_orders (user_id, order_no, total_amount, consignee, phone, address, remark) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [req.userId, orderNo, total, data.consignee || '', data.phone || '', data.address || '', data.remark || '']);
  var orderId = queryOne('SELECT last_insert_rowid() as id').id;
  for (var oi2 = 0; oi2 < data.items.length; oi2++) {
    var item2 = data.items[oi2];
    var prod2 = queryOne('SELECT * FROM shop_products WHERE id = ?', [item2.product_id]);
    if (!prod2) continue;
    queryRun('INSERT INTO shop_order_items (order_id, product_id, product_name, price, quantity) VALUES (?, ?, ?, ?, ?)',
      [orderId, item2.product_id, prod2.name, prod2.price, item2.quantity || 1]);
    queryRun('UPDATE shop_products SET sales_count = sales_count + ? WHERE id = ?', [item2.quantity || 1, item2.product_id]);
  }
  saveDb();
  res.json({ success: true, order_id: orderId, order_no: orderNo, total_amount: total });
});

app.get('/api/shop/orders', auth, function(req, res) {
  var orders = queryAll('SELECT * FROM shop_orders WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
  for (var oi = 0; oi < orders.length; oi++) {
    orders[oi].items = queryAll('SELECT * FROM shop_order_items WHERE order_id = ?', [orders[oi].id]);
  }
  res.json(orders);
});

// ── Chef Services ──

// List chefs
app.get('/api/chefs', function(req, res) {
  var sql = 'SELECT * FROM chef_services WHERE is_active = 1';
  var params = [];
  if (req.query.constitution) { sql += ' AND suitable_constitution LIKE ?'; params.push('%' + req.query.constitution + '%'); }
  sql += ' ORDER BY order_count DESC';
  res.json(queryAll(sql, params));
});

// Chef detail
app.get('/api/chefs/:id', function(req, res) {
  var chef = queryOne('SELECT * FROM chef_services WHERE id = ?', [Number(req.params.id)]);
  if (!chef) return res.status(404).json({ detail: 'Not found' });
  res.json(chef);
});

// Book a chef
app.post('/api/chefs/book', auth, requireRealUser, function(req, res) {
  var data = req.body || {};
  if (!data.chef_id || !data.service_date) return res.status(400).json({ detail: 'chef_id and service_date required' });
  var chef = queryOne('SELECT * FROM chef_services WHERE id = ?', [data.chef_id]);
  if (!chef) return res.status(404).json({ detail: 'Chef not found' });
  queryRun('INSERT INTO chef_bookings (user_id, chef_id, service_date, service_time, address, phone, note, menu_requirements, total_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [req.userId, data.chef_id, data.service_date, data.service_time || '', data.address || '', data.phone || '', data.note || '', data.menu_requirements || '', chef.price]);
  saveDb();
  res.json({ success: true, message: '预约成功！我们将尽快联系您确认。' });
});

// User's bookings
app.get('/api/chefs/bookings', auth, function(req, res) {
  var rows = queryAll('SELECT b.*, c.name as chef_name, c.title as chef_title, c.score as chef_score FROM chef_bookings b JOIN chef_services c ON b.chef_id = c.id WHERE b.user_id = ? ORDER BY b.created_at DESC', [req.userId]);
  res.json(rows);
});

// ── AI Service ──
try {
  var aiService = require('./ai_service');
  // Expose DB functions globally for AI module
  global.queryOne = queryOne;
  global.queryAll = queryAll;
  global.queryRun = queryRun;
  global.saveDb = saveDb;
  aiService.setupRoutes(app, auth, requireVip);
  // Override query functions in ai_service's scope by exposing them via global
  if (aiService.USE_AI) {
    log.info('AI服务已激活', { provider: aiService.ACTIVE_PROVIDER });
  } else {
    log.info('AI服务：规则引擎模式（未配置API密钥）');
  }
} catch (e) {
  log.error('AI服务初始化失败', e.message);
}

// ── 运维功能 ──

const BACKUP_DIR = path.join(__dirname, 'backend', 'data', 'backups');

// 确保备份目录存在
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// 数据库备份函数
function backupDb() {
  try {
    const now = new Date();
    const ts = now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') + '_' +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0');
    const backupPath = path.join(BACKUP_DIR, `wellness_${ts}.db`);
    const data = db.export();
    fs.writeFileSync(backupPath, Buffer.from(data));
    log.info('数据库已备份', { path: backupPath, size: data.length });

    // 清理旧备份（保留最近20个）
    try {
      const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith('wellness_') && f.endsWith('.db'))
        .sort();
      while (files.length > 20) {
        fs.unlinkSync(path.join(BACKUP_DIR, files.shift()));
        log.info('删除旧备份', { file: files.shift() });
      }
    } catch(e) { /* 清理错误不中断 */ }

    return backupPath;
  } catch(e) {
    log.error('数据库备份失败', e.message);
    return null;
  }
}

// 获取服务运行时间
var startTime = Date.now();

// 增强健康检查
app.get('/api/health', function(req, res) {
  var uptime = Math.floor((Date.now() - startTime) / 1000);
  var dbOk = false;
  try {
    db && db.exec('SELECT 1');
    dbOk = true;
  } catch(e) {}
  
  res.json({
    status: 'ok',
    version: '0.1.0',
    uptime_seconds: uptime,
    db_connected: dbOk,
    timestamp: new Date().toISOString()
  });
});

// 运维状态（仅管理员可用）
app.get('/api/admin/status', auth, function(req, res) {
  var u = queryOne('SELECT role FROM users WHERE id = ?', [req.userId]);
  if (!u || u.role !== 'admin') return res.status(403).json({ detail: 'Admin only' });

  var uptime = Math.floor((Date.now() - startTime) / 1000);
  var dbSize = 0;
  try { dbSize = fs.statSync(DB_PATH).size; } catch(e) {}

  // 备份列表
  var backups = [];
  try {
    backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.db'))
      .map(function(f) {
        var st = fs.statSync(path.join(BACKUP_DIR, f));
        return { name: f, size: st.size, mtime: st.mtime.toISOString() };
      })
      .sort(function(a, b) { return b.mtime.localeCompare(a.mtime); });
  } catch(e) {}

  // 日志文件统计
  var logStats = [];
  try {
    var logFiles = fs.readdirSync(LOG_DIR).filter(f => f.startsWith('app_')).sort();
    for (var li = 0; li < logFiles.length; li++) {
      var st = fs.statSync(path.join(LOG_DIR, logFiles[li]));
      logStats.push({ name: logFiles[li], size: st.size, mtime: st.mtime.toISOString() });
    }
  } catch(e) {}

  // 用户统计
  var userCount = 0, demoCount = 0;
  try {
    userCount = queryOne("SELECT COUNT(*) as c FROM users").c;
    demoCount = queryOne("SELECT COUNT(*) as c FROM users WHERE role='demo'").c;
  } catch(e) {}

  res.json({
    uptime_seconds: uptime,
    uptime_human: Math.floor(uptime / 3600) + 'h ' + Math.floor((uptime % 3600) / 60) + 'm ' + (uptime % 60) + 's',
    db: {
      path: DB_PATH,
      size_bytes: dbSize,
      size_mb: (dbSize / 1024 / 1024).toFixed(2)
    },
    users: { total: userCount, demo: demoCount, real: userCount - demoCount },
    backups: {
      count: backups.length,
      latest: backups[0] || null,
      directory: BACKUP_DIR
    },
    logs: {
      directory: LOG_DIR,
      files: logStats
    },
    timestamp: new Date().toISOString()
  });
});

// 手动触发备份
app.post('/api/admin/backup', auth, function(req, res) {
  var u = queryOne('SELECT role FROM users WHERE id = ?', [req.userId]);
  if (!u || u.role !== 'admin') return res.status(403).json({ detail: 'Admin only' });
  var bp = backupDb();
  res.json({ success: !!bp, path: bp });
});

// ===== Admin Dashboard =====
app.get('/api/admin/dashboard', auth, function(req, res) {
  var u = queryOne('SELECT role FROM users WHERE id = ?', [req.userId]);
  if (!u || u.role !== 'admin') return res.status(403).json({ detail: 'Admin only' });
  
  try {
    var totalUsers = queryOne('SELECT COUNT(*) as c FROM users').c;
    var totalOrders = queryOne('SELECT COUNT(*) as c FROM shop_orders').c;
    var totalRevenue = 0;
    try { totalRevenue = queryOne('SELECT COALESCE(SUM(total_amount),0) as s FROM shop_orders WHERE status = \'paid\'').s; } catch(e) {}
    var totalProducts = queryOne('SELECT COUNT(*) as c FROM shop_products').c;
    var totalArticles = queryOne('SELECT COUNT(*) as c FROM articles').c;
    var dbSize = 0;
    try { dbSize = fs.statSync(DB_PATH).size; } catch(e) {}
    
    var recentOrders = [];
    try {
      recentOrders = queryAll('SELECT id, order_no, total_amount, status, created_at FROM shop_orders ORDER BY created_at DESC LIMIT 10');
    } catch(e) {}
    
    res.json({
      total_users: totalUsers,
      total_orders: totalOrders,
      total_revenue: totalRevenue,
      product_count: totalProducts,
      article_count: totalArticles,
      db_size: (dbSize / 1024).toFixed(0) + ' KB',
      uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
      recent_orders: recentOrders
    });
  } catch(e) {
    res.status(500).json({ detail: e.message });
  }
});

// ===== Admin Users =====
app.get('/api/admin/users', auth, function(req, res) {
  var u = queryOne('SELECT role FROM users WHERE id = ?', [req.userId]);
  if (!u || u.role !== 'admin') return res.status(403).json({ detail: 'Admin only' });
  
  try {
    var users = queryAll('SELECT id, username, nickname, role, avatar, constitution, is_vip, vip_expires, created_at FROM users ORDER BY id DESC LIMIT 100');
    res.json(users);
  } catch(e) {
    res.json([]);
  }
});

// ===== Admin: 操作用户 =====
app.put('/api/admin/users/:id/role', auth, function(req, res) {
  var u = queryOne('SELECT role FROM users WHERE id = ?', [req.userId]);
  if (!u || u.role !== 'admin') return res.status(403).json({ detail: 'Admin only' });
  var targetId = parseInt(req.params.id);
  var role = req.body.role;
  if (!['admin','user'].includes(role)) return res.status(400).json({ detail: 'Invalid role' });
  try {
    queryRun('UPDATE users SET role = ? WHERE id = ?', [role, targetId]);
    res.json({ ok: true, role: role });
  } catch(e) { res.status(500).json({ detail: e.message }); }
});

app.put('/api/admin/users/:id/vip', auth, function(req, res) {
  var u = queryOne('SELECT role FROM users WHERE id = ?', [req.userId]);
  if (!u || u.role !== 'admin') return res.status(403).json({ detail: 'Admin only' });
  var targetId = parseInt(req.params.id);
  var isVip = req.body.is_vip ? 1 : 0;
  var expires = isVip ? new Date(Date.now() + 365 * 86400000).toISOString() : null;
  try {
    if (isVip) {
      queryRun('UPDATE users SET is_vip = 1, vip_expires = ? WHERE id = ?', [expires, targetId]);
    } else {
      queryRun('UPDATE users SET is_vip = 0, vip_expires = NULL WHERE id = ?', [targetId]);
    }
    res.json({ ok: true, is_vip: isVip });
  } catch(e) { res.status(500).json({ detail: e.message }); }
});

app.post('/api/admin/users/:id/reset-password', auth, function(req, res) {
  var u = queryOne('SELECT role FROM users WHERE id = ?', [req.userId]);
  if (!u || u.role !== 'admin') return res.status(403).json({ detail: 'Admin only' });
  var targetId = parseInt(req.params.id);
  var password = req.body.password;
  if (!password || password.length < 6) return res.status(400).json({ detail: 'Password too short' });
  try {
    var hash = hashPw(password);
    queryRun('UPDATE users SET hashed_password = ? WHERE id = ?', [hash, targetId]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ detail: e.message }); }
});

// ===== Admin: 文章状态切换 =====
app.put('/api/articles/:id', auth, function(req, res) {
  var u = queryOne('SELECT role FROM users WHERE id = ?', [req.userId]);
  if (!u || u.role !== 'admin') return res.status(403).json({ detail: 'Admin only' });
  var articleId = parseInt(req.params.id);
  var isPublished = req.body.is_published;
  try {
    queryRun('UPDATE articles SET is_published = ? WHERE id = ?', [isPublished ? 1 : 0, articleId]);
    res.json({ ok: true, is_published: isPublished ? 1 : 0 });
  } catch(e) { res.status(500).json({ detail: e.message }); }
});

// ===== Admin: 商品状态切换 =====
app.put('/api/shop/products/:id', auth, function(req, res) {
  var u = queryOne('SELECT role FROM users WHERE id = ?', [req.userId]);
  if (!u || u.role !== 'admin') return res.status(403).json({ detail: 'Admin only' });
  var isActive = req.body.is_active;
  var productId = parseInt(req.params.id);
  try {
    queryRun('UPDATE shop_products SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, productId]);
    res.json({ ok: true, is_active: isActive ? 1 : 0 });
  } catch(e) { res.status(500).json({ detail: e.message }); }
});

// Start
async function start() {
  try {
    // 茶养模块
    var teaService = require("./tea_service");
    teaService.setupTeaRoutes(app, auth);
    var SQL = await initSqlJs();
    var buf;
    try {
      buf = fs.readFileSync(DB_PATH);
    } catch (readErr) {
      if (readErr.code === 'ENOENT') {
        log.warn('数据库文件不存在，自动初始化中...');
        var initDb = require('./lib/init-db');
        db = await initDb.initDb(DB_PATH);
        log.info('数据库已自动初始化');
      } else {
        throw readErr;
      }
    }
    if (!db) {
      db = new SQL.Database(buf);
      log.info('数据库已加载');
    }

    // 启动时备份
    backupDb();

    // 定时备份（每6小时）
    setInterval(backupDb, 6 * 3600 * 1000);
    log.info('定时备份已启动（每6小时）');

  
// ── 茶养 Tea Routes ──
// 茶品列表
app.get('/api/tea/products', function(req, res) {
  try {
    res.json(queryAll('SELECT * FROM tea_products ORDER BY id'));
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// 时辰饮茶规则
app.get('/api/tea/time-rules', function(req, res) {
  try {
    res.json(queryAll('SELECT * FROM tea_time_rules ORDER BY start_hour'));
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// 节气茶饮推荐
app.get('/api/tea/seasonal', function(req, res) {
  var term = queryOne("SELECT * FROM solar_terms WHERE start_date <= date('now') ORDER BY start_date DESC LIMIT 1");
  var teas = [];
  if (term) {
    teas = queryAll('SELECT * FROM tea_products WHERE season = ? OR season = ? LIMIT 6', [term.season, '四季']);
  }
  res.json({ current_term: term, teas: teas });
});

// 今日推荐 + 用户体质
app.get('/api/tea/today', auth, function(req, res) {
  var user = queryOne('SELECT nickname, constitution FROM users WHERE id = ?', [req.userId]) || {};
  var record = queryOne('SELECT result FROM constitution_records WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [req.userId]);
  var constitution = user.constitution || (record ? record.result : null);
  var sql = 'SELECT * FROM tea_products';
  var params = [];
  if (constitution && constitution !== '未测评') {
    sql += ' WHERE constitution LIKE ?';
    params.push('%' + constitution + '%');
  }
  sql += ' ORDER BY RANDOM() LIMIT 3';
  var teas = queryAll(sql, params);
  if (teas.length === 0) teas = queryAll('SELECT * FROM tea_products ORDER BY id LIMIT 3');
  var now = new Date();
  var month = now.getMonth() + 1;
  var season = month <= 2 || month === 12 ? '冬' : month <= 5 ? '春' : month <= 8 ? '夏' : '秋';
  res.json({ constitution: constitution || '未测评', user: { nickname: user.nickname || '茶友' }, teas: teas, season: season });
});

// 茶养打卡记录
app.get('/api/tea/records', auth, function(req, res) {
  var days = parseInt(req.query.days) || 30;
  var records = queryAll(
    "SELECT * FROM tea_records WHERE user_id = ? AND created_at >= datetime('now', ?) ORDER BY created_at DESC",
    [req.userId, '-' + days + ' days']
  );
  var total = records.length;
  var uniqueDays = {};
  for (var ri = 0; ri < records.length; ri++) {
    var day = records[ri].created_at ? records[ri].created_at.substring(0, 10) : '';
    if (day) uniqueDays[day] = true;
  }
  var daysCount = Object.keys(uniqueDays).length;
  var scores = records.filter(function(r) { return r.score > 0; }).map(function(r) { return r.score; });
  var avgScore = scores.length > 0 ? scores.reduce(function(a, b) { return a + b; }, 0) / scores.length : 0;
  var continuous = 0;
  for (var ci = 0; ci < 30; ci++) {
    var d = new Date();
    d.setDate(d.getDate() - ci);
    var ds = d.toISOString().substring(0, 10);
    var has = queryOne('SELECT id FROM tea_records WHERE user_id = ? AND DATE(created_at) = ? LIMIT 1', [req.userId, ds]);
    if (has) continuous++; else break;
  }
  res.json({ stats: { total: total, days: daysCount, avg_score: avgScore }, continuous_days: continuous, records: records });
});

// 提交打卡记录
app.post('/api/tea/records', auth, function(req, res) {
  var data = req.body || {};
  queryRun(
    'INSERT INTO tea_records (user_id, tea_id, tea_name, score, feeling, completed, time_slot) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [req.userId, data.tea_id || 0, data.tea_name || '', data.score || 0, data.feeling || '', data.completed ? 1 : 0, data.time_slot || '']
  );
  saveDb();
  var count = queryOne('SELECT COUNT(*) as cnt FROM tea_records WHERE user_id = ?', [req.userId]).cnt;
  var newBadges = [];
  var allBadges = queryAll('SELECT * FROM tea_badges');
  for (var bi = 0; bi < allBadges.length; bi++) {
    var b = allBadges[bi];
    if (b.condition_type === 'records_count' && count >= b.condition_value) {
      var existing = queryOne('SELECT id FROM user_badges WHERE user_id = ? AND badge_id = ?', [req.userId, b.id]);
      if (!existing) {
        queryRun('INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)', [req.userId, b.id]);
        newBadges.push({ name: b.name, icon: b.icon, description: b.description });
      }
    }
  }
  if (newBadges.length > 0) saveDb();
  res.json({ success: true, new_badges: newBadges });
});

// 每日茶知识
app.get('/api/tea/daily-tip', function(req, res) {
  var tips = queryAll('SELECT * FROM tea_daily_tips');
  var tip = tips.length > 0 ? tips[Math.floor(Math.random() * tips.length)] : null;
  res.json(tip || {});
});

// 用户徽章
app.get('/api/tea/badges', auth, function(req, res) {
  var allBadges = queryAll('SELECT * FROM tea_badges');
  var earned = queryAll('SELECT badge_id FROM user_badges WHERE user_id = ?', [req.userId]);
  var earnedIds = {};
  for (var ei = 0; ei < earned.length; ei++) earnedIds[earned[ei].badge_id] = true;
  var result = [];
  for (var bi = 0; bi < allBadges.length; bi++) {
    var b = allBadges[bi];
    result.push({ id: b.id, name: b.name, icon: b.icon, description: b.description, condition_type: b.condition_type, condition_value: b.condition_value, earned: !!earnedIds[b.id] });
  }
  res.json(result);
});

  // 挂载在线中医问诊模块
    global.queryOne = queryOne;
    global.queryAll = queryAll;
    global.queryRun = queryRun;
    global.saveDb = saveDb;
    try {
      require('./tcm_service').setupRoutes(app, auth, requireVip);
      log.info('中医问诊模块已加载');
    } catch(e) {
      log.error('中医问诊模块初始化失败', e.message);
    }

    // 请求日志中间件

    // 挂载营养师上门服务模块
    try {
      require('./nutritionist_service').setupRoutes(app, auth);
      log.info('营养师上门服务模块已加载');
    } catch(e) {
      log.error('营养师上门服务模块初始化失败', e.message);
    }

    // 挂载服务商入驻审核模块
    try {
      require('./provider_onboarding_service').setupRoutes(app, auth);
      log.info('服务商入驻审核模块已加载');
    } catch(e) {
      log.error('服务商入驻审核模块初始化失败', e.message);
    }

    // 挂载AI智能辨体引擎
    try {
      require('./ai_constitution_engine').setupRoutes(app, auth);
      log.info('AI智能辨体引擎已加载');
    } catch(e) {
      log.error('AI智能辨体引擎初始化失败', e.message);
    }

    // 挂载用户画像与智能推荐引擎
    try {
      require('./user_profile_engine').setupRoutes(app, auth);
      log.info('用户画像与智能推荐引擎已加载');
    } catch(e) {
      log.error('用户画像与智能推荐引擎初始化失败', e.message);
    }

    // 挂载节气日历+任务打卡服务
    try {
      require('./seasonal_calendar_service').setupRoutes(app, auth);
      log.info('节气日历+任务打卡服务已加载');
    } catch(e) {
      log.error('节气日历+任务打卡服务初始化失败', e.message);
    }

    app.use(function(req, res, next) {
      var start = Date.now();
      res.on('finish', function() {
        log.info(req.method, req.originalUrl, res.statusCode, (Date.now() - start) + 'ms');
      });
      next();
    });

    // Global error handler (must be after all routes)
    app.use(function(err, req, res, next) {
      log.error('请求处理错误', err.message);
      res.status(500).json({ detail: err.message });
    });

    app.listen(PORT, '0.0.0.0', function() {
      log.info('服务已启动', { port: PORT, url: 'http://0.0.0.0:' + PORT, backupDir: BACKUP_DIR });
    });
  } catch (e) {
    log.error('启动失败', e);
    process.exit(1);
  }
}
start();
