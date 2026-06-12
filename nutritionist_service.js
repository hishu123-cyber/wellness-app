/**
 * 营养师上门服务模块 Nutritionist Service
 * 提供：营养师展示、上门预约、线上咨询、服务记录、评价
 * 
 * 挂载方式：在 server.js 的 start() 函数中添加
 *   require('./nutritionist_service').setupRoutes(app, auth, requireVip);
 */

// =============================================
// 数据库表（需手动执行 SQL 或在 seed-db.js 中添加）
// =============================================
/*
CREATE TABLE IF NOT EXISTS nutritionists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  title TEXT DEFAULT '营养师',       -- 职称
  hospital TEXT,                    -- 所在机构/医院
  specialty TEXT,                   -- 擅长领域，逗号分隔
  introduction TEXT,                -- 个人简介
  avatar TEXT,                      -- 头像URL
  rating REAL DEFAULT 5.0,         -- 评分
  service_count INTEGER DEFAULT 0,  -- 服务次数
  price_online REAL DEFAULT 99,    -- 线上咨询价格（元/次）
  price_visit REAL DEFAULT 299,     -- 上门服务价格（元/次）
  available INTEGER DEFAULT 1,      -- 是否可预约
  service_areas TEXT,               -- 可服务区域，逗号分隔
  certifications TEXT,              -- 资质认证信息
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS nutritionist_services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nutritionist_id INTEGER NOT NULL,
  service_type TEXT NOT NULL,       -- 'online'(线上咨询) | 'visit'(上门服务)
  title TEXT NOT NULL,             -- 服务名称
  description TEXT,                -- 服务描述
  duration_minutes INTEGER DEFAULT 60,  -- 服务时长（分钟）
  price REAL NOT NULL,             -- 价格
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS nutritionist_bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  nutritionist_id INTEGER NOT NULL,
  service_id INTEGER,              -- 关联服务（可选）
  service_type TEXT NOT NULL,      -- 'online' | 'visit'
  status TEXT DEFAULT 'pending',   -- pending(待确认) | confirmed(已确认) | completed(已完成) | cancelled(已取消)
  service_date TEXT,               -- 预约日期
  service_time TEXT,               -- 预约时间
  address TEXT,                    -- 上门地址（上门服务必填）
  contact_phone TEXT,              -- 联系电话
  user_note TEXT,                  -- 用户备注/需求描述
  nutritionist_note TEXT,         -- 营养师备注
  price REAL,                     -- 实际价格
  created_at TEXT DEFAULT (datetime('now')),
  confirmed_at TEXT,              -- 确认时间
  completed_at TEXT,              -- 完成时间
  FOREIGN KEY (nutritionist_id) REFERENCES nutritionists(id),
  FOREIGN KEY (service_id) REFERENCES nutritionist_services(id)
);

CREATE TABLE IF NOT EXISTS nutritionist_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  nutritionist_id INTEGER NOT NULL,
  rating INTEGER NOT NULL,         -- 1-5 分
  review TEXT,                    -- 评价内容
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (booking_id) REFERENCES nutritionist_bookings(id),
  FOREIGN KEY (nutritionist_id) REFERENCES nutritionists(id)
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

  // ── 1. 获取营养师列表 ──
  app.get('/api/nutritionists', function(req, res) {
    var sql = 'SELECT id, name, title, hospital, specialty, introduction, avatar, rating, service_count, price_online, price_visit, available, service_areas FROM nutritionists WHERE 1=1';
    var params = [];
    
    if (req.query.specialty) {
      sql += ' AND specialty LIKE ?';
      params.push('%' + req.query.specialty + '%');
    }
    if (req.query.service_type) {
      // 按服务类型筛选（上门或线上）
      if (req.query.service_type === 'visit') {
        sql += ' AND price_visit > 0';
      } else if (req.query.service_type === 'online') {
        sql += ' AND price_online > 0';
      }
    }
    if (req.query.available !== undefined) {
      sql += ' AND available = ?';
      params.push(Number(req.query.available));
    }
    
    sql += ' ORDER BY rating DESC, service_count DESC';
    res.json(gA(sql, params));
  });

  // ── 2. 获取营养师详情 ──
  app.get('/api/nutritionists/:id', function(req, res) {
    var nutritionist = gQ('SELECT * FROM nutritionists WHERE id = ?', [Number(req.params.id)]);
    if (!nutritionist) return res.status(404).json({ detail: '营养师未找到' });
    
    // 获取该营养师的服务项目
    nutritionist.services = gA('SELECT * FROM nutritionist_services WHERE nutritionist_id = ? AND is_active = 1', [Number(req.params.id)]);
    
    res.json(nutritionist);
  });

  // ── 3. 获取营养师的服务项目 ──
  app.get('/api/nutritionists/:id/services', function(req, res) {
    var services = gA('SELECT * FROM nutritionist_services WHERE nutritionist_id = ? AND is_active = 1', [Number(req.params.id)]);
    res.json(services);
  });

  // ── 4. 创建预约（需要登录） ──
  app.post('/api/nutritionist/bookings', auth, function(req, res) {
    var data = req.body || {};
    if (!data.nutritionist_id) return res.status(400).json({ detail: '请选择营养师' });
    if (!data.service_type) return res.status(400).json({ detail: '请选择服务类型' });
    
    var nutritionist = gQ('SELECT * FROM nutritionists WHERE id = ?', [data.nutritionist_id]);
    if (!nutritionist) return res.status(404).json({ detail: '营养师未找到' });
    if (!nutritionist.available) return res.status(400).json({ detail: '该营养师当前不可预约' });
    
    // 上门服务必须填写地址
    if (data.service_type === 'visit' && !data.address) {
      return res.status(400).json({ detail: '上门服务需填写服务地址' });
    }
    
    var price = data.service_type === 'visit' ? nutritionist.price_visit : nutritionist.price_online;
    
    gR('INSERT INTO nutritionist_bookings (user_id, nutritionist_id, service_id, service_type, status, service_date, service_time, address, contact_phone, user_note, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.userId, data.nutritionist_id, data.service_id || null, data.service_type, 'pending', 
       data.service_date || '', data.service_time || '', data.address || '', data.contact_phone || '', 
       data.user_note || '', price]);
    sDb();
    
    var booking = gQ('SELECT * FROM nutritionist_bookings WHERE id = (SELECT last_insert_rowid())');
    if (!booking) booking = gQ('SELECT * FROM nutritionist_bookings ORDER BY id DESC LIMIT 1');
    
    // 发送系统通知（模拟）
    // 实际项目中应发送短信/微信通知营养师
    
    res.json({ success: true, booking: booking });
  });

  // ── 5. 获取我的预约列表（需要登录） ──
  app.get('/api/nutritionist/bookings/my', auth, function(req, res) {
    var status = req.query.status || '';
    var sql = 'SELECT b.*, n.name as nutritionist_name, n.title as nutritionist_title, n.avatar as nutritionist_avatar FROM nutritionist_bookings b LEFT JOIN nutritionists n ON b.nutritionist_id = n.id WHERE b.user_id = ?';
    var params = [req.userId];
    
    if (status) {
      sql += ' AND b.status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY b.created_at DESC';
    res.json(gA(sql, params));
  });

  // ── 6. 获取预约详情（需要登录） ──
  app.get('/api/nutritionist/bookings/:id', auth, function(req, res) {
    var booking = gQ('SELECT b.*, n.name as nutritionist_name, n.title as nutritionist_title, n.avatar as nutritionist_avatar, n.phone as nutritionist_phone FROM nutritionist_bookings b LEFT JOIN nutritionists n ON b.nutritionist_id = n.id WHERE b.id = ? AND b.user_id = ?', 
      [Number(req.params.id), req.userId]);
    if (!booking) return res.status(404).json({ detail: '预约记录未找到' });
    res.json(booking);
  });

  // ── 7. 取消预约（需要登录） ──
  app.post('/api/nutritionist/bookings/:id/cancel', auth, function(req, res) {
    var booking = gQ('SELECT * FROM nutritionist_bookings WHERE id = ? AND user_id = ?', [Number(req.params.id), req.userId]);
    if (!booking) return res.status(404).json({ detail: '预约记录未找到' });
    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      return res.status(400).json({ detail: '当前状态不可取消' });
    }
    
    gR("UPDATE nutritionist_bookings SET status = 'cancelled' WHERE id = ?", [Number(req.params.id)]);
    sDb();
    
    res.json({ success: true, detail: '预约已取消' });
  });

  // ── 8. 确认预约（营养师端/管理员） ──
  app.post('/api/nutritionist/bookings/:id/confirm', function(req, res) {
    var booking = gQ('SELECT * FROM nutritionist_bookings WHERE id = ?', [Number(req.params.id)]);
    if (!booking) return res.status(404).json({ detail: '预约记录未找到' });
    if (booking.status !== 'pending') return res.status(400).json({ detail: '该预约已处理' });
    
    gR("UPDATE nutritionist_bookings SET status = 'confirmed', confirmed_at = datetime('now') WHERE id = ?", [Number(req.params.id)]);
    sDb();
    
    res.json({ success: true, detail: '预约已确认' });
  });

  // ── 9. 完成预约（营养师端/管理员） ──
  app.post('/api/nutritionist/bookings/:id/complete', function(req, res) {
    var booking = gQ('SELECT * FROM nutritionist_bookings WHERE id = ?', [Number(req.params.id)]);
    if (!booking) return res.status(404).json({ detail: '预约记录未找到' });
    if (booking.status !== 'confirmed') return res.status(400).json({ detail: '该预约未确认，无法完成' });
    
    gR("UPDATE nutritionist_bookings SET status = 'completed', completed_at = datetime('now') WHERE id = ?", [Number(req.params.id)]);
    sDb();
    
    // 增加营养师服务计数
    gR('UPDATE nutritionists SET service_count = service_count + 1 WHERE id = ?', [booking.nutritionist_id]);
    sDb();
    
    res.json({ success: true, detail: '预约已完成' });
  });

  // ── 10. 评价预约（需要登录） ──
  app.post('/api/nutritionist/bookings/:id/review', auth, function(req, res) {
    var data = req.body || {};
    var booking = gQ('SELECT * FROM nutritionist_bookings WHERE id = ? AND user_id = ?', [Number(req.params.id), req.userId]);
    if (!booking) return res.status(404).json({ detail: '预约记录未找到' });
    if (booking.status !== 'completed') return res.status(400).json({ detail: '预约尚未完成，无法评价' });
    
    // 检查是否已评价
    var existing = gQ('SELECT id FROM nutritionist_reviews WHERE booking_id = ?', [Number(req.params.id)]);
    if (existing) return res.status(400).json({ detail: '已评价过了' });
    
    gR('INSERT INTO nutritionist_reviews (booking_id, user_id, nutritionist_id, rating, review) VALUES (?, ?, ?, ?, ?)',
      [Number(req.params.id), req.userId, booking.nutritionist_id, data.rating || 5, data.review || '']);
    sDb();
    
    // 更新营养师评分
    var avg = gQ('SELECT AVG(rating) as avg_rating FROM nutritionist_reviews WHERE nutritionist_id = ?', [booking.nutritionist_id]);
    if (avg && avg.avg_rating) {
      gR('UPDATE nutritionists SET rating = ? WHERE id = ?', [Math.round(avg.avg_rating * 10) / 10, booking.nutritionist_id]);
      sDb();
    }
    
    res.json({ success: true, detail: '评价成功' });
  });

  // ── 11. 获取营养师的评价列表 ──
  app.get('/api/nutritionists/:id/reviews', function(req, res) {
    var reviews = gA('SELECT r.*, u.nickname as user_name, u.avatar as user_avatar FROM nutritionist_reviews r LEFT JOIN users u ON r.user_id = u.id WHERE r.nutritionist_id = ? ORDER BY r.created_at DESC LIMIT 50', 
      [Number(req.params.id)]);
    res.json(reviews);
  });

  // ── 12. 营养师上线/下线切换（服务端） ──
  app.post('/api/nutritionists/:id/toggle', function(req, res) {
    var nutritionist = gQ('SELECT * FROM nutritionists WHERE id = ?', [Number(req.params.id)]);
    if (!nutritionist) return res.status(404).json({ detail: '营养师未找到' });
    
    gR('UPDATE nutritionists SET available = ? WHERE id = ?', [nutritionist.available ? 0 : 1, nutritionist.id]);
    sDb();
    
    res.json({ success: true, available: !nutritionist.available });
  });

  console.log('Nutritionist Service: 营养师上门服务模块已加载');
}

module.exports = { setupRoutes };
