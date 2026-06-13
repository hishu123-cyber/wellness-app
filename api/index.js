/**
 * 食术养生 API - Vercel Serverless 入口
 * 所有路由通过此文件处理
 */

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

// 数据库模块
const db = require('./db.js');

// 服务模块
const pay = require('../pay.js');

// 全局变量
let dbInitialized = false;
const SECRET = process.env.WELLNESS_SECRET || 'wellness-secret-key';

// Express 应用
const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// =============================================
// 工具函数
// =============================================

function hashPw(pw) {
  return crypto.createHash('sha256').update(pw + SECRET).digest('hex');
}

function makeToken(uid) {
  const p = JSON.stringify({ sub: uid, exp: Date.now() + 7 * 86400000 });
  return Buffer.from(p).toString('base64') + '.' + crypto.createHash('sha256').update(p + SECRET).digest('hex').slice(0, 16);
}

function verifyToken(tok) {
  try {
    const parts = tok.split('.');
    const p = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    if (crypto.createHash('sha256').update(JSON.stringify(p) + SECRET).digest('hex').slice(0, 16) !== parts[1] || p.exp < Date.now()) return null;
    return p.sub;
  } catch (e) { return null; }
}

async function auth(req, res, next) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return res.status(401).json({ detail: 'Unauthorized' });
  req.userId = verifyToken(h.slice(7));
  if (!req.userId) return res.status(401).json({ detail: 'Unauthorized' });
  next();
}

async function requireRealUser(req, res, next) {
  const u = await db.queryOneAsync('SELECT role FROM users WHERE id = ?', [req.userId]);
  if (u && u.role === 'demo') return res.status(403).json({ detail: '演示账号无法操作此功能', code: 'demo_restricted' });
  next();
}

async function requireVip(req, res, next) {
  const u = await db.queryOneAsync('SELECT * FROM users WHERE id = ?', [req.userId]);
  if (!u) return res.status(404).json({ detail: 'User not found' });
  let isVip = u.is_vip == 1;
  if (isVip && u.vip_expires && new Date(u.vip_expires) < new Date()) isVip = false;
  if (!isVip) return res.status(403).json({ detail: 'VIP membership required', code: 'vip_required' });
  next();
}

function userDict(u) {
  let isVip = u.is_vip == 1;
  const vipExp = u.vip_expires || null;
  if (isVip && vipExp && new Date(vipExp) < new Date()) isVip = false;
  return {
    id: u.id,
    username: u.username,
    nickname: u.nickname || '',
    avatar: u.avatar || '',
    gender: u.gender || '',
    birth_year: u.birth_year,
    height_cm: u.height_cm,
    weight_kg: u.weight_kg,
    constitution_type: u.constitution || '',
    is_vip: isVip,
    vip_expires: isVip ? vipExp : null
  };
}

// =============================================
// 认证路由
// =============================================

function validatePassword(pw) {
  if (!pw || pw.length < 6) return '密码至少6位';
  if (pw.length > 64) return '密码不能超过64位';
  if (/^[a-zA-Z0-9]+$/.test(pw)) return '密码需包含字母和数字以外的字符（如符号）';
  return null;
}

app.post('/api/auth/register', async (req, res) => {
  const b = req.body || {};
  if (!b.username || !b.password) return res.status(400).json({ detail: 'username and password required' });
  if (/^demo/i.test(b.username)) return res.status(403).json({ detail: '该用户名被系统保留' });
  const pwErr = validatePassword(b.password);
  if (pwErr) return res.status(400).json({ detail: pwErr });

  const existing = await db.queryOneAsync('SELECT id FROM users WHERE username = ?', [b.username]);
  if (existing) return res.status(400).json({ detail: 'Username already exists' });

  await db.queryRunAsync('INSERT INTO users (username, hashed_password, nickname, phone, role) VALUES (?, ?, ?, ?, ?)',
    [b.username, hashPw(b.password), b.nickname || b.username, b.phone || '', 'user']);
  await db.saveDbAsync();

  const user = await db.queryOneAsync('SELECT * FROM users WHERE username = ?', [b.username]);
  res.json({ access_token: makeToken(user.id), token_type: 'bearer', user: userDict(user) });
});

app.post('/api/auth/login', async (req, res) => {
  const b = req.body || {};
  if (!b.username || !b.password) return res.status(400).json({ detail: 'username and password required' });
  const user = await db.queryOneAsync('SELECT * FROM users WHERE username = ?', [b.username]);
  if (!user || user.hashed_password !== hashPw(b.password)) return res.status(401).json({ detail: 'Invalid credentials' });
  res.json({ access_token: makeToken(user.id), token_type: 'bearer', user: userDict(user) });
});

app.get('/api/auth/me', auth, async (req, res) => {
  const user = await db.queryOneAsync('SELECT * FROM users WHERE id = ?', [req.userId]);
  if (!user) return res.status(404).json({ detail: 'Not found' });
  res.json(userDict(user));
});

app.put('/api/auth/me', auth, async (req, res) => {
  const data = req.body || {};
  const sets = [];
  const vals = [];
  const fields = ['nickname', 'gender', 'birth_year', 'height_cm', 'weight_kg'];
  for (const f of fields) {
    if (data[f] !== undefined) {
      sets.push(f + ' = ?');
      vals.push(data[f]);
    }
  }
  if (sets.length) {
    vals.push(req.userId);
    await db.queryRunAsync('UPDATE users SET ' + sets.join(', ') + ' WHERE id = ?', vals);
    await db.saveDbAsync();
  }
  const user = await db.queryOneAsync('SELECT * FROM users WHERE id = ?', [req.userId]);
  res.json(userDict(user));
});

// =============================================
// 体质测评
// =============================================

app.get('/api/constitution/questions', async (req, res) => {
  const rows = await db.queryAllAsync('SELECT id, question_text, category FROM constitution_questions ORDER BY id');
  res.json(rows);
});

