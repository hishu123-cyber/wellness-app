/**
 * 用户画像与智能推荐引擎
 * 功能：动态标签体系、人群分层、差异化场景推送、首页千人千面
 * 
 * 四大人群：老年人、中年人、女性、婴幼儿
 * 画像维度：体质标签 + 症状标签 + 行为标签 + 生命周期标签
 */
var path = require('path');

var CONSTITUTION_INFO = (function() {
  try { return require('./constitution_data.json'); } catch(e) {}
  return {};
})();

// ══════════════════════════════════════════
// 人群分层规则
// ══════════════════════════════════════════
var USER_SEGMENTS = {
  elderly: {
    name: '老年人',
    icon: '👴',
    condition: function(age, gender) { return age >= 60; },
    focus: '慢性病管理 · 延缓衰老',
    home_banner: '养生之道，贵在坚持',
    featured_categories: ['慢性病调理', '药食同源', '滋补养生'],
    push_content: {
      morning: '今日养生小贴士：早起缓行，温水一杯润肠胃',
      diet: '少食多餐七分饱，温热软烂最养胃',
      exercise: '太极、八段锦，每日30分钟，延年益寿'
    },
    product_keywords: ['降糖', '降压', '补钙', '黑芝麻', '核桃', '枸杞', '山药', '红枣'],
    article_categories: ['中医养生', '节气养生'],
    service_priority: ['tcm_consultation', 'nutritionist_visit'] // 中医问诊优先
  },
  middle_aged: {
    name: '中年人',
    icon: '💼',
    condition: function(age, gender) { return age >= 35 && age < 60; },
    focus: '防御型养生 · 抗疲劳',
    home_banner: '防患未然，养生先养心',
    featured_categories: ['疏肝解郁', '抗疲劳', '免疫力提升'],
    push_content: {
      morning: '工作再忙，也要给身体一个休息的理由',
      diet: '三餐规律，远离外卖，茶饮养生正当时',
      exercise: '快走游泳，每周3次，给身体充充电'
    },
    product_keywords: ['护肝', '解郁', '益生菌', '菊花', '陈皮', '枸杞'],
    article_categories: ['运动养生', '中医养生'],
    service_priority: ['nutritionist_online', 'tcm_consultation']
  },
  female: {
    name: '女性专属',
    icon: '👩',
    condition: function(age, gender) { return (gender === '女' || gender === 'female') && age >= 18 && age < 60; },
    focus: '气血调理 · 情绪管理',
    home_banner: '由内而外，做最好的自己',
    featured_categories: ['气血调理', '美容养颜', '经期管理'],
    push_content: {
      morning: '一杯花茶，唤醒好气色',
      diet: '红枣桂圆补气血，玫瑰花茶疏肝郁',
      exercise: '瑜伽普拉提，身心皆自在'
    },
    product_keywords: ['红枣', '桂圆', '玫瑰花', '当归', '蜂蜜', '银耳', '百合'],
    article_categories: ['中医养生', '运动养生'],
    service_priority: ['nutritionist_online', 'nutritionist_visit']
  },
  infant: {
    name: '婴幼儿',
    icon: '👶',
    condition: function(age, gender) { return age >= 0 && age <= 3; },
    focus: '脾胃调理 · 营养均衡',
    home_banner: '健康成长，从脾胃开始',
    featured_categories: ['小儿推拿', '辅食调理', '脾胃养护'],
    push_content: {
      morning: '宝宝脾胃调理小贴士：辅食添加循序渐进',
      diet: '山药莲子健脾胃，山楂助消化',
      exercise: '小儿推拿：揉腹100次，助消化健脾胃'
    },
    product_keywords: ['山药', '莲子', '山楂', '薏米', '小儿'],
    article_categories: ['中医养生'],
    service_priority: ['nutritionist_online', 'nutritionist_visit']
  },
  youth: {
    name: '青年人',
    icon: '🏃',
    condition: function(age, gender) { return age >= 18 && age < 35; },
    focus: '体质改善 · 习惯养成',
    home_banner: '年轻也要养生，投资健康不嫌早',
    featured_categories: ['体质改善', '养生茶饮', '运动恢复'],
    push_content: {
      morning: '别让熬夜拖垮你的体质',
      diet: '告别外卖，一碗养生粥暖胃又暖心',
      exercise: '跑步游泳，每周3-5次，打造好体质'
    },
    product_keywords: ['养生茶', '代餐', '蛋白', '维生素'],
    article_categories: ['运动养生', '中医养生'],
    service_priority: ['nutritionist_online', 'tcm_consultation']
  }
};

