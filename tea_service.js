// tea_service.js - 茶养模块后端API
// 在 server.js 中 require 并调用 setupTeaRoutes(app, auth)

function setupTeaRoutes(app, auth) {
  console.log("TeaService: setting up routes...");
  var gQ = function() { return global.queryOne.apply(null, arguments); };
  var gA = function() { return global.queryAll.apply(null, arguments); };
  var gR = function() { return global.queryRun.apply(null, arguments); };
  var sDb = function() { return global.saveDb(); };

  // ── 1. 获取今日推荐茶饮 ──
  app.get("/api/tea/today", auth, function(req, res) {
    var user = gQ("SELECT nickname, constitution FROM users WHERE id = ?", [req.userId]);
    if (!user) return res.status(404).json({ detail: "User not found" });

    var con = user.constitution || "";
    // 根据月份判断季节
    var month = new Date().getMonth() + 1;
    var seasonMap = { 12:"冬", 1:"冬", 2:"冬", 3:"春", 4:"春", 5:"春", 6:"夏", 7:"夏", 8:"夏", 9:"秋", 10:"秋", 11:"秋" };
    var season = seasonMap[month] || "春";

    // 查询适合该体质的茶
    var teas = [];
    if (con && con !== "未测评") {
      teas = gA("SELECT * FROM tea_products WHERE constitution LIKE ? LIMIT 3", ["%" + con.replace("质","") + "%"]);
    }
    if (!teas || teas.length === 0) {
      teas = gA("SELECT * FROM tea_products WHERE season = ? OR season = '四季' LIMIT 3", [season]);
    }
    if (!teas || teas.length === 0) {
      teas = gA("SELECT * FROM tea_products LIMIT 3");
    }

    res.json({
      constitution: con || "未测评",
      user: { nickname: user.nickname || "茶友" },
      teas: teas,
      season: season
    });
  });

  // ── 2. 获取所有茶品列表（支持筛选） ──
  app.get("/api/tea/products", function(req, res) {
    var sql = "SELECT * FROM tea_products WHERE 1=1";
    var params = [];
    if (req.query.category) { sql += " AND category = ?"; params.push(req.query.category); }
    if (req.query.constitution) { sql += " AND constitution LIKE ?"; params.push("%" + req.query.constitution + "%"); }
    sql += " ORDER BY id";
    res.json(gA(sql, params));
  });

  // ── 3. 获取单个茶品详情 ──
  app.get("/api/tea/products/:id", function(req, res) {
    var tea = gQ("SELECT * FROM tea_products WHERE id = ?", [Number(req.params.id)]);
    if (!tea) return res.status(404).json({ detail: "Tea not found" });
    res.json(tea);
  });

  // ── 4. 创建饮茶记录（打卡） ──
  app.post("/api/tea/records", auth, function(req, res) {
    var data = req.body || {};
    var today = new Date().toISOString().slice(0, 10);
    // 检查是否已在当天该时段打卡（使用 created_at 日期比较）
    var existing = gQ("SELECT id FROM tea_records WHERE user_id = ? AND DATE(created_at) = ? AND time_slot = ?", [req.userId, today, data.time_slot || ""]);
    if (existing) return res.status(400).json({ detail: "该时段已打卡" });

    gR("INSERT INTO tea_records (user_id, tea_id, tea_name, created_at, time_slot, score, feeling, completed) VALUES (?, ?, ?, datetime('now'), ?, ?, ?, ?)",
      [req.userId, data.tea_id || null, data.tea_name || "", data.time_slot || "", data.score || null, data.feeling || "", data.completed ? 1 : 0]);
    sDb();

    // 检查是否解锁新徽章
    var badges = checkBadges(req.userId);
    var record = gQ("SELECT * FROM tea_records ORDER BY id DESC LIMIT 1");

    res.json({ record: record, new_badges: badges });
  });

  // ── 5. 获取用户茶养记录 ──
  app.get("/api/tea/records", auth, function(req, res) {
    var days = req.query.days ? parseInt(req.query.days) : 30;
    var since = new Date();
    since.setDate(since.getDate() - days);
    var sinceStr = since.toISOString().slice(0, 10);

    var records = gA("SELECT * FROM tea_records WHERE user_id = ? AND DATE(created_at) >= ? ORDER BY created_at DESC, time_slot", [req.userId, sinceStr]);

    // 统计：使用 DATE(created_at) 替代 record_date
    var stats = gQ("SELECT COUNT(*) as total, COUNT(DISTINCT DATE(created_at)) as days, AVG(score) as avg_score FROM tea_records WHERE user_id = ? AND DATE(created_at) >= ?", [req.userId, sinceStr]) || { total: 0, days: 0, avg_score: 0 };

    // 连续打卡天数
    var continuousDays = 0;
    var checkDate = new Date();
    while (true) {
      var ds = checkDate.toISOString().slice(0, 10);
      var dayRec = gQ("SELECT id FROM tea_records WHERE user_id = ? AND DATE(created_at) = ?", [req.userId, ds]);
      if (dayRec) { continuousDays++; checkDate.setDate(checkDate.getDate() - 1); }
      else break;
    }

    res.json({ records: records, stats: stats, continuous_days: continuousDays });
  });

  // ── 6. 获取时辰规则 ──
  app.get("/api/tea/time-rules", function(req, res) {
    res.json(gA("SELECT * FROM tea_time_rules ORDER BY start_hour"));
  });

  // ── 7. 获取徽章列表 ──
  app.get("/api/tea/badges", auth, function(req, res) {
    var allBadges = gA("SELECT * FROM tea_badges ORDER BY id");
    var userBadges = gA("SELECT badge_id FROM user_badges WHERE user_id = ?", [req.userId]);
    var earnedIds = {};
    for (var i = 0; i < userBadges.length; i++) earnedIds[userBadges[i].badge_id] = true;
    var result = [];
    for (var i = 0; i < allBadges.length; i++) {
      var b = allBadges[i];
      result.push({ id: b.id, name: b.name, icon: b.icon, description: b.description, condition_type: b.condition_type, condition_value: b.condition_value, earned: !!earnedIds[b.id] });
    }
    res.json(result);
  });

  // ── 8. 获取节气信息 + 节气茶饮推荐 ──
  app.get("/api/tea/seasonal", function(req, res) {
    var today = new Date().toISOString().slice(5, 10);
    var currentTerm = gQ("SELECT * FROM solar_terms ORDER BY CASE WHEN date_mmdd >= ? THEN 0 ELSE 1 END, date_mmdd LIMIT 1", [today]);

    var teas = [];
    if (currentTerm) {
      var month = parseInt(currentTerm.date_mmdd.slice(0, 2));
      var seasonMap = { 12:"冬", 1:"冬", 2:"冬", 3:"春", 4:"春", 5:"春", 6:"夏", 7:"夏", 8:"夏", 9:"秋", 10:"秋", 11:"秋" };
      var season = seasonMap[month] || "春";
      teas = gA("SELECT * FROM tea_products WHERE season = ? OR season = '四季' LIMIT 6", [season]);
    }

    res.json({ current_term: currentTerm, teas: teas });
  });

  // ── 9.1 茶养统计数据 ──
  app.get("/api/tea/stats", auth, function(req, res) {
    var allStats = gQ("SELECT COUNT(*) as total_cups, COUNT(DISTINCT DATE(created_at)) as total_days FROM tea_records WHERE user_id = ?", [req.userId]) || { total_cups: 0, total_days: 0 };
    var continuous = 0;
    var d = new Date();
    while (true) {
      var ds = d.toISOString().slice(0, 10);
      var dayRec = gQ("SELECT id FROM tea_records WHERE user_id = ? AND DATE(created_at) = ?", [req.userId, ds]);
      if (dayRec) { continuous++; d.setDate(d.getDate() - 1); } else break;
    }
    var recent = gA("SELECT * FROM tea_records WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 5", [req.userId]);
    var weekStats = [];
    for (var i = 6; i >= 0; i--) {
      var day = new Date();
      day.setDate(day.getDate() - i);
      var ds2 = day.toISOString().slice(0, 10);
      var dayCups = gQ("SELECT COUNT(*) as c FROM tea_records WHERE user_id = ? AND DATE(created_at) = ?", [req.userId, ds2]);
      weekStats.push({ date: ds2, cups: dayCups ? dayCups.c : 0 });
    }
    res.json({
      total_cups: allStats.total_cups || 0,
      total_days: allStats.total_days || 0,
      continuous_days: continuous,
      avg_score: (gQ("SELECT AVG(score) as avg FROM tea_records WHERE user_id = ? AND score IS NOT NULL", [req.userId]) || {}).avg || 0,
      most_drunk: gQ("SELECT tea_name, COUNT(*) as c FROM tea_records WHERE user_id = ? AND tea_name != '' GROUP BY tea_name ORDER BY c DESC LIMIT 1", [req.userId]) || null,
      recent: recent || [],
      week: weekStats
    });
  });

  // ── 9.2 茶养知识库 ──
  app.get("/api/tea/knowledge", function(req, res) {
    var items = [
      { id: 1, title: "晨起空腹不宜饮浓茶", category: "饮茶须知", summary: "空腹饮浓茶会刺激胃黏膜，建议先吃些点心再饮茶。", icon: "☕" },
      { id: 2, title: "茶要趁热喝还是放凉", category: "饮茶须知", summary: "热茶温度60°C左右最佳，过烫损伤食道，放凉后茶多酚氧化影响功效。", icon: "🌡️" },
      { id: 3, title: "绿茶 vs 红茶 体质选择", category: "茶疗百科", summary: "绿茶性寒适合湿热体质，红茶性温适合虚寒体质，乌龙茶平和适合多数人。", icon: "🍵" },
      { id: 4, title: "八段锦每天做几次最好", category: "养生功法", summary: "每天1-2次，早晨升阳做引导式，傍晚做放松式，每次15-20分钟。", icon: "🧘" },
      { id: 5, title: "舌苔发白说明什么", category: "舌诊知识", summary: "舌苔白腻多为寒湿或脾胃虚寒，应避免生冷食物，宜温中健脾。", icon: "👅" },
      { id: 6, title: "按揉足三里健脾胃", category: "穴位养生", summary: "足三里在小腿外侧膝眼下四指，每日按揉3分钟可健脾胃、强身。", icon: "💆" },
      { id: 7, title: "夏季祛湿首选红豆薏米", category: "食疗药膳", summary: "红豆薏米水清热利湿，适合夏季体内湿气重、容易疲劳的人饮用。", icon: "🥗" },
      { id: 8, title: "陈皮+普洱的黄金搭配", category: "茶疗百科", summary: "熟普温和+陈皮理气，两者搭配适合饭后饮用，消食解腻效果显著。", icon: "🍊" },
      { id: 9, title: "体寒人群适合哪些茶", category: "茶疗百科", summary: "红茶、熟普、黑茶、姜枣茶均为温性茶饮，适合手脚冰凉、易腹泻的体寒人群。", icon: "🔥" },
      { id: 10, title: "春季护肝茶饮配方", category: "时令养生", summary: "菊花5朵+枸杞10粒+玫瑰3朵，沸水冲泡5分钟，疏肝理气、明目养颜。", icon: "🌸" },
    ];
    var cat = req.query.category;
    if (cat) items = items.filter(function(x) { return x.category === cat; });
    res.json(items);
  });

  // ── 9.3 每日养生知识 ──
  app.get("/api/tea/daily-tip", function(req, res) {
    var tips = [
      { id: 1, title: "晨起一杯温水，唤醒肠胃", content: "早晨起床后先喝一杯温水，再饮茶。空腹饮浓茶易伤胃。", category: "饮茶常识" },
      { id: 2, title: "饭后半小时再饮茶", content: "饭后立即饮茶会影响铁的吸收，建议饭后30分钟再品茗。", category: "饮茶常识" },
      { id: 3, title: "春季养肝宜饮花茶", content: "春应肝，花茶芳香走窜，有助于疏肝理气、调畅情志。", category: "时令养生" },
      { id: 4, title: "夏季清心首选绿茶", content: "夏应心，绿茶性寒清热，富含茶多酚，生津止渴效果最佳。", category: "时令养生" },
      { id: 5, title: "秋季润燥多饮乌龙", content: "秋应肺，乌龙茶不寒不热，润喉生津，适合秋燥时节。", category: "时令养生" },
      { id: 6, title: "冬季暖身宜饮红茶", content: "冬应肾，红茶全发酵性温，暖胃暖身，适合冬季饮用。", category: "时令养生" },
      { id: 7, title: "陈皮泡水可理气健脾", content: "陈皮有理气健脾、燥湿化痰的功效。取一小片陈皮，沸水冲泡5分钟即可饮用。", category: "茶疗百科" },
      { id: 8, title: "菊花枸杞茶缓解眼疲劳", content: "长时间用眼后，来一杯菊花枸杞茶，清肝明目，缓解眼睛干涩。", category: "茶疗百科" }
    ];
    var dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    res.json(tips[dayOfYear % tips.length]);
  });
}