app.post('/api/constitution/assess', auth, async (req, res) => {
  const answers = (req.body || {}).answers;
  if (!answers) return res.status(400).json({ detail: 'answers required' });
  const questions = await db.queryAllAsync('SELECT id, category, weight FROM constitution_questions');
  const qMap = {};
  for (const q of questions) qMap[q.id] = q;
  const scores = {};
  for (const key of Object.keys(answers)) {
    const q = qMap[parseInt(key)];
    if (q) scores[q.category] = (scores[q.category] || 0) + parseInt(answers[key]) * q.weight;
  }
  const sorted = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);
  const result = sorted.length ? sorted[0] : '平和质';
  await db.queryRunAsync('INSERT INTO constitution_records (user_id, scores, result_type) VALUES (?, ?, ?)', [req.userId, JSON.stringify(scores), result]);
  await db.queryRunAsync('UPDATE users SET constitution = ? WHERE id = ?', [result, req.userId]);
  await db.saveDbAsync();
  res.json({ scores, result_type: result });
});

app.get('/api/constitution/records', auth, async (req, res) => {
  const rows = await db.queryAllAsync('SELECT id, scores, result_type, created_at FROM constitution_records WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
  for (const row of rows) row.scores = JSON.parse(row.scores);
  res.json(rows);
});

// =============================================
// 健康日记
// =============================================

app.get('/api/diary', auth, async (req, res) => {
  let sql = 'SELECT * FROM health_diaries WHERE user_id = ?';
  const params = [req.userId];
  if (req.query.start_date) { sql += ' AND record_date >= ?'; params.push(req.query.start_date); }
  if (req.query.end_date) { sql += ' AND record_date <= ?'; params.push(req.query.end_date); }
  sql += ' ORDER BY record_date DESC';
  const rows = await db.queryAllAsync(sql, params);
  res.json(rows);
});

app.get('/api/diary/today', auth, async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const row = await db.queryOneAsync('SELECT * FROM health_diaries WHERE user_id = ? AND record_date = ?', [req.userId, today]);
  res.json(row || null);
});

app.post('/api/diary', auth, async (req, res) => {
  const data = req.body || {};
  const rd = data.record_date || new Date().toISOString().slice(0, 10);
  const existing = await db.queryOneAsync('SELECT id FROM health_diaries WHERE user_id = ? AND record_date = ?', [req.userId, rd]);
  if (existing) return res.status(400).json({ detail: 'Entry exists for this date' });

  const fields = ['user_id', 'record_date'];
  const vals = [req.userId, rd];
  const diaryFields = ['sleep_hours', 'exercise_minutes', 'exercise_type', 'meal_count', 'water_glasses', 'diet_note', 'mood_score', 'note'];
  for (const f of diaryFields) {
    if (data[f] !== undefined) { fields.push(f); vals.push(data[f]); }
  }
  await db.queryRunAsync('INSERT INTO health_diaries (' + fields.join(',') + ') VALUES (' + fields.map(() => '?').join(',') + ')', vals);
  await db.saveDbAsync();
  const row = await db.queryOneAsync('SELECT * FROM health_diaries WHERE user_id = ? AND record_date = ?', [req.userId, rd]);
  res.status(201).json(row);
});