// ══════════════════════════════════════════
// 标签体系
// ══════════════════════════════════════════
function buildUserTags(user, diaryData, purchaseHistory) {
  var tags = {
    constitution: [],    // 体质标签
    symptom: [],         // 症状标签
    behavior: [],        // 行为标签
    lifecycle: [],       // 生命周期标签
    preference: []       // 偏好标签
  };

  // 体质标签
  if (user.constitution_type) {
    tags.constitution.push(user.constitution_type);
    var info = CONSTITUTION_INFO[user.constitution_type];
    if (info) {
      if (info.foods) tags.constitution.push('宜' + info.foods.slice(0, 3).join('·'));
      if (info.avoid) tags.constitution.push('忌' + info.avoid.slice(0, 2).join('·'));
    }
  }

  // 生命周期标签
  var age = user.birth_year ? new Date().getFullYear() - user.birth_year : null;
  if (age !== null) {
    if (age >= 60) tags.lifecycle.push('老年期');
    else if (age >= 45) tags.lifecycle.push('更年期前');
    else if (age >= 35) tags.lifecycle.push('中年期');
    else if (age >= 18) tags.lifecycle.push('青年期');
    else if (age >= 12) tags.lifecycle.push('青春期');
    else if (age >= 3) tags.lifecycle.push('学龄前');
    else tags.lifecycle.push('婴幼儿期');
  }
  if (user.gender === '女' || user.gender === 'female') tags.lifecycle.push('女性');
  if (user.gender === '男' || user.gender === 'male') tags.lifecycle.push('男性');

  // 行为标签（基于日记数据）
  if (diaryData && diaryData.length > 0) {
    var avgSleep = 0, avgExercise = 0, lateNightCount = 0;
    for (var i = 0; i < diaryData.length; i++) {
      avgSleep += diaryData[i].sleep_hours || 0;
      avgExercise += diaryData[i].exercise_minutes || 0;
      if ((diaryData[i].sleep_hours || 0) < 6) lateNightCount++;
    }
    var count = diaryData.length;
    avgSleep = avgSleep / count;
    avgExercise = avgExercise / count;

    if (avgSleep < 6) tags.behavior.push('睡眠不足');
    else if (avgSleep > 9) tags.behavior.push('嗜睡');
    if (avgExercise < 15) tags.behavior.push('缺乏运动');
    else if (avgExercise >= 30) tags.behavior.push('运动达人');
    if (lateNightCount > count * 0.5) tags.behavior.push('熬夜党');
  }

  // 偏好标签（基于购买历史）
  if (purchaseHistory && purchaseHistory.length > 0) {
    var categories = {};
    for (var i = 0; i < purchaseHistory.length; i++) {
      var cat = purchaseHistory[i].category || '其他';
      categories[cat] = (categories[cat] || 0) + 1;
    }
    var sorted = [];
    for (var k in categories) {
      if (categories.hasOwnProperty(k)) sorted.push({ cat: k, count: categories[k] });
    }
    sorted.sort(function(a, b) { return b.count - a.count; });
    if (sorted.length > 0) tags.preference.push('偏好' + sorted[0].cat);
    if (sorted.length > 1) tags.preference.push('常买' + sorted[1].cat);
  }

  return tags;
}

// ══════════════════════════════════════════
// 人群分层
// ══════════════════════════════════════════
function getSegment(user) {
  var age = user.birth_year ? new Date().getFullYear() - user.birth_year : 30;
  var gender = user.gender || '';

  // 优先级：婴幼儿 > 老年人 > 女性 > 中年人 > 青年人
  if (age <= 3) return USER_SEGMENTS.infant;
  if (age >= 60) return USER_SEGMENTS.elderly;
  if ((gender === '女' || gender === 'female') && age >= 18 && age < 60) return USER_SEGMENTS.female;
  if (age >= 35 && age < 60) return USER_SEGMENTS.middle_aged;
  return USER_SEGMENTS.youth;
}

// ══════════════════════════════════════════
// 首页千人千面内容生成
// ══════════════════════════════════════════
function generatePersonalizedHome(user, tags, segment) {
  var ct = user.constitution_type || '平和质';
  var info = CONSTITUTION_INFO[ct] || {};

  return {
    // 顶部横幅
    banner: {
      text: segment.home_banner,
      constitution: ct,
      segment_name: segment.name,
      segment_icon: segment.icon
    },
    
    // 快捷入口（根据人群定制）
    quick_actions: buildQuickActions(segment, ct),
    
    // 推荐文章分类
    article_categories: segment.article_categories,
    
    // 推荐服务
    service_priority: segment.service_priority,
    
    // 个性化推送
    daily_push: segment.push_content,
    
    // 体质关联推荐
    constitution_tips: {
      food_tip: info.foods ? info.foods[0] : '',
      exercise_tip: info.exercises ? info.exercises[0] : '',
      tea_tip: info.tea || ''
    },

    // 商品推荐关键词
    product_keywords: segment.product_keywords,

    // 推荐分类
    featured_categories: segment.featured_categories
  };
}

