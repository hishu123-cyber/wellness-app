/**
 * 在线中医问诊服务模块 TCM Service
 * 提供：中医师展示、在线挂号、图文问诊、处方管理、问诊记录
 * 
 * 挂载方式：在 server.js 末尾添加
 *   require('./tcm_service').setupRoutes(app, auth, requireVip);
 * 
 * 数据库迁移：需在 seed-db.js 的 CREATE TABLE 部分添加本文件中的表
 */

// =============================================
// 数据库表（需在 server.js 的 startup 中添加）
// =============================================
/*
CREATE TABLE IF NOT EXISTS tcm_doctors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  title TEXT,
  hospital TEXT,
  specialty TEXT,          -- 擅长领域，逗号分隔
  introduction TEXT,       -- 简介
  avatar TEXT,
  rating REAL DEFAULT 5.0,
  consultation_count INTEGER DEFAULT 0,
  price_online REAL DEFAULT 99,    -- 图文咨询价格
  price_video REAL DEFAULT 199,     -- 视频问诊价格
  available INTEGER DEFAULT 1,     -- 是否在线
  certification TEXT,      -- 资质认证信息
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tcm_consultations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  doctor_id INTEGER NOT NULL,
  type TEXT DEFAULT 'text',        -- text(图文) | video(视频)
  status TEXT DEFAULT 'pending',   -- pending(待接诊) | active(问诊中) | completed(已完成) | cancelled(已取消)
  symptoms TEXT,                    -- 症状描述
  constitution TEXT,                -- 用户体质（问诊时快照）
  price REAL DEFAULT 0,
  doctor_notes TEXT,                -- 医生备注
  prescription_id INTEGER,         -- 关联处方
  rating INTEGER,                   -- 用户评分 1-5
  review TEXT,                      -- 用户评价
  created_at TEXT DEFAULT (datetime('now')),
  accepted_at TEXT,                 -- 医生接诊时间
  completed_at TEXT                 -- 完成时间
);

CREATE TABLE IF NOT EXISTS tcm_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consultation_id INTEGER NOT NULL,
  sender_type TEXT NOT NULL,        -- user(用户) | doctor(医生) | system(系统)
  sender_id INTEGER,               -- 发送者用户ID或医生ID
  content TEXT NOT NULL,
  msg_type TEXT DEFAULT 'text',    -- text(文字) | image(图片) | voice(语音) | system(系统消息)
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tcm_prescriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consultation_id INTEGER NOT NULL,
  doctor_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  diagnosis TEXT,                   -- 诊断结论
  prescription_text TEXT,          -- 处方内容（JSON格式，含药材列表）
  decoction_method TEXT,           -- 煎服方法
  dosage TEXT,                     -- 用法用量
  precautions TEXT,                -- 注意事项
  days INTEGER DEFAULT 7,          -- 建议服用天数
  status TEXT DEFAULT 'active',    -- active | completed
  created_at TEXT DEFAULT (datetime('now'))
);
*/

// =============================================
// 模块代码
// =============================================

