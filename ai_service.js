/**
 * AI Service for Wellness App
 * Tier 1: Rule-based suggestions (always works)
 * Tier 2: AI-powered suggestions (requires API key)
 */
var https = require('https');
var path = require('path');
var CONSTITUTION_INFO = (function() {
  try { return require('./constitution_data.json'); } catch(e) {}
  try { return require(path.join(__dirname, 'constitution_data.json')); } catch(e) {}
  return {};
})();

var API_KEY = process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.SILICONFLOW_API_KEY || '';
var USE_AI = !!API_KEY;
var ACTIVE_PROVIDER = 'none';
if (USE_AI) {
  var p = process.env.AI_PROVIDER || 'auto';
  if (p !== 'auto') ACTIVE_PROVIDER = p;
  else if (process.env.DEEPSEEK_API_KEY) ACTIVE_PROVIDER = 'deepseek';
  else if (process.env.OPENAI_API_KEY) ACTIVE_PROVIDER = 'openai';
  else if (process.env.SILICONFLOW_API_KEY) ACTIVE_PROVIDER = 'siliconflow';
}

var PROVIDERS = {
  deepseek: { baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat', maxTokens: 1024 },
  openai: { baseUrl: 'https://api.openai.com', model: 'gpt-4o-mini', maxTokens: 1024 },
  siliconflow: { baseUrl: 'https://api.siliconflow.cn', model: 'Qwen/Qwen2.5-7B-Instruct', maxTokens: 1024 },
};

// ── Generate constitution analysis ──
function generateConstitutionAnalysis(constitutionType, scores, userInfo) {
  var info = CONSTITUTION_INFO[constitutionType] || CONSTITUTION_INFO['平和质'];
  var secondaryType = null;

  if (scores) {
    var sorted = [];
    for (var key in scores) {
      if (scores.hasOwnProperty(key)) sorted.push({ type: key, score: scores[key] });
    }
    sorted.sort(function(a, b) { return b.score - a.score; });
    if (sorted.length >= 2 && sorted[0].score > 0 && sorted[1].score > sorted[0].score * 0.6) {
      secondaryType = sorted[1].type;
    }
  }

  var personalTips = [];
  if (userInfo) {
    if (userInfo.gender === '女' && constitutionType === '血瘀质') personalTips.push('女性血瘀质要注意经期保暖，避免受寒，可多喝生姜红糖水。');
    if (userInfo.gender === '女' && constitutionType === '阳虚质') personalTips.push('女性阳虚质注意腹部保暖，经期避免生冷。');
    if (userInfo.gender === '女' && constitutionType === '气郁质') personalTips.push('女性气郁质经前一周喝玫瑰花茶，有助于缓解情绪波动。');
    if (userInfo.gender === '男' && constitutionType === '阳虚质') personalTips.push('男性阳虚质注意节制房事，适当进行腰背部的力量训练。');
    if (userInfo.gender === '男' && constitutionType === '湿热质') personalTips.push('男性湿热质避免过量饮酒和熬夜，多食绿豆薏米汤。');
    if (userInfo.birth_year) {
      var age = new Date().getFullYear() - userInfo.birth_year;
      if (age >= 50 && constitutionType === '阴虚质') personalTips.push('中老年阴虚质注意控制血压，定期体检。多食桑椹、黑芝麻等。');
      if (age >= 50 && constitutionType === '阳虚质') personalTips.push('中老年阳虚质注意补钙，预防骨质疏松。多晒太阳。');
      if (age <= 30 && constitutionType === '痰湿质') personalTips.push('青年痰湿质注意控制体重，避免高糖饮料和外卖。');
    }
  }

  return {
    constitution_type: constitutionType,
    description: info.description,
    secondary_type: secondaryType,
    core_principles: info.principles,
    analysis_sections: [
      { title: '饮食调理', content: info.dietPrinciples, icon: '🥗', details: { recommended_foods: info.foods, avoid_foods: info.avoid, recommended_tea: info.tea } },
      { title: '日常起居', content: info.dailyTips, icon: '🏠' },
      { title: '穴位按摩', content: '推荐穴位：' + info.acupoints + '。每天按压每个穴位2-3分钟，以酸胀为度。', icon: '👐', details: { acupoints: info.acupoints.split('、') } },
      { title: '运动方案', content: '推荐运动：' + info.exercises.join('、') + '。每周至少5次，每次30分钟以上。', icon: '🏃', details: { recommended_exercises: info.exercises } },
      { title: '四季调养', content: info.seasonalTips, icon: '🌸' },
      { title: '情绪管理', content: info.mood, icon: '🧘' },
      { title: '注意事项', content: info.warning, icon: '⚠️' },
    ],
    weekly_meal_plan: generateMealPlan(constitutionType, info),
    seven_day_challenge: generateChallenge(constitutionType, info),
    personal_tips: personalTips,
    ai_generated: false,
  };
}

// ── Generate meal plan ──
function generateMealPlan(constitutionType, info) {
  var meals = {
    '气虚质': {
      breakfast: ['小米红枣粥', '山药芡实粥', '黄芪红枣小米粥', '南瓜小米粥', '红薯粥', '糯米莲子粥', '土豆疙瘩汤'],
      lunch: ['黄芪炖鸡汤', '山药炖排骨', '土豆烧牛肉', '红枣蒸鸡', '莲子炖瘦肉', '糯米蒸排骨', '板栗烧鸡'],
      dinner: ['小米南瓜粥', '山药炒木耳', '清蒸鲈鱼', '番茄炒蛋', '素炒西蓝花', '木耳炒山药', '丝瓜蛋汤'],
      tea: ['黄芪红枣茶', '党参枸杞茶', '红枣桂圆茶'],
    },
    '阳虚质': {
      breakfast: ['生姜红糖粥', '桂圆红枣粥', '核桃黑芝麻糊', '韭菜鸡蛋饼', '羊肉汤面', '肉桂小米粥', '葱油饼'],
      lunch: ['当归生姜羊肉汤', '韭菜炒核桃', '红烧羊肉', '干煸牛肉', '葱爆羊肉', '黑豆炖猪尾', '肉桂炖牛肉'],
      dinner: ['姜丝炒蛋', '韭菜炒河虾', '核桃炒菠菜', '蒜蓉生菜', '红烧豆腐', '羊肉萝卜汤', '姜汁芥蓝'],
      tea: ['肉桂干姜茶', '红枣桂圆茶', '生姜红糖水'],
    },
    '阴虚质': {
      breakfast: ['百合银耳粥', '雪梨小米粥', '黑芝麻糊', '牛奶燕麦', '莲子百合羹', '蜂蜜蒸蛋', '山药枸杞粥'],
      lunch: ['百合炒西芹', '沙参玉竹老鸭汤', '清蒸甲鱼', '银耳蒸蛋', '枸杞蒸鸡', '莲藕排骨汤', '百合炒虾仁'],
      dinner: ['凉拌黑木耳', '素炒百合', '蒜蓉娃娃菜', '冬瓜汤', '清蒸鲈鱼', '凉拌黄瓜', '菊花豆腐汤'],
      tea: ['麦冬玉竹茶', '枸杞菊花茶', '蜂蜜柠檬水'],
    },
    '痰湿质': {
      breakfast: ['薏米赤小豆粥', '冬瓜粥', '茯苓小米粥', '玉米糊', '白萝卜粥', '荞麦面', '燕麦粥'],
      lunch: ['冬瓜薏米排骨汤', '陈皮炒瘦肉', '清蒸鱼', '海带排骨汤', '苦瓜炒蛋', '炒白萝卜', '荷叶蒸鸡'],
      dinner: ['凉拌海带丝', '素炒冬瓜', '萝卜炖豆腐', '蒜蓉空心菜', '炒春笋', '紫菜蛋花汤', '清炒苦瓜'],
      tea: ['陈皮茯苓茶', '荷叶茶', '山楂决明子茶'],
    },
    '湿热质': {
      breakfast: ['绿豆薏米粥', '苦瓜小米粥', '燕麦片', '玉米糊', '冬瓜粥', '小米绿豆粥', '黄瓜拌面'],
      lunch: ['苦瓜炒蛋', '冬瓜老鸭汤', '清蒸鱼', '凉拌黄瓜', '绿豆芽炒韭菜', '番茄炒蛋', '丝瓜汤'],
      dinner: ['凉拌苦瓜', '素炒冬瓜', '蒜蓉秋葵', '清炒时蔬', '豆腐青菜汤', '凉拌黄瓜', '薄荷拌豆腐'],
      tea: ['菊花金银花茶', '薄荷柠檬茶', '绿豆汤'],
    },
    '血瘀质': {
      breakfast: ['山楂红糖粥', '黑豆粥', '紫米粥', '黑芝麻糊', '红枣小米粥', '红糖姜茶', '全麦面包'],
      lunch: ['山楂红烧肉', '黑豆炖排骨', '凉拌黑木耳', '洋葱炒牛肉', '醋溜白菜', '番茄牛腩', '芥菜炖豆腐'],
      dinner: ['凉拌木耳', '醋拌海带', '清蒸鱼', '蒜蓉菠菜', '南瓜粥', '番茄豆腐汤', '炒油菜'],
      tea: ['玫瑰花山楂茶', '丹参茶', '红糖姜茶'],
    },
    '气郁质': {
      breakfast: ['百合小米粥', '玫瑰花粥', '小麦红枣粥', '全麦馒头', '燕麦牛奶', '香蕉松饼', '小米南瓜粥'],
      lunch: ['佛手瓜炒肉', '陈皮萝卜汤', '清蒸鱼', '薄荷炒蛋', '柠檬鸡', '番茄牛腩', '芹菜炒百合'],
      dinner: ['素炒萝卜丝', '清炒豆苗', '冬瓜汤', '素炒茼蒿', '豆腐青菜汤', '凉拌莴笋', '西芹炒百合'],
      tea: ['玫瑰花薄荷茶', '佛手茶', '蜂蜜柠檬水'],
    },
    '特禀质': {
      breakfast: ['黄芪山药粥', '小米红枣粥', '大米粥', '山药粥', '燕麦粥', '蒸红薯', '小米南瓜粥'],
      lunch: ['黄芪炖鸡', '山药排骨汤', '清蒸鲈鱼', '土豆炖牛肉', '红枣蒸鸡', '胡萝卜炖羊肉', '山药炒木耳'],
      dinner: ['素炒山药', '香菇油菜', '蒸南瓜', '清炒西蓝花', '紫菜蛋花汤', '豆腐青菜', '南瓜小米粥'],
      tea: ['黄芪白术防风茶', '红枣枸杞茶', '甘草茶'],
    },
    '平和质': {
      breakfast: ['五谷杂粮粥', '全麦面包+牛奶', '鸡蛋+燕麦', '小米粥+小菜', '素包子+豆浆', '玉米+牛奶', '山药粥'],
      lunch: ['均衡搭配', '荤素结合', '五谷为主', '蔬菜水果', '适量蛋白', '清淡少油', '多样化饮食'],
      dinner: ['清淡为主', '少油少盐', '蔬菜多多', '粗细搭配', '七分饱', '汤水适量', '轻松进食'],
      tea: ['枸杞菊花茶', '绿茶', '红枣茶'],
    },
  };

  var m = meals[constitutionType] || meals['平和质'];
  var plan = [];
  var days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  for (var i = 0; i < 7; i++) {
    plan.push({ day: days[i], breakfast: m.breakfast[i % m.breakfast.length], lunch: m.lunch[i % m.lunch.length], dinner: m.dinner[i % m.dinner.length], tea: m.tea[i % m.tea.length] });
  }
  return plan;
}

// ── Generate 7-day challenge ──
function generateChallenge(constitutionType, info) {
  var list = [];
  for (var d = 0; d < 7; d++) {
    var tasks = [];
    if (info.foods && info.foods.length) tasks.push('吃含' + info.foods[d % info.foods.length] + '的餐食');
    if (info.exercises && info.exercises.length) tasks.push(info.exercises[d % info.exercises.length] + ' 30分钟');
    tasks.push('喝推荐的养生茶');
    list.push({ day: d + 1, title: '第' + (d + 1) + '天：' + (info.exercises ? info.exercises[d % info.exercises.length] : '坚持调理'), detail: '目标：' + tasks.join('；') + '。坚持就是胜利！' });
  }
  return list;
}

// ── Simple Q&A ──
function answerQuestion(question, constitutionType, info) {
  var q = question;
  if (q.indexOf('吃') !== -1 || q.indexOf('饮食') !== -1 || q.indexOf('食物') !== -1) return info.dietPrinciples + '\n\n推荐食材：' + info.foods.join('、') + '\n\n避免：' + info.avoid.join('、') + '\n\n推荐茶饮：' + info.tea;
  if (q.indexOf('运动') !== -1 || q.indexOf('锻炼') !== -1 || q.indexOf('健身') !== -1) return info.dailyTips + '\n\n推荐运动：' + info.exercises.join('、');
  if (q.indexOf('穴位') !== -1 || q.indexOf('按摩') !== -1 || q.indexOf('按压') !== -1) return '推荐穴位：' + info.acupoints + '。每天按压每个穴位2-3分钟，以酸胀为度。';
  if (q.indexOf('茶') !== -1) return '推荐养生茶：' + info.tea;
  if (q.indexOf('季节') !== -1 || q.indexOf('四季') !== -1 || q.indexOf('春') !== -1 || q.indexOf('夏') !== -1 || q.indexOf('秋') !== -1 || q.indexOf('冬') !== -1) return info.seasonalTips;
  if (q.indexOf('情绪') !== -1 || q.indexOf('心情') !== -1 || q.indexOf('压力') !== -1) return info.mood;
  if (q.indexOf('注意') !== -1 || q.indexOf('禁忌') !== -1 || q.indexOf('避免') !== -1) return info.warning;
  return info.description + '\n\n核心调理原则：' + info.principles + '\n\n' + info.dietPrinciples + '\n\n' + info.dailyTips;
}

// ── Setup Express routes ──
function setupRoutes(app, auth, requireVip) {
  var gQ = function() { return global.queryOne.apply(null, arguments); };
  var gA = function() { return global.queryAll.apply(null, arguments); };

  // Get comprehensive constitution analysis
  app.get('/api/ai/constitution-analysis', auth, function(req, res) {
    try {
      var user = gQ('SELECT * FROM users WHERE id = ?', [req.userId]);
      if (!user) return res.status(404).json({ detail: 'User not found' });
      var ct = user.constitution_type;
      if (!ct) return res.status(400).json({ detail: '请先完成体质测评', code: 'no_constitution' });
      var record = gQ('SELECT scores FROM constitution_records WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
      var scores = record ? JSON.parse(record.scores) : null;
      res.json(generateConstitutionAnalysis(ct, scores, user));
    } catch (e) { console.error(e); res.status(500).json({ detail: '生成分析失败' }); }
  });

  // Ask a question
  app.post('/api/ai/ask', auth, function(req, res) {
    var question = (req.body || {}).question;
    var ct = (req.body || {}).constitution_type;
    if (!question) return res.status(400).json({ detail: 'question required' });
    var info = CONSTITUTION_INFO[ct];
    if (!info) ct = '平和质';
    info = CONSTITUTION_INFO[ct] || CONSTITUTION_INFO['平和质'];
    res.json({ question: question, answer: answerQuestion(question, ct, info), ai_generated: false });
  });

  // Daily tip
  app.get('/api/ai/daily-tip', auth, function(req, res) {
    try {
      var user = gQ('SELECT * FROM users WHERE id = ?', [req.userId]);
      var ct = (user && user.constitution_type) || '平和质';
      var info = CONSTITUTION_INFO[ct] || CONSTITUTION_INFO['平和质'];
      var today = new Date();
      var doy = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
      res.json({ date: today.toISOString().slice(0, 10), constitution: ct, tip: {
        food_tip: info.foods[doy % info.foods.length],
        exercise_tip: info.exercises[doy % info.exercises.length],
        tea_tip: info.tea,
        mood_tip: info.mood.split('。')[0] + '。',
      }});
    } catch (e) { res.status(500).json({ detail: e.message }); }
  });

  // Symptom check
  app.post('/api/ai/symptom-advice', auth, function(req, res) {
    var symptoms = (req.body || {}).symptoms || '';
    if (!symptoms) return res.status(400).json({ detail: '请描述您的症状' });
    var matched = [];
    for (var type in CONSTITUTION_INFO) {
      if (!CONSTITUTION_INFO.hasOwnProperty(type)) continue;
      var info2 = CONSTITUTION_INFO[type];
      if (symptoms.indexOf(type.replace('质', '')) !== -1) matched.push({ type: type, match: 'direct', relevance: 2 });
      for (var fi = 0; fi < info2.foods.length; fi++) {
        if (symptoms.indexOf(info2.foods[fi]) !== -1) matched.push({ type: type, food: info2.foods[fi], relevance: 1 });
      }
    }
    var seen = {};
    var unique = [];
    for (var mi = 0; mi < matched.length; mi++) {
      if (!seen[matched[mi].type]) { seen[matched[mi].type] = true; unique.push(matched[mi]); }
    }
    res.json({ symptoms: symptoms, possible_types: unique.slice(0, 3).map(function(m) { return m.type; }), matched_foods: matched.slice(0, 10), general_advice: '建议结合具体体质进行针对性调理。如果症状持续，请咨询中医师。' });
  });

  // Health insights (analysis of diary data)
  app.get('/api/ai/health-insights', auth, function(req, res) {
    try {
      var user = gQ('SELECT * FROM users WHERE id = ?', [req.userId]);
      if (!user) return res.status(404).json({ detail: 'User not found' });
      var ct = user.constitution_type || '平和质';
      var info = CONSTITUTION_INFO[ct] || CONSTITUTION_INFO['平和质'];
      var diaries = gA('SELECT * FROM health_diaries WHERE user_id = ? ORDER BY record_date DESC LIMIT 7', [req.userId]);
      var avgSleep = 0, avgExercise = 0, avgMood = 0, dc = diaries.length;
      for (var di = 0; di < diaries.length; di++) { avgSleep += diaries[di].sleep_hours || 0; avgExercise += diaries[di].exercise_minutes || 0; avgMood += diaries[di].mood_score || 3; }
      if (dc > 0) { avgSleep = Math.round(avgSleep / dc * 10) / 10; avgExercise = Math.round(avgExercise / dc); avgMood = Math.round(avgMood / dc * 10) / 10; }

      var insights = [];
      if (avgSleep > 0) {
        if (avgSleep < 6) insights.push('您的平均睡眠' + avgSleep + '小时，偏少。建议晚11点前入睡，保证7-8小时。');
        else if (avgSleep >= 7 && avgSleep <= 8) insights.push('睡眠状况良好（' + avgSleep + '小时/天），请保持！');
        else insights.push('睡眠' + avgSleep + '小时。如果超过9小时仍疲倦，关注是否气虚。');
      } else { insights.push('暂未记录睡眠数据。'); }
      if (avgExercise > 0) {
        if (avgExercise < 20) insights.push('平均运动' + avgExercise + '分钟，建议增加到30分钟以上。适合的运动：' + info.exercises.slice(0,3).join('、') + '。');
        else if (avgExercise >= 30) insights.push('运动量充足（' + avgExercise + '分钟/天），很好！');
        else insights.push('运动量适中，争取达到每日30分钟。');
      }
      if (ct !== '平和质') { insights.push('主要体质为' + ct + '，' + info.description + '。建议参考饮食调理。'); }
      else { insights.push('您属于平和质，继续保持良好习惯。'); }

      var score = 0;
      if (avgSleep >= 7 && avgSleep <= 8) score += 35; else if (avgSleep >= 6) score += 25; else if (avgSleep > 0) score += 15;
      if (avgExercise >= 30) score += 30; else if (avgExercise >= 20) score += 20; else if (avgExercise > 0) score += 10;
      if (avgMood >= 4) score += 20; else if (avgMood >= 3) score += 15; else if (avgMood > 0) score += 5;
      score += Math.min(dc * 2, 15);

      res.json({ user_name: user.nickname || user.username, constitution: ct, period_days: dc, avg_sleep: avgSleep, avg_exercise: avgExercise, avg_mood: avgMood, overall_score: Math.min(100, score), insights: insights, daily_recommendation: info.dailyTips, ai_generated: false });
    } catch (e) { console.error(e); res.status(500).json({ detail: '生成健康洞察失败' }); }
  });
}

module.exports = { generateConstitutionAnalysis, setupRoutes, USE_AI, ACTIVE_PROVIDER };