function buildQuickActions(segment, ct) {
  var actions = [
    { icon: '🔍', label: 'AI辨体', page: 'ai-constitution' },
    { icon: '🧘', label: '体质测评', page: 'constitution' }
  ];

  // 根据人群添加专属入口
  if (segment === USER_SEGMENTS.elderly) {
    actions.push({ icon: '💊', label: '慢性病管理', page: 'diet-plan' });
    actions.push({ icon: '👨‍⚕️', label: '中医问诊', page: 'doctors' });
  } else if (segment === USER_SEGMENTS.female) {
    actions.push({ icon: '🌹', label: '气血调理', page: 'diet-plan' });
    actions.push({ icon: '🍎', label: '营养师', page: 'nutritionists' });
  } else if (segment === USER_SEGMENTS.infant) {
    actions.push({ icon: '👶', label: '小儿推拿', page: 'articles' });
    actions.push({ icon: '🥣', label: '辅食教程', page: 'recipes' });
  } else if (segment === USER_SEGMENTS.middle_aged) {
    actions.push({ icon: '☕', label: '养生茶饮', page: 'smart-shop' });
    actions.push({ icon: '👨‍⚕️', label: '医生上线', page: 'doctors' });
  } else {
    actions.push({ icon: '🍎', label: '营养师上门', page: 'nutritionists' });
    actions.push({ icon: '🥗', label: '食疗药膳', page: 'recipes' });
  }

  actions.push({ icon: '🌤️', label: '节气养生', page: 'solar' });

  return actions;
}

// ══════════════════════════════════════════
// 健康档案聚合
// ══════════════════════════════════════════
function buildHealthArchive(user, consultationRecords, purchaseRecords, diaryRecords) {
  var archive = {
    user_info: {
      name: user.nickname || user.username,
      age: user.birth_year ? new Date().getFullYear() - user.birth_year : null,
      gender: user.gender,
      constitution_type: user.constitution_type
    },
    
    // 体质历程
    constitution_history: [],
    
    // 问诊记录摘要
    consultation_summary: {
      total: consultationRecords ? consultationRecords.length : 0,
      recent: [],
      common_symptoms: []
    },
    
    // 购买偏好
    purchase_summary: {
      total: purchaseRecords ? purchaseRecords.length : 0,
      categories: {},
      recent: []
    },
    
    // 健康趋势
    health_trend: {
      avg_sleep: 0,
      avg_exercise: 0,
      avg_mood: 0,
      days_recorded: diaryRecords ? diaryRecords.length : 0
    }
  };

  // 体质历程
  if (user.constitution_type) {
    archive.constitution_history.push({
      type: user.constitution_type,
      date: new Date().toISOString().slice(0, 10),
      source: 'latest'
    });
  }

  // 问诊摘要
  if (consultationRecords && consultationRecords.length > 0) {
    var recent = consultationRecords.slice(0, 5);
    archive.consultation_summary.recent = recent.map(function(r) {
      return { date: r.created_at ? r.created_at.slice(0, 10) : '', doctor: r.doctor_name || '', type: r.type || '' };
    });
  }

  // 购买偏好
  if (purchaseRecords && purchaseRecords.length > 0) {
    for (var i = 0; i < purchaseRecords.length; i++) {
      var cat = purchaseRecords[i].category || '其他';
      archive.purchase_summary.categories[cat] = (archive.purchase_summary.categories[cat] || 0) + 1;
    }
    archive.purchase_summary.recent = purchaseRecords.slice(0, 3).map(function(p) {
      return { name: p.product_name || '', date: p.created_at ? p.created_at.slice(0, 10) : '' };
    });
  }

  // 健康趋势
  if (diaryRecords && diaryRecords.length > 0) {
    var totalSleep = 0, totalExercise = 0, totalMood = 0;
    for (var i = 0; i < diaryRecords.length; i++) {
      totalSleep += diaryRecords[i].sleep_hours || 0;
      totalExercise += diaryRecords[i].exercise_minutes || 0;
      totalMood += diaryRecords[i].mood_score || 0;
    }
    archive.health_trend.avg_sleep = Math.round(totalSleep / diaryRecords.length * 10) / 10;
    archive.health_trend.avg_exercise = Math.round(totalExercise / diaryRecords.length);
    archive.health_trend.avg_mood = Math.round(totalMood / diaryRecords.length * 10) / 10;
  }

  return archive;
}