function setupRoutes(app, auth, requireVip) {
  var gQ = global.queryOne;
  var gA = global.queryAll;
  var gR = global.queryRun;
  var sDb = global.saveDb;

  // ── 1. 获取中医师列表 ──
  app.get('/api/tcm/doctors', function(req, res) {
    var sql = 'SELECT id, name, title, hospital, specialty, introduction, avatar, rating, consultation_count, price_online, price_video, available, certification FROM tcm_doctors WHERE 1=1';
    var params = [];
    
    if (req.query.specialty) {
      sql += ' AND specialty LIKE ?';
      params.push('%' + req.query.specialty + '%');
    }
    if (req.query.available !== undefined) {
      sql += ' AND available = ?';
      params.push(Number(req.query.available));
    }
    
    sql += ' ORDER BY rating DESC, consultation_count DESC';
    res.json(gA(sql, params));
  });

  // ── 2. 获取中医师详情 ──
  app.get('/api/tcm/doctors/:id', function(req, res) {
    var doctor = gQ('SELECT * FROM tcm_doctors WHERE id = ?', [Number(req.params.id)]);
    if (!doctor) return res.status(404).json({ detail: '医生未找到' });
    res.json(doctor);
  });

  // ── 3. 创建问诊（挂号） ──
  app.post('/api/tcm/consultations', auth, function(req, res) {
    var data = req.body || {};
    if (!data.doctor_id) return res.status(400).json({ detail: '请选择医生' });
    
    var doctor = gQ('SELECT * FROM tcm_doctors WHERE id = ?', [data.doctor_id]);
    if (!doctor) return res.status(404).json({ detail: '医生未找到' });
    if (!doctor.available) return res.status(400).json({ detail: '该医生当前不在线' });
    
    var consultType = data.type || 'text';
    var price = consultType === 'video' ? doctor.price_video : doctor.price_online;
    
    // 获取用户当前体质
    var user = gQ('SELECT constitution, nickname FROM users WHERE id = ?', [req.userId]);
    
    gR('INSERT INTO tcm_consultations (user_id, doctor_id, type, status, symptoms, constitution, price) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.userId, data.doctor_id, consultType, 'pending', data.symptoms || '', user ? (user.constitution || '') : '', price]);
    sDb();
    
    var consult = gQ('SELECT * FROM tcm_consultations WHERE id = (SELECT last_insert_rowid())');
    if (!consult) consult = gQ('SELECT * FROM tcm_consultations ORDER BY id DESC LIMIT 1');
    res.json(consult || {});
    
    // ── 模拟自动接诊 + 自动回复（演示用） ──
    setTimeout(function(){
      var c = gQ("SELECT * FROM tcm_consultations WHERE id = ?", [consult.id]);
      if (c && c.status === "pending") {
        gR("UPDATE tcm_consultations SET status = 'active', accepted_at = datetime('now') WHERE id = ?", [consult.id]);
        gR("INSERT INTO tcm_messages (consultation_id, sender_type, content, msg_type) VALUES (?, 'system', ?, 'system')",
          [consult.id, "医生已接诊，请描述您的症状"]);
        sDb();
        
        // 模拟医生首次回复
        var replies = [
          "您好，我是" + (doctor.name || "中医师") + "。请详细描述您的主要症状，包括持续时间、发作规律等。",
          "感谢您的信任。我已收到您的问诊请求。请问这种情况持续多久了？",
          "您好，已接诊。请告诉我您最不舒服的症状是什么？",
          "您好，我是" + (doctor.name || "中医师") + "。请先描述一下您的基本情况，我会为您辩证分析。"
        ];
        var reply = replies[Math.floor(Math.random() * replies.length)];
        
        setTimeout(function(){
          gR("INSERT INTO tcm_messages (consultation_id, sender_type, sender_id, content, msg_type) VALUES (?, 'doctor', ?, ?, 'text')",
            [consult.id, doctor.id, reply]);
          sDb();
          
          // 第二次回复 - 针对体质
          if (user && user.constitution) {
            setTimeout(function(){
              var conTips = {
                '气虚质': "从您描述的体质来看，气虚质主要表现为气力不足、容易疲劳。建议日常食用黄芿、党参、山药等补气食材。",
                '阳虚质': "您属于阳虚体质，注意保暖避寒，可适当食用生姜、羊肉、韭菜等温阳食物。",
                '阴虚质': "阴虚体质宜滋阴润燥，建议多吃百合、银耳、鸭肉等，避免辛辣燥热之品。",
                '痰湿质': "痰湿体质需健脾去湿，建议食用蘿米、赤小豆、冬瓜等，配合适量运动。",
                '湿热质': "湿热体质宜清热利湿，绿豆、冬瓜、苦瓜都是不错的选择，忌烟酒。",
                '血癖质': "血癖体质宜活血化癖，建议山槐、玫瑰花茶、黑豆等，保持心情舒畅。",
                '气郁质': "气郁体质重在疏肝理气，玫瑰花茶、佛手、柑橘类水果都对您有益。",
                '特质质': "特质体质需注意增强免疫力，建议食用黄芿、白术、防风等。",
                '平和质': "平和质是理想的健康状态，继续保持良好的作息和饮食习惯即可。"
              };
              var tip = conTips[user.constitution] || "我已了解您的情况，接下来会为您详细分析。";
              gR("INSERT INTO tcm_messages (consultation_id, sender_type, sender_id, content, msg_type) VALUES (?, 'doctor', ?, ?, 'text')",
                [consult.id, doctor.id, tip]);
              sDb();
            }, 3000);
          }
        }, 2000);
      }
    }, 1500);

  });

  // ── 4. 获取我的问诊列表 ──
  app.get('/api/tcm/consultations', auth, function(req, res) {
    var status = req.query.status || '';
    var sql = 'SELECT c.*, d.name as doctor_name, d.title as doctor_title, d.avatar as doctor_avatar FROM tcm_consultations c LEFT JOIN tcm_doctors d ON c.doctor_id = d.id WHERE c.user_id = ?';
    var params = [req.userId];
    
    if (status) {
      sql += ' AND c.status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY c.created_at DESC';
    res.json(gA(sql, params));
  });

  // ── 5. 医生接诊 ──
  app.post('/api/tcm/consultations/:id/accept', function(req, res) {
    var consult = gQ('SELECT * FROM tcm_consultations WHERE id = ?', [Number(req.params.id)]);
    if (!consult) return res.status(404).json({ detail: '问诊记录未找到' });
    if (consult.status !== 'pending') return res.status(400).json({ detail: '该问诊已处理' });
    
    gR("UPDATE tcm_consultations SET status = 'active', accepted_at = datetime('now') WHERE id = ?", [consult.id]);
    sDb();
    
    // 发送系统消息
    gR("INSERT INTO tcm_messages (consultation_id, sender_type, content, msg_type) VALUES (?, 'system', ?, 'system')",
      [consult.id, '医生已接诊，您可以开始描述病情了']);
    sDb();
    
    res.json({ detail: '接诊成功' });
  });

  // ── 6. 发送消息 ──
  app.post('/api/tcm/messages', auth, function(req, res) {
    var data = req.body || {};
    if (!data.consultation_id || !data.content) return res.status(400).json({ detail: '参数不完整' });
    
    var consult = gQ('SELECT * FROM tcm_consultations WHERE id = ? AND user_id = ?', [data.consultation_id, req.userId]);
    if (!consult) return res.status(404).json({ detail: '问诊记录未找到' });
    if (consult.status !== 'active') return res.status(400).json({ detail: '问诊已结束或未开始' });
    
    gR("INSERT INTO tcm_messages (consultation_id, sender_type, sender_id, content, msg_type) VALUES (?, 'user', ?, ?, ?)",
      [data.consultation_id, req.userId, data.content, data.msg_type || 'text']);
    sDb();
    
    var msg = gQ('SELECT * FROM tcm_messages WHERE id = (SELECT last_insert_rowid())');
    res.json(msg);
  });

  // ── 7. 获取消息记录 ──
  app.get('/api/tcm/messages/:consultationId', auth, function(req, res) {
    var consult = gQ('SELECT * FROM tcm_consultations WHERE id = ? AND user_id = ?', [Number(req.params.consultationId), req.userId]);
    if (!consult) return res.status(404).json({ detail: '问诊记录未找到' });
    
    var msgs = gA('SELECT * FROM tcm_messages WHERE consultation_id = ? ORDER BY created_at ASC', [Number(req.params.consultationId)]);
    res.json(msgs);
  });

  // ── 8. 完成问诊 ──
  app.post('/api/tcm/consultations/:id/complete', auth, function(req, res) {
    var consult = gQ('SELECT * FROM tcm_consultations WHERE id = ? AND user_id = ?', [Number(req.params.id), req.userId]);
    if (!consult) return res.status(404).json({ detail: '问诊记录未找到' });
    if (consult.status !== 'active') return res.status(400).json({ detail: '问诊状态不正确' });
    
    gR("UPDATE tcm_consultations SET status = 'completed', completed_at = datetime('now') WHERE id = ?", [consult.id]);
    sDb();
    
    // 增加医生问诊计数
    gR('UPDATE tcm_doctors SET consultation_count = consultation_count + 1 WHERE id = ?', [consult.doctor_id]);
    sDb();
    
    // 发送系统消息
    gR("INSERT INTO tcm_messages (consultation_id, sender_type, content, msg_type) VALUES (?, 'system', '问诊已结束。如有需要可再次挂号咨询。', 'system')",
      [consult.id]);
    sDb();
    
    res.json({ detail: '问诊已完成' });
  });

  // ── 9. 评价问诊 ──
  app.post('/api/tcm/consultations/:id/review', auth, function(req, res) {
    var data = req.body || {};
    var consult = gQ('SELECT * FROM tcm_consultations WHERE id = ? AND user_id = ?', [Number(req.params.id), req.userId]);
    if (!consult) return res.status(404).json({ detail: '问诊记录未找到' });
    if (consult.status !== 'completed') return res.status(400).json({ detail: '问诊尚未完成' });
    if (consult.rating) return res.status(400).json({ detail: '已评价过了' });
    
    gR('UPDATE tcm_consultations SET rating = ?, review = ? WHERE id = ?',
      [data.rating || 5, data.review || '', consult.id]);
    sDb();
    
    // 更新医生评分
    var avg = gQ('SELECT AVG(rating) as avg_rating FROM tcm_consultations WHERE doctor_id = ? AND rating IS NOT NULL', [consult.doctor_id]);
    if (avg && avg.avg_rating) {
      gR('UPDATE tcm_doctors SET rating = ? WHERE id = ?', [Math.round(avg.avg_rating * 10) / 10, consult.doctor_id]);
      sDb();
    }
    
    res.json({ detail: '评价成功' });
  });

  // ── 10. 开具处方（医生端/管理员） ──
  app.post('/api/tcm/prescriptions', function(req, res) {
    var data = req.body || {};
    if (!data.consultation_id || !data.prescription_text) return res.status(400).json({ detail: '参数不完整' });
    
    var consult = gQ('SELECT * FROM tcm_consultations WHERE id = ?', [data.consultation_id]);
    if (!consult) return res.status(404).json({ detail: '问诊记录未找到' });
    
    // 解析处方文本
    var prescriptionData = typeof data.prescription_text === 'string' 
      ? data.prescription_text 
      : JSON.stringify(data.prescription_text);
    
    gR("INSERT INTO tcm_prescriptions (consultation_id, doctor_id, user_id, diagnosis, prescription_text, decoction_method, dosage, precautions, days) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [consult.id, consult.doctor_id, consult.user_id,
       data.diagnosis || '', prescriptionData,
       data.decoction_method || '水煎服，每日1剂', data.dosage || '每日2次，早晚各1次',
       data.precautions || '', data.days || 7]);
    sDb();
    
    var pres = gQ('SELECT * FROM tcm_prescriptions WHERE id = (SELECT last_insert_rowid())');
    
    // 关联到处方到问诊记录
    gR('UPDATE tcm_consultations SET prescription_id = ? WHERE id = ?', [pres.id, consult.id]);
    sDb();
    
    // 系统消息通知
    gR("INSERT INTO tcm_messages (consultation_id, sender_type, content, msg_type) VALUES (?, 'system', '医生已开具处方，请查看', 'system')",
      [consult.id]);
    sDb();
    
    res.json(pres);
  });

  // ── 11. 获取处方 ──
  app.get('/api/tcm/prescriptions/:consultationId', auth, function(req, res) {
    var consult = gQ('SELECT * FROM tcm_consultations WHERE id = ? AND user_id = ?', [Number(req.params.consultationId), req.userId]);
    if (!consult) return res.status(404).json({ detail: '问诊记录未找到' });
    
    var pres = gQ('SELECT * FROM tcm_prescriptions WHERE consultation_id = ?', [Number(req.params.consultationId)]);
    if (!pres) return res.status(404).json({ detail: '暂无处方' });
    
    // 尝试解析处方文本
    try { pres.prescription_data = JSON.parse(pres.prescription_text); } catch(e) { pres.prescription_data = pres.prescription_text; }
    
    res.json(pres);
  });

  // ── 12. 医生在线状态切换 ──
  app.post('/api/tcm/doctors/:id/toggle', function(req, res) {
    var doctor = gQ('SELECT * FROM tcm_doctors WHERE id = ?', [Number(req.params.id)]);
    if (!doctor) return res.status(404).json({ detail: '医生未找到' });
    
    gR('UPDATE tcm_doctors SET available = ? WHERE id = ?', [doctor.available ? 0 : 1, doctor.id]);
    sDb();
    res.json({ detail: '状态已更新', available: !doctor.available });
  });

  console.log('TCM Service: 在线中医问诊模块已加载');
}

module.exports = { setupRoutes };