// ── 徽章检测 ──
function checkBadges(userId) {
  var gQ = function() { return global.queryOne.apply(null, arguments); };
  var gA = function() { return global.queryAll.apply(null, arguments); };
  var gR = function() { return global.queryRun.apply(null, arguments); };
  var sDb = function() { return global.saveDb(); };

  var newBadges = [];
  var badges = gA("SELECT * FROM tea_badges ORDER BY id");
  var earned = gA("SELECT badge_id FROM user_badges WHERE user_id = ?", [userId]);
  var earnedMap = {};
  for (var i = 0; i < earned.length; i++) earnedMap[earned[i].badge_id] = true;

  for (var i = 0; i < badges.length; i++) {
    if (earnedMap[badges[i].id]) continue;
    var qualified = false;
    var b = badges[i];
    if (b.condition_type === "records_count") {
      var count = gQ("SELECT COUNT(*) as c FROM tea_records WHERE user_id = ?", [userId]);
      qualified = count && count.c >= b.condition_value;
    } else if (b.condition_type === "continuous_days") {
      var cont = 0;
      var d = new Date();
      while (true) {
        var ds = d.toISOString().slice(0, 10);
        var dr = gQ("SELECT id FROM tea_records WHERE user_id = ? AND DATE(created_at) = ?", [userId, ds]);
        if (dr) { cont++; d.setDate(d.getDate() - 1); } else break;
      }
      qualified = cont >= b.condition_value;
    } else if (b.condition_type === "unique_teas") {
      var unique = gQ("SELECT COUNT(DISTINCT tea_id) as c FROM tea_records WHERE user_id = ? AND tea_id IS NOT NULL", [userId]);
      qualified = unique && unique.c >= b.condition_value;
    } else if (b.condition_type === "first_assessment") {
      var rec = gQ("SELECT id FROM constitution_records WHERE user_id = ?", [userId]);
      qualified = !!rec;
    }

    if (qualified) {
      gR("INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)", [userId, b.id]);
      sDb();
      newBadges.push({ name: b.name, icon: b.icon, description: b.description });
    }
  }
  return newBadges;
}

module.exports = { setupTeaRoutes: setupTeaRoutes };