// ══════════════════════════════════════════
// Express 路由
// ══════════════════════════════════════════
function setupRoutes(app, auth) {
  var gQ = function() { return global.queryOne.apply(null, arguments); };
  var gA = function() { return global.queryAll.apply(null, arguments); };

  // 获取用户画像
  app.get('/api/user-profile/tags', auth, function(req, res) {
    try {
      var user = gQ('SELECT * FROM users WHERE id = ?', [req.userId]);
      if (!user) return res.status(404).json({ detail: 'User not found' });

      var diaries = gA('SELECT * FROM health_diaries WHERE user_id = ? ORDER BY record_date DESC LIMIT 30', [req.userId]);
      var purchases = gA('SELECT oi.*, p.category FROM shop_order_items oi LEFT JOIN shop_products p ON oi.product_id = p.id LEFT JOIN shop_orders o ON oi.order_id = o.id WHERE o.user_id = ? ORDER BY o.created_at DESC LIMIT 20', [req.userId]);

      var tags = buildUserTags(user, diaries, purchases);
      var segment = getSegment(user);

      res.json({
        user_id: user.id,
        nickname: user.nickname || user.username,
        tags: tags,
        segment: {
          name: segment.name,
          icon: segment.icon,
          focus: segment.focus
        }
      });
    } catch (e) {
      console.error('User profile error:', e);
      res.status(500).json({ detail: '获取用户画像失败' });
    }
  });

  // 千人千面首页数据
  app.get('/api/user-profile/home', auth, function(req, res) {
    try {
      var user = gQ('SELECT * FROM users WHERE id = ?', [req.userId]);
      if (!user) return res.status(404).json({ detail: 'User not found' });

      var diaries = gA('SELECT * FROM health_diaries WHERE user_id = ? ORDER BY record_date DESC LIMIT 30', [req.userId]);
      var purchases = gA('SELECT oi.*, p.category FROM shop_order_items oi LEFT JOIN shop_products p ON oi.product_id = p.id LEFT JOIN shop_orders o ON oi.order_id = o.id WHERE o.user_id = ? ORDER BY o.created_at DESC LIMIT 20', [req.userId]);

      var tags = buildUserTags(user, diaries, purchases);
      var segment = getSegment(user);
      var homeData = generatePersonalizedHome(user, tags, segment);

      // 加入今日日记数据
      var todayStr = new Date().toISOString().slice(0, 10);
      var todayDiary = gQ('SELECT * FROM health_diaries WHERE user_id = ? AND record_date = ?', [req.userId, todayStr]);
      homeData.today_diary = todayDiary;

      res.json(homeData);
    } catch (e) {
      console.error('Home personalization error:', e);
      res.status(500).json({ detail: '获取首页数据失败' });
    }
  });

  // 健康档案
  app.get('/api/user-profile/archive', auth, function(req, res) {
    try {
      var user = gQ('SELECT * FROM users WHERE id = ?', [req.userId]);
      if (!user) return res.status(404).json({ detail: 'User not found' });

      var consultations = gA('SELECT * FROM tcm_consultations WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', [req.userId]);
      var purchases = gA('SELECT oi.*, p.name as product_name, p.category FROM shop_order_items oi LEFT JOIN shop_products p ON oi.product_id = p.id LEFT JOIN shop_orders o ON oi.order_id = o.id WHERE o.user_id = ? ORDER BY o.created_at DESC LIMIT 20', [req.userId]);
      var diaries = gA('SELECT * FROM health_diaries WHERE user_id = ? ORDER BY record_date DESC LIMIT 30', [req.userId]);

      var archive = buildHealthArchive(user, consultations, purchases, diaries);
      res.json(archive);
    } catch (e) {
      console.error('Health archive error:', e);
      res.status(500).json({ detail: '获取健康档案失败' });
    }
  });

  // 差异化推送内容
  app.get('/api/user-profile/push', auth, function(req, res) {
    try {
      var user = gQ('SELECT * FROM users WHERE id = ?', [req.userId]);
      if (!user) return res.status(404).json({ detail: 'User not found' });
      
      var segment = getSegment(user);
      var ct = user.constitution_type || '平和质';
      var info = CONSTITUTION_INFO[ct] || {};

      var hour = new Date().getHours();
      var timeSlot = hour < 9 ? 'morning' : hour < 14 ? 'noon' : hour < 18 ? 'afternoon' : 'evening';

      var push = {
        time_slot: timeSlot,
        segment: segment.name,
        constitution: ct,
        content: segment.push_content,
        seasonal_tip: info.seasonalTips || '',
        today_task: null // 由季节日历模块填充
      };

      res.json(push);
    } catch (e) {
      console.error('Push content error:', e);
      res.status(500).json({ detail: '获取推送内容失败' });
    }
  });
}

module.exports = {
  buildUserTags,
  getSegment,
  generatePersonalizedHome,
  buildHealthArchive,
  setupRoutes,
  USER_SEGMENTS
};