app.put('/api/diary/:id', auth, async (req, res) => {
  const existing = await db.queryOneAsync('SELECT id FROM health_diaries WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!existing) return res.status(404).json({ detail: 'Not found' });
  const data = req.body || {};
  const sets = [];
  const vals = [];
  const diaryFields = ['sleep_hours', 'exercise_minutes', 'exercise_type', 'meal_count', 'water_glasses', 'diet_note', 'mood_score', 'note'];
  for (const f of diaryFields) {
    if (data[f] !== undefined) { sets.push(f + ' = ?'); vals.push(data[f]); }
  }
  if (sets.length) {
    vals.push(req.params.id);
    await db.queryRunAsync('UPDATE health_diaries SET ' + sets.join(', ') + ' WHERE id = ?', vals);
    await db.saveDbAsync();
  }
  const row = await db.queryOneAsync('SELECT * FROM health_diaries WHERE id = ?', [req.params.id]);
  res.json(row);
});

app.delete('/api/diary/:id', auth, async (req, res) => {
  const existing = await db.queryOneAsync('SELECT id FROM health_diaries WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!existing) return res.status(404).json({ detail: 'Not found' });
  await db.queryRunAsync('DELETE FROM health_diaries WHERE id = ?', [req.params.id]);
  await db.saveDbAsync();
  res.json({ message: 'Deleted' });
});

// =============================================
// 食疗食谱
// =============================================

app.get('/api/recipes', async (req, res) => {
  let sql = 'SELECT * FROM recipes WHERE 1=1';
  const params = [];
  if (req.query.constitution) { sql += ' AND suitable_constitution LIKE ?'; params.push('%' + req.query.constitution + '%'); }
  if (req.query.season) { sql += ' AND suitable_season LIKE ?'; params.push('%' + req.query.season + '%'); }
  if (req.query.category) { sql += ' AND category = ?'; params.push(req.query.category); }
  const rows = await db.queryAllAsync(sql, params);
  res.json(rows);
});

app.get('/api/recipes/:id/image', async (req, res) => {
  const r = await db.queryOneAsync('SELECT * FROM recipes WHERE id = ?', [Number(req.params.id)]);
  if (!r) return res.status(404).json({ detail: 'Not found' });
  const cat = r.category || 'default';
  let bg = '#4CAF50', fg = '#2E7D32', emoji = '🥗';
  if (cat === '药膳汤') { bg = '#4CAF50'; fg = '#2E7D32'; emoji = '🍲'; }
  else if (cat === '粥类') { bg = '#FF9800'; fg = '#E65100'; emoji = '🥣'; }
  else if (cat === '茶饮') { bg = '#2196F3'; fg = '#1565C0'; emoji = '🍵'; }
  else if (cat === '小食') { bg = '#9C27B0'; fg = '#6A1B9A'; emoji = '🥤'; }
  const safeName = (r.name || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const safeBenefits = (r.benefits || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const cons = (r.suitable_constitution || '').replace(/&/g, '&amp;');
  let s = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">';
  s += '<defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">';
  s += '<stop offset="0%" style="stop-color:' + bg + ';stop-opacity:.15"/>';
  s += '<stop offset="100%" style="stop-color:' + fg + ';stop-opacity:.3"/>';
  s += '</linearGradient></defs><rect width="400" height="200" rx="16" fill="url(#g)"/>';
  s += '<rect x="1" y="1" width="398" height="198" rx="16" fill="none" stroke="' + bg + '" stroke-opacity=".3" stroke-width="1"/>';
  s += '<text x="40" y="70" font-size="48">' + emoji + '</text>';
  s += '<text x="40" y="115" font-family="sans-serif" font-size="22" font-weight="bold" fill="' + fg + '">' + safeName + '</text>';
  s += '<text x="40" y="145" font-family="sans-serif" font-size="14" fill="#666">' + cat + ' · ' + cons + '</text>';
  s += '<text x="40" y="170" font-family="sans-serif" font-size="12" fill="#999">' + safeBenefits + '</text></svg>';
  res.type('image/svg+xml').set('Cache-Control', 'public,max-age=86400').send(s);
});

app.get('/api/recipes/:id', async (req, res) => {
  const r = await db.queryOneAsync('SELECT * FROM recipes WHERE id = ?', [Number(req.params.id)]);
  if (!r) return res.status(404).json({ detail: 'Not found' });
  res.json(r);
});

// =============================================
// 节气
// =============================================

app.get('/api/solar-terms', async (req, res) => {
  const rows = await db.queryAllAsync('SELECT * FROM solar_terms ORDER BY date_mmdd');
  res.json(rows);
});

app.get('/api/solar-terms/current', async (req, res) => {
  const today = new Date().toISOString().slice(5, 10);
  const all = await db.queryAllAsync('SELECT * FROM solar_terms ORDER BY date_mmdd');
  for (const t of all) { if (t.date_mmdd >= today) return res.json(t); }
  res.json(all.length ? all[0] : null);
});

// =============================================
// 文章
// =============================================

app.get('/api/articles', async (req, res) => {
  let where = ' WHERE is_published = 1';
  const params = [];
  if (req.query.category) { where += ' AND category = ?'; params.push(req.query.category); }
  const totalRow = await db.queryOneAsync('SELECT count(*) as total FROM articles' + where, params);
  const total = totalRow.total;
  const page = parseInt(req.query.page) || 1;
  const size = parseInt(req.query.size) || 10;
  params.push(size, (page - 1) * size);
  const items = await db.queryAllAsync('SELECT id, title, summary, category, tags, author, cover_image, view_count, created_at FROM articles' + where + ' ORDER BY created_at DESC LIMIT ? OFFSET ?', params);
  res.json({ total, page, size, items });
});

app.get('/api/articles/:id/image', async (req, res) => {
  const a = await db.queryOneAsync('SELECT * FROM articles WHERE id = ?', [Number(req.params.id)]);
  if (!a) return res.status(404).json({ detail: 'Not found' });
  const catMap = { '中医养生': '📜', '运动养生': '🏃', '节气养生': '🌿' };
  const emoji = catMap[a.category] || '📖';
  const safeTitle = a.title.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const safeSummary = (a.summary || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  let s = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="160" viewBox="0 0 400 160">';
  s += '<defs><linearGradient id="ag" x1="0%" y1="0%" x2="100%" y2="100%">';
  s += '<stop offset="0%" style="stop-color:#2196F3;stop-opacity:0.1"/>';
  s += '<stop offset="100%" style="stop-color:#1565C0;stop-opacity:0.2"/>';
  s += '</linearGradient></defs><rect width="400" height="160" rx="12" fill="url(#ag)"/>';
  s += '<text x="30" y="60" font-size="40">' + emoji + '</text>';
  s += '<text x="30" y="100" font-family="sans-serif" font-size="18" font-weight="bold" fill="#1565C0">' + safeTitle + '</text>';
  s += '<text x="30" y="130" font-family="sans-serif" font-size="13" fill="#666">' + safeSummary + '</text></svg>';
  res.type('image/svg+xml').set('Cache-Control', 'public,max-age=86400').send(s);
});

app.get('/api/articles/:id', async (req, res) => {
  const a = await db.queryOneAsync('SELECT * FROM articles WHERE id = ?', [Number(req.params.id)]);
  if (!a) return res.status(404).json({ detail: 'Not found' });
  await db.queryRunAsync('UPDATE articles SET view_count = view_count + 1 WHERE id = ?', [Number(req.params.id)]);
  await db.saveDbAsync();
  const updated = await db.queryOneAsync('SELECT * FROM articles WHERE id = ?', [Number(req.params.id)]);
  res.json(updated);
});

// =============================================
// 体质调理方案
// =============================================

const CONSTITUTION_PLANS = {
  '气虚质': {
    title: '气虚质 49天调理方案',
    summary: '补气固本，由内而外恢复元气',
    price: 19.9,
    preview: ['每天早晨喝一杯黄芪红枣茶', '饮食宜食山药、莲子、小米等补气食物', '避免过度出汗，适合散步、太极等温和运动'],
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
  '阳虚质': { title: '阳虚质 49天调理方案', summary: '温阳散寒，改善畏寒怕冷体质', price: 19.9, preview: ['早晨晒太阳15-20分钟', '多吃韭菜、羊肉、生姜等温热食物', '避免生冷饮食和空调直吹'], full: ['【饮食调理】温补为主：当归生姜羊肉汤每周2次', '【温阳茶饮】肉桂3g + 干姜5g + 红糖适量', '【穴位按摩】艾灸关元穴、命门穴', '【运动方案】选择阳光充足时运动', '【作息调理】早睡晚起，睡前热水泡脚', '【情绪调理】多听激昂音乐', '【禁忌提示】忌食西瓜、苦瓜等寒性食物'] },
  '阴虚质': { title: '阴虚质 49天调理方案', summary: '滋阴润燥，缓解口干咽燥', price: 19.9, preview: ['多食百合、银耳、梨', '避免熬夜', '少吃辛辣'], full: ['【饮食调理】滋阴润燥', '【滋阴茶饮】麦冬10g + 玉竹10g', '【穴位按摩】按压太溪穴、涌泉穴', '【运动方案】温和运动', '【作息调理】11点前入睡', '【情绪调理】保持平和', '【禁忌提示】忌辛辣'] },
  '痰湿质': { title: '痰湿质 49天调理方案', summary: '化痰祛湿', price: 19.9, preview: ['饮食清淡', '多吃薏米、冬瓜', '坚持运动'], full: ['【饮食调理】化湿为主', '【祛湿茶饮】陈皮5g + 茯苓10g', '【穴位按摩】按揉丰隆穴', '【运动方案】中等强度运动', '【作息调理】早睡早起', '【情绪调理】心情舒畅', '【禁忌提示】忌甜食油腻'] },
  '湿热质': { title: '湿热质 49天调理方案', summary: '清热祛湿', price: 19.9, preview: ['多吃绿豆、苦瓜', '少喝酒', '保持皮肤清洁'], full: ['【饮食调理】清热利湿', '【清热茶饮】菊花5g + 金银花5g', '【穴位按摩】按揉曲池穴', '【运动方案】中高强度运动', '【作息调理】保证睡眠', '【情绪调理】避免急躁', '【禁忌提示】忌烟酒辛辣'] },
  '血瘀质': { title: '血瘀质 49天调理方案', summary: '活血化瘀', price: 19.9, preview: ['多吃山楂、黑豆', '坚持运动', '注意保暖'], full: ['【饮食调理】活血化瘀', '【活血茶饮】玫瑰花5朵 + 丹参5g', '【穴位按摩】按揉血海穴', '【运动方案】每日运动', '【作息调理】早睡早起', '【情绪调理】多听舒缓音乐', '【禁忌提示】忌寒凉'] },
  '气郁质': { title: '气郁质 49天调理方案', summary: '疏肝理气', price: 19.9, preview: ['多吃萝卜、柑橘', '多交流', '适当运动'], full: ['【饮食调理】理气解郁', '【理气茶饮】玫瑰花5朵 + 佛手5g', '【穴位按摩】按揉太冲穴', '【运动方案】团体运动', '【作息调理】规律作息', '【情绪调理】多倾诉', '【禁忌提示】少喝咖啡浓茶'] },
  '特禀质': { title: '特禀质 49天调理方案', summary: '固本培元', price: 19.9, preview: ['饮食温和', '避免过敏原', '增强抵抗力'], full: ['【饮食调理】固本培元', '【固本茶饮】黄芪10g + 白术5g', '【穴位按摩】按揉足三里', '【运动方案】温和运动起步', '【作息调理】保证睡眠', '【情绪调理】积极乐观', '【禁忌提示】远离过敏原'] },
  '平和质': { title: '平和质 49天调理方案', summary: '巩固健康', price: 19.9, preview: ['保持良好习惯', '均衡营养', '适度运动'], full: ['【饮食调理】均衡营养', '【保健茶饮】枸杞5g + 菊花3g', '【穴位按摩】按揉足三里', '【运动方案】每周5次', '【作息调理】顺应四季', '【情绪调理】平和心态', '【禁忌提示】避免暴饮暴食'] }
};

app.get('/api/constitution/plans', (req, res) => {
  const data = [];
  for (const key in CONSTITUTION_PLANS) {
    if (CONSTITUTION_PLANS.hasOwnProperty(key)) {
      const p = CONSTITUTION_PLANS[key];
      data.push({ type: key, title: p.title, summary: p.summary, price: p.price });
    }
  }
  res.json(data);
});

app.get('/api/constitution/plans/:type/preview', (req, res) => {
  const plan = CONSTITUTION_PLANS[req.params.type];
  if (!plan) return res.status(404).json({ detail: 'Not found' });
  res.json({ type: req.params.type, title: plan.title, summary: plan.summary, price: plan.price, preview: plan.preview });
});

app.get('/api/constitution/plans/:type/full', auth, async (req, res) => {
  const plan = CONSTITUTION_PLANS[req.params.type];
  if (!plan) return res.status(404).json({ detail: 'Not found' });
  const purchased = await db.queryOneAsync('SELECT id FROM plan_purchases WHERE user_id = ? AND plan_type = ? AND status = ?', [req.userId, req.params.type, 'active']);
  const user = await db.queryOneAsync('SELECT * FROM users WHERE id = ?', [req.userId]);
  let isVip = user && user.is_vip == 1;
  if (isVip && user.vip_expires && new Date(user.vip_expires) < new Date()) isVip = false;
  if (!purchased && !isVip) {
    return res.status(403).json({ detail: '请先购买该方案', code: 'purchase_required', price: plan.price });
  }
  res.json({ type: req.params.type, title: plan.title, full: plan.full });
});

app.post('/api/constitution/plans/:type/purchase', auth, requireRealUser, async (req, res) => {
  const plan = CONSTITUTION_PLANS[req.params.type];
  if (!plan) return res.status(404).json({ detail: 'Not found' });
  const existing = await db.queryOneAsync('SELECT id FROM plan_purchases WHERE user_id = ? AND plan_type = ?', [req.userId, req.params.type]);
  if (existing) return res.status(400).json({ detail: '已经购买过该方案' });
  const user = await db.queryOneAsync('SELECT * FROM users WHERE id = ?', [req.userId]);
  let isVip = user && user.is_vip == 1;
  if (isVip && user.vip_expires && new Date(user.vip_expires) < new Date()) isVip = false;
  await db.queryRunAsync('INSERT INTO plan_purchases (user_id, plan_type, status, price, purchased_at) VALUES (?, ?, ?, ?, ?)', [req.userId, req.params.type, 'active', isVip ? 0 : plan.price, new Date().toISOString()]);
  await db.saveDbAsync();
  res.json({ success: true, type: req.params.type, title: plan.title, is_vip_free: isVip });
});

// =============================================
// 积分系统
// =============================================

async function getUserPoints(userId) {
  const row = await db.queryOneAsync('SELECT COALESCE(SUM(points), 0) as total FROM points_log WHERE user_id = ?', [userId]);
  return row ? row.total : 0;
}

async function addPoints(userId, points, action, note) {
  await db.queryRunAsync('INSERT INTO points_log (user_id, points, action, note) VALUES (?, ?, ?, ?)', [userId, points, action, note || '']);
  await db.saveDbAsync();
}

app.get('/api/points/status', auth, async (req, res) => {
  const total = await getUserPoints(req.userId);
  const today = new Date().toISOString().slice(0, 10);
  const todayCheckin = await db.queryOneAsync('SELECT id, consecutive_days, points_earned FROM checkins WHERE user_id = ? AND checkin_date = ?', [req.userId, today]);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const yesterdayCheckin = await db.queryOneAsync('SELECT id, consecutive_days FROM checkins WHERE user_id = ? AND checkin_date = ?', [req.userId, yesterdayStr]);
  res.json({
    total_points: total,
    checked_in_today: !!todayCheckin,
    consecutive_days: todayCheckin ? todayCheckin.consecutive_days : (yesterdayCheckin ? yesterdayCheckin.consecutive_days : 0),
    today_earned: todayCheckin ? todayCheckin.points_earned : 0
  });
});

app.get('/api/points/log', auth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const size = parseInt(req.query.size) || 20;
  const totalRow = await db.queryOneAsync('SELECT COUNT(*) as total FROM points_log WHERE user_id = ?', [req.userId]);
  const total = totalRow.total;
  const rows = await db.queryAllAsync('SELECT points, action, note, created_at FROM points_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', [req.userId, size, (page - 1) * size]);
  res.json({ total, page, size, items: rows });
});

app.post('/api/points/checkin', auth, async (req, res) => {
  const uid = req.userId;
  const today = new Date().toISOString().slice(0, 10);
  const existing = await db.queryOneAsync('SELECT id FROM checkins WHERE user_id = ? AND checkin_date = ?', [uid, today]);
  if (existing) return res.status(400).json({ detail: '今天已签到' });

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const yesterdayCheckin = await db.queryOneAsync('SELECT consecutive_days FROM checkins WHERE user_id = ? AND checkin_date = ?', [uid, yesterdayStr]);
  const consecutive = yesterdayCheckin ? yesterdayCheckin.consecutive_days + 1 : 1;

  let points = 5;
  if (consecutive === 3) points = 10;
  else if (consecutive === 7) points = 20;
  else if (consecutive === 30) points = 50;
  else if (consecutive % 7 === 0) points = 15;

  await db.queryRunAsync('INSERT INTO checkins (user_id, checkin_date, consecutive_days, points_earned) VALUES (?, ?, ?, ?)', [uid, today, consecutive, points]);
  await addPoints(uid, points, 'checkin', '签到奖励（连续' + consecutive + '天）');
  res.json({ success: true, points_earned: points, consecutive_days: consecutive, total_points: await getUserPoints(uid) });
});

// =============================================
// VIP
// =============================================

app.get('/api/vip/status', auth, async (req, res) => {
  const u = await db.queryOneAsync('SELECT * FROM users WHERE id = ?', [req.userId]);
  if (!u) return res.status(404).json({ detail: 'Not found' });
  let isVip = u.is_vip == 1;
  const vipExp = u.vip_expires || null;
  if (isVip && vipExp && new Date(vipExp) < new Date()) isVip = false;
  res.json({
    is_vip: isVip,
    vip_expires: vipExp,
    orders: u.vip_orders || 0,
    plans: [
      { id: 'monthly', name: '月度会员', price: 19.9, duration_days: 30, badge: '🔥' },
      { id: 'quarterly', name: '季度会员', price: 49.9, duration_days: 90, badge: '💎', popular: true },
      { id: 'yearly', name: '年度会员', price: 168, duration_days: 365, badge: '👑', tag: '省¥71' }
    ]
  });
});

app.post('/api/vip/purchase', auth, requireRealUser, async (req, res) => {
  const plan = (req.body || {}).plan_id || 'monthly';
  const plans = { monthly: 30, quarterly: 90, yearly: 365 };
  const days = plans[plan] || 30;
  const prices = { monthly: 19.9, quarterly: 49.9, yearly: 168 };
  const now = new Date();
  const u = await db.queryOneAsync('SELECT * FROM users WHERE id = ?', [req.userId]);
  const currentExp = (u.is_vip == 1 && u.vip_expires && new Date(u.vip_expires) > now) ? new Date(u.vip_expires) : now;
  currentExp.setDate(currentExp.getDate() + days);
  const expStr = currentExp.toISOString().slice(0, 10);
  await db.queryRunAsync('UPDATE users SET is_vip = 1, vip_expires = ?, vip_orders = vip_orders + 1 WHERE id = ?', [expStr, req.userId]);
  await db.saveDbAsync();
  res.json({ success: true, is_vip: true, vip_expires: expStr, order: { plan, price: prices[plan], days } });
});

// =============================================
// 支付
// =============================================

app.post('/api/pay/create', auth, requireRealUser, async (req, res) => {
  try {
    const planId = (req.body || {}).plan_id || 'monthly';
    const plans = { monthly: { name: '月度会员', price: 1990, days: 30 }, quarterly: { name: '季度会员', price: 4990, days: 90 }, yearly: { name: '年度会员', price: 16800, days: 365 } };
    const plan = plans[planId];
    if (!plan) return res.status(400).json({ detail: 'Invalid plan' });

    const user = await db.queryOneAsync('SELECT * FROM users WHERE id = ?', [req.userId]);
    const openId = user.wx_openid || 'mock-open-id';
    const outTradeNo = pay.generateOrderNo();
    const result = await pay.unifiedOrder({
      openId,
      description: '体质养生·大健康 - ' + plan.name,
      total: plan.price,
      outTradeNo,
      notifyUrl: req.headers.origin + '/api/pay/notify',
    });

    await db.queryRunAsync('INSERT INTO pay_orders (user_id, out_trade_no, plan_id, amount, status) VALUES (?, ?, ?, ?, ?)', [req.userId, outTradeNo, planId, plan.price, 'pending']);
    await db.saveDbAsync();

    if (pay.CONFIG.mchId) {
      res.json({ order_no: outTradeNo, pay_params: result.payParams });
    } else {
      res.json({ order_no: outTradeNo, mock: true, message: '当前为模拟模式' });
    }
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

app.post('/api/pay/mock-complete', auth, requireRealUser, async (req, res) => {
  const orderNo = (req.body || {}).order_no;
  if (!orderNo) return res.status(400).json({ detail: 'order_no required' });
  const order = await db.queryOneAsync('SELECT * FROM pay_orders WHERE out_trade_no = ? AND user_id = ?', [orderNo, req.userId]);
  if (!order) return res.status(404).json({ detail: 'Order not found' });
  if (order.status !== 'pending') return res.json({ detail: 'Order already processed' });

  const plans = { monthly: 30, quarterly: 90, yearly: 365 };
  const days = plans[order.plan_id] || 30;
  const now = new Date();
  const u = await db.queryOneAsync('SELECT * FROM users WHERE id = ?', [req.userId]);
  const currentExp = (u.is_vip == 1 && u.vip_expires && new Date(u.vip_expires) > now) ? new Date(u.vip_expires) : now;
  currentExp.setDate(currentExp.getDate() + days);
  const expStr = currentExp.toISOString().slice(0, 10);

  await db.queryRunAsync('UPDATE pay_orders SET status = ?, paid_at = ? WHERE out_trade_no = ?', ['paid', new Date().toISOString(), orderNo]);
  await db.queryRunAsync('UPDATE users SET is_vip = 1, vip_expires = ?, vip_orders = vip_orders + 1 WHERE id = ?', [expStr, req.userId]);
  await db.saveDbAsync();

  res.json({ success: true, is_vip: true, vip_expires: expStr, plan: order.plan_id });
});

app.post('/api/pay/notify', async (req, res) => {
  const result = pay.verifyNotify(req.headers, JSON.stringify(req.body));
  if (!result) return res.status(401).json({ code: 'FAIL', message: '签名验证失败' });

  const orderNo = result.out_trade_no;
  const order = await db.queryOneAsync('SELECT * FROM pay_orders WHERE out_trade_no = ?', [orderNo]);
  if (order && order.status === 'pending') {
    const plans = { monthly: 30, quarterly: 90, yearly: 365 };
    const days = plans[order.plan_id] || 30;
    const now = new Date();
    const u = await db.queryOneAsync('SELECT * FROM users WHERE id = ?', [order.user_id]);
    const currentExp = (u.is_vip == 1 && u.vip_expires && new Date(u.vip_expires) > now) ? new Date(u.vip_expires) : now;
    currentExp.setDate(currentExp.getDate() + days);
    const expStr = currentExp.toISOString().slice(0, 10);

    await db.queryRunAsync('UPDATE pay_orders SET status = ?, paid_at = ? WHERE out_trade_no = ?', ['paid', new Date().toISOString(), orderNo]);
    await db.queryRunAsync('UPDATE users SET is_vip = 1, vip_expires = ?, vip_orders = vip_orders + 1 WHERE id = ?', [expStr, order.user_id]);
    await db.saveDbAsync();
  }
  res.json({ code: 'SUCCESS', message: '成功' });
});

app.get('/api/pay/order/:orderNo', auth, async (req, res) => {
  const order = await db.queryOneAsync('SELECT * FROM pay_orders WHERE out_trade_no = ? AND user_id = ?', [req.params.orderNo, req.userId]);
  if (!order) return res.status(404).json({ detail: 'Not found' });
  res.json(order);
});

// =============================================
// 商城
// =============================================

app.get('/api/shop/categories', async (req, res) => {
  const rows = await db.queryAllAsync('SELECT DISTINCT category FROM shop_products WHERE is_active = 1 ORDER BY category');
  const cats = rows.map(r => r.category);
  res.json(['全部'].concat(cats));
});

app.get('/api/shop/products', async (req, res) => {
  let sql = 'SELECT * FROM shop_products WHERE is_active = 1';
  const params = [];
  if (req.query.category && req.query.category !== '全部') { sql += ' AND category = ?'; params.push(req.query.category); }
  if (req.query.constitution) { sql += ' AND tags LIKE ?'; params.push('%' + req.query.constitution + '%'); }
  sql += ' ORDER BY sales_count DESC';
  const rows = await db.queryAllAsync(sql, params);
  res.json(rows);
});

app.get('/api/shop/products/:id', async (req, res) => {
  const p = await db.queryOneAsync('SELECT * FROM shop_products WHERE id = ?', [Number(req.params.id)]);
  if (!p) return res.status(404).json({ detail: 'Not found' });
  res.json(p);
});

app.get('/api/shop/cart', auth, async (req, res) => {
  const rows = await db.queryAllAsync('SELECT c.id, c.quantity, p.* FROM shop_cart c JOIN shop_products p ON c.product_id = p.id WHERE c.user_id = ?', [req.userId]);
  res.json(rows);
});

app.post('/api/shop/cart/add', auth, async (req, res) => {
  const pid = (req.body || {}).product_id;
  const qty = (req.body || {}).quantity || 1;
  if (!pid) return res.status(400).json({ detail: 'product_id required' });
  const existing = await db.queryOneAsync('SELECT id, quantity FROM shop_cart WHERE user_id = ? AND product_id = ?', [req.userId, pid]);
  if (existing) {
    await db.queryRunAsync('UPDATE shop_cart SET quantity = ? WHERE id = ?', [existing.quantity + qty, existing.id]);
  } else {
    await db.queryRunAsync('INSERT INTO shop_cart (user_id, product_id, quantity) VALUES (?, ?, ?)', [req.userId, pid, qty]);
  }
  await db.saveDbAsync();
  res.json({ success: true });
});

app.post('/api/shop/cart/update', auth, async (req, res) => {
  const id = (req.body || {}).id;
  const qty = (req.body || {}).quantity;
  if (!id) return res.status(400).json({ detail: 'id required' });
  if (qty <= 0) { await db.queryRunAsync('DELETE FROM shop_cart WHERE id = ? AND user_id = ?', [id, req.userId]); }
  else { await db.queryRunAsync('UPDATE shop_cart SET quantity = ? WHERE id = ? AND user_id = ?', [qty, id, req.userId]); }
  await db.saveDbAsync();
  res.json({ success: true });
});

app.post('/api/shop/cart/remove', auth, async (req, res) => {
  const id = (req.body || {}).id;
  if (!id) return res.status(400).json({ detail: 'id required' });
  await db.queryRunAsync('DELETE FROM shop_cart WHERE id = ? AND user_id = ?', [id, req.userId]);
  await db.saveDbAsync();
  res.json({ success: true });
});

app.post('/api/shop/orders/create', auth, requireRealUser, async (req, res) => {
  const data = req.body || {};
  if (!data.items || !data.items.length) return res.status(400).json({ detail: 'items required' });
  const orderNo = 'ORD' + Date.now() + '' + Math.floor(Math.random() * 1000);
  let total = 0;
  for (const item of data.items) {
    const prod = await db.queryOneAsync('SELECT * FROM shop_products WHERE id = ?', [item.product_id]);
    if (!prod) continue;
    total += prod.price * (item.quantity || 1);
  }
  await db.queryRunAsync('INSERT INTO shop_orders (user_id, order_no, total_amount, consignee, phone, address, remark) VALUES (?, ?, ?, ?, ?, ?, ?)', [req.userId, orderNo, total, data.consignee || '', data.phone || '', data.address || '', data.remark || '']);
  const orderIdRow = await db.queryOneAsync('SELECT last_insert_rowid() as id');
  const orderId = orderIdRow.id;
  for (const item of data.items) {
    const prod = await db.queryOneAsync('SELECT * FROM shop_products WHERE id = ?', [item.product_id]);
    if (!prod) continue;
    await db.queryRunAsync('INSERT INTO shop_order_items (order_id, product_id, product_name, price, quantity) VALUES (?, ?, ?, ?, ?)', [orderId, item.product_id, prod.name, prod.price, item.quantity || 1]);
    await db.queryRunAsync('UPDATE shop_products SET sales_count = sales_count + ? WHERE id = ?', [item.quantity || 1, item.product_id]);
  }
  await db.saveDbAsync();
  res.json({ success: true, order_id: orderId, order_no: orderNo, total_amount: total });
});

app.get('/api/shop/orders', auth, async (req, res) => {
  const orders = await db.queryAllAsync('SELECT * FROM shop_orders WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
  for (const order of orders) {
    order.items = await db.queryAllAsync('SELECT * FROM shop_order_items WHERE order_id = ?', [order.id]);
  }
  res.json(orders);
});

// =============================================
// 厨师服务
// =============================================

app.get('/api/chefs', async (req, res) => {
  let sql = 'SELECT * FROM chef_services WHERE is_active = 1';
  const params = [];
  if (req.query.constitution) { sql += ' AND suitable_constitution LIKE ?'; params.push('%' + req.query.constitution + '%'); }
  sql += ' ORDER BY order_count DESC';
  const rows = await db.queryAllAsync(sql, params);
  res.json(rows);
});

app.get('/api/chefs/:id', async (req, res) => {
  const chef = await db.queryOneAsync('SELECT * FROM chef_services WHERE id = ?', [Number(req.params.id)]);
  if (!chef) return res.status(404).json({ detail: 'Not found' });
  res.json(chef);
});

app.post('/api/chefs/book', auth, requireRealUser, async (req, res) => {
  const data = req.body || {};
  if (!data.chef_id || !data.service_date) return res.status(400).json({ detail: 'chef_id and service_date required' });
  const chef = await db.queryOneAsync('SELECT * FROM chef_services WHERE id = ?', [data.chef_id]);
  if (!chef) return res.status(404).json({ detail: 'Chef not found' });
  await db.queryRunAsync('INSERT INTO chef_bookings (user_id, chef_id, service_date, service_time, address, phone, note, menu_requirements, total_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [req.userId, data.chef_id, data.service_date, data.service_time || '', data.address || '', data.phone || '', data.note || '', data.menu_requirements || '', chef.price]);
  await db.saveDbAsync();
  res.json({ success: true, message: '预约成功！' });
});

app.get('/api/chefs/bookings', auth, async (req, res) => {
  const rows = await db.queryAllAsync('SELECT b.*, c.name as chef_name, c.title as chef_title, c.score as chef_score FROM chef_bookings b JOIN chef_services c ON b.chef_id = c.id WHERE b.user_id = ? ORDER BY b.created_at DESC', [req.userId]);
  res.json(rows);
});

// =============================================
// 健康报告
// =============================================

app.get('/api/vip/weekly-report', auth, requireVip, async (req, res) => {
  const entries = await db.queryAllAsync('SELECT * FROM health_diaries WHERE user_id = ? ORDER BY record_date DESC LIMIT 7', [req.userId]);
  const u = await db.queryOneAsync('SELECT * FROM users WHERE id = ?', [req.userId]);
  const name = u.nickname || u.username;

  const dailyData = entries.map(e => {
    let s = 0;
    if (e.sleep_hours) s += Math.min(30, (e.sleep_hours >= 7 && e.sleep_hours <= 8) ? 30 : e.sleep_hours >= 6 ? 20 : 10);
    if (e.exercise_minutes) s += Math.min(25, e.exercise_minutes >= 30 ? 25 : e.exercise_minutes >= 15 ? 15 : 10);
    if (e.meal_count) s += e.meal_count == 3 ? 15 : e.meal_count >= 2 ? 10 : 5;
    if (e.water_glasses) s += Math.min(20, e.water_glasses >= 8 ? 20 : e.water_glasses >= 5 ? 15 : 8);
    if (e.mood_score) s += e.mood_score >= 7 ? 10 : e.mood_score >= 4 ? 6 : 2;
    return { date: e.record_date, score: Math.min(100, s), mood: e.mood_score || '-', sleep: e.sleep_hours || 0, exercise: e.exercise_minutes || 0 };
  });

  const avgScore = dailyData.length ? Math.round(dailyData.reduce((a, b) => a + b.score, 0) / dailyData.length) : 0;

  let html = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>健康周报</title>';
  html += '<style>body{font-family:sans-serif;padding:40px;color:#333;max-width:600px;margin:0 auto}h1{color:#4CAF50;border-bottom:2px solid #4CAF50;padding-bottom:10px}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{padding:8px 12px;text-align:center;border:1px solid #ddd}th{background:#4CAF50;color:#fff}.score{font-size:48px;font-weight:bold;color:#4CAF50;text-align:center;padding:20px}</style></head><body>';
  html += '<h1>' + name + ' 的健康周报</h1>';
  html += '<div class="score">' + avgScore + '<span style="font-size:16px;color:#666;display:block">平均健康分</span></div>';
  html += '<table><tr><th>日期</th><th>健康分</th><th>心情</th><th>睡眠</th><th>运动</th></tr>';
  for (const s of dailyData) {
    html += '<tr><td>' + s.date + '</td><td><strong>' + s.score + '</strong></td><td>' + s.mood + '</td><td>' + s.sleep + 'h</td><td>' + s.exercise + 'min</td></tr>';
  }
  html += '</table></body></html>';
  res.type('text/html; charset=utf-8').send(html);
});

app.get('/api/health/report/weekly', auth, requireVip, async (req, res) => {
  const entries = await db.queryAllAsync('SELECT * FROM health_diaries WHERE user_id = ? ORDER BY record_date DESC LIMIT 7', [req.userId]);
  const u = await db.queryOneAsync('SELECT * FROM users WHERE id = ?', [req.userId]);
  const name = u.nickname || u.username;

  if (entries.length === 0) return res.status(404).json({ detail: 'No diary entries found' });

  const dailyData = entries.map(e => {
    let s = 0;
    if (e.sleep_hours) s += Math.min(30, (e.sleep_hours >= 7 && e.sleep_hours <= 8) ? 30 : e.sleep_hours >= 6 ? 20 : 10);
    if (e.exercise_minutes) s += Math.min(25, e.exercise_minutes >= 30 ? 25 : e.exercise_minutes >= 15 ? 15 : 10);
    if (e.meal_count) s += e.meal_count == 3 ? 15 : e.meal_count >= 2 ? 10 : 5;
    if (e.water_glasses) s += Math.min(20, e.water_glasses >= 8 ? 20 : e.water_glasses >= 5 ? 15 : 8);
    if (e.mood_score) s += e.mood_score >= 7 ? 10 : e.mood_score >= 4 ? 6 : 2;
    return { date: e.record_date, score: Math.min(100, s), mood: e.mood_score || '-', sleep: e.sleep_hours || 0, exercise: e.exercise_minutes || 0 };
  });

  const avgScore = dailyData.length ? Math.round(dailyData.reduce((a, b) => a + b.score, 0) / dailyData.length) : 0;
  const suggestions = avgScore >= 80 ? ['整体状态优秀！'] : avgScore >= 60 ? ['状态不错，继续改善睡眠和运动'] : ['需要加强健康管理'];

  res.json({ user_name: name, avg_score: avgScore, daily_data: dailyData, suggestions });
});

// =============================================
// 健康检查
// =============================================

app.get('/api/health', async (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString(), db_type: db.getDbType() });
});

// =============================================
// 挂载其他服务模块
// =============================================

// 全局暴露数据库函数给服务模块
// 注意：服务模块使用同步调用，仅支持内存/sql.js模式
// 如果使用 Turso，服务模块需要改为异步调用
if (db.getDbType() === 'memory') {
  global.queryOne = db.queryOne;
  global.queryAll = db.queryAll;
  global.queryRun = db.queryRun;
  global.saveDb = db.saveDb;
} else {
  // Turso 模式：提供异步包装器（服务模块需要 async/await）
  global.queryOne = async function() { return db.queryOneAsync.apply(db, arguments); };
  global.queryAll = async function() { return db.queryAllAsync.apply(db, arguments); };
  global.queryRun = async function() { return db.queryRunAsync.apply(db, arguments); };
  global.saveDb = async function() { return db.saveDbAsync(); };
}

// TCM 中医问诊
try {
  require('../tcm_service').setupRoutes(app, auth, requireVip);
} catch (e) { console.error('[TCM] 加载失败:', e.message); }

// 营养师
try {
  require('../nutritionist_service').setupRoutes(app, auth);
} catch (e) { console.error('[Nutritionist] 加载失败:', e.message); }

// 服务商入驻
try {
  require('../provider_onboarding_service').setupRoutes(app, auth);
} catch (e) { console.error('[Provider] 加载失败:', e.message); }

// AI 辨体
try {
  require('../ai_constitution_engine').setupRoutes(app, auth);
} catch (e) { console.error('[AI Constitution] 加载失败:', e.message); }

// 用户画像
try {
  require('../user_profile_engine').setupRoutes(app, auth);
} catch (e) { console.error('[User Profile] 加载失败:', e.message); }

// 节气日历
try {
  require('../seasonal_calendar_service').setupRoutes(app, auth);
} catch (e) { console.error('[Seasonal Calendar] 加载失败:', e.message); }

// AI 服务
try {
  require('../ai_service').setupRoutes(app, auth, requireVip);
} catch (e) { console.error('[AI Service] 加载失败:', e.message); }

// 茶养
try {
  require('../tea_service').setupTeaRoutes(app, auth);
} catch (e) { console.error('[Tea] 加载失败:', e.message); }

// =============================================
// 错误处理
// =============================================

app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ detail: err.message });
});

// =============================================
// Vercel Serverless Handler
// =============================================

module.exports = async (req, res) => {
  // 初始化数据库（每次请求都检查）
  if (!dbInitialized) {
    await db.initDatabase();
    dbInitialized = true;
  }

  // 处理请求
  return app(req, res);
};
