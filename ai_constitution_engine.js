/**
 * AI智能辨体引擎 — 升级版体质检测
 * 功能：AI舌象采集、脉象波形分析、语音问诊、一键配菜与食疗生成
 * 
 * 多维检测流程：
 * 1. 用户拍舌头 → AI舌象分析（舌色/舌形/舌苔/舌下络脉）
 * 2. 语音描述症状 → NLP提取关键证候
 * 3. 结合传统问卷 → 综合辨体
 * 4. 一键生成食疗方案 + 商城商品智能排序
 */
var path = require('path');

var CONSTITUTION_INFO = (function() {
  try { return require('./constitution_data.json'); } catch(e) {}
  try { return require(path.join(__dirname, 'constitution_data.json')); } catch(e) {}
  return {};
})();

// ══════════════════════════════════════════
// 舌象分析知识库
// ══════════════════════════════════════════
var TONGUE_KNOWLEDGE = {
  tongue_color: {
    '淡白': { constitutions: ['阳虚质', '气虚质'], description: '气血不足，阳气偏衰', severity: 'moderate' },
    '淡红': { constitutions: ['平和质'], description: '气血调和，正常舌色', severity: 'normal' },
    '红': { constitutions: ['阴虚质', '湿热质'], description: '热证，阴虚内热或湿热内蕴', severity: 'moderate' },
    '绛红': { constitutions: ['阴虚质'], description: '阴虚火旺，热入营血', severity: 'severe' },
    '紫暗': { constitutions: ['血瘀质'], description: '气血运行不畅，血瘀内阻', severity: 'severe' },
    '青紫': { constitutions: ['血瘀质', '气郁质'], description: '气滞血瘀，经脉不通', severity: 'severe' },
  },
  tongue_body: {
    '胖大有齿痕': { constitutions: ['气虚质', '阳虚质', '痰湿质'], description: '脾虚湿盛，阳气不足' },
    '瘦薄': { constitutions: ['阴虚质', '血瘀质'], description: '阴血不足，津液亏损' },
    '正常': { constitutions: ['平和质'], description: '形体适中' },
    '裂纹': { constitutions: ['阴虚质'], description: '阴液亏损，精血不足' },
    '芒刺': { constitutions: ['湿热质', '阴虚质'], description: '热邪亢盛' },
  },
  tongue_coating: {
    '薄白': { constitutions: ['平和质'], description: '正常舌苔', severity: 'normal' },
    '白腻': { constitutions: ['痰湿质', '阳虚质'], description: '寒湿内盛，脾阳不振', severity: 'moderate' },
    '黄腻': { constitutions: ['湿热质'], description: '湿热内蕴', severity: 'moderate' },
    '厚腻': { constitutions: ['痰湿质'], description: '痰湿壅盛', severity: 'severe' },
    '少苔/无苔': { constitutions: ['阴虚质'], description: '胃阴不足，气阴两虚', severity: 'moderate' },
    '灰黑': { constitutions: ['阳虚质', '湿热质'], description: '里证重证', severity: 'severe' },
  },
  sublingual_vein: {
    '正常淡紫': { constitutions: ['平和质'], description: '气血运行正常' },
    '紫暗粗大': { constitutions: ['血瘀质'], description: '血瘀明显' },
    '怒张': { constitutions: ['血瘀质', '气郁质'], description: '气滞血瘀' },
    '淡细': { constitutions: ['气虚质', '阳虚质'], description: '气血不足' },
  }
};

// ══════════════════════════════════════════
// 语音问诊关键词映射
// ══════════════════════════════════════════
var VOICE_SYMPTOM_MAP = {
  '气虚质': {
    keywords: ['乏力', '疲倦', '气短', '懒言', '自汗', '容易感冒', '说话没力气', '动一下就累', '没精神', '体力差'],
    follow_up: '您是否经常感到稍微活动就气喘出汗？是否容易反复感冒？'
  },
  '阳虚质': {
    keywords: ['怕冷', '手脚冰凉', '畏寒', '喜热饮', '夜尿多', '腰膝酸冷', '腹部冷痛', '吃凉的拉肚子', '冬天难受'],
    follow_up: '您是否即使在温暖环境中也手脚发凉？是否喜欢喝热饮、吃热食？'
  },
  '阴虚质': {
    keywords: ['口干', '咽干', '手脚心热', '盗汗', '失眠', '心烦', '大便干', '两颧潮红', '晚上燥热', '皮肤干'],
    follow_up: '您是否夜间容易出汗（盗汗）？手心脚心是否经常发热？'
  },
  '痰湿质': {
    keywords: ['痰多', '体胖', '胸闷', '身重', '油腻', '嗜睡', '腹部肥满', '口黏', '面部油', '容易出汗'],
    follow_up: '您是否体型偏胖，尤其腹部松软？是否经常感觉身体沉重？'
  },
  '湿热质': {
    keywords: ['口苦', '口臭', '长痘', '小便黄', '大便黏', '阴囊潮湿', '白带多', '面垢油光', '容易上火', '口舌生疮'],
    follow_up: '您是否面部容易出油长痘？是否经常口苦口臭？'
  },
  '血瘀质': {
    keywords: ['疼痛', '刺痛', '面色暗', '唇色暗', '皮肤粗糙', '色素沉着', '黑眼圈', '痛经', '有血块', '青筋'],
    follow_up: '您是否经常出现固定位置的刺痛？皮肤是否容易出现淤青？'
  },
  '气郁质': {
    keywords: ['抑郁', '焦虑', '胸闷', '叹气', '情绪不稳', '善叹息', '烦躁', '郁闷', '想不开', '心烦意乱'],
    follow_up: '您是否经常不由自主地叹气？情绪是否容易低落或波动？'
  },
  '特禀质': {
    keywords: ['过敏', '打喷嚏', '荨麻疹', '哮喘', '花粉', '海鲜过敏', '鼻炎', '皮肤瘙痒', '起红疹', '对XX过敏'],
    follow_up: '您是否有明确的过敏原？是否在特定季节或接触特定物质后出现过敏症状？'
  }
};

// ══════════════════════════════════════════
// 商品与体质适配度评分
// ══════════════════════════════════════════
var FOOD_CONSTITUTION_FIT = {
  '薏米': { fit: ['痰湿质', '湿热质'], avoid: ['阳虚质', '气虚质'], score: { '痰湿质': 95, '湿热质': 90, '阳虚质': 20, '气虚质': 30 } },
  '红豆': { fit: ['痰湿质', '血瘀质'], avoid: [], score: { '痰湿质': 90, '血瘀质': 70 } },
  '山药': { fit: ['气虚质', '阴虚质', '平和质'], avoid: ['湿热质'], score: { '气虚质': 95, '阴虚质': 80, '平和质': 85, '湿热质': 30 } },
  '黄芪': { fit: ['气虚质', '阳虚质'], avoid: ['阴虚质', '湿热质'], score: { '气虚质': 98, '阳虚质': 85, '阴虚质': 15, '湿热质': 20 } },
  '枸杞': { fit: ['阴虚质', '血瘀质', '平和质'], avoid: ['湿热质'], score: { '阴虚质': 90, '血瘀质': 70, '平和质': 80, '湿热质': 35 } },
  '红枣': { fit: ['气虚质', '血瘀质', '阳虚质'], avoid: ['湿热质', '痰湿质'], score: { '气虚质': 90, '血瘀质': 75, '阳虚质': 85, '湿热质': 25, '痰湿质': 30 } },
  '百合': { fit: ['阴虚质', '气郁质'], avoid: ['阳虚质'], score: { '阴虚质': 92, '气郁质': 80, '阳虚质': 30 } },
  '玫瑰花': { fit: ['气郁质', '血瘀质'], avoid: [], score: { '气郁质': 95, '血瘀质': 85 } },
  '菊花': { fit: ['阴虚质', '湿热质'], avoid: ['阳虚质'], score: { '阴虚质': 80, '湿热质': 85, '阳虚质': 25 } },
  '陈皮': { fit: ['痰湿质', '气郁质'], avoid: ['阴虚质'], score: { '痰湿质': 92, '气郁质': 78, '阴虚质': 30 } },
  '生姜': { fit: ['阳虚质', '气虚质', '血瘀质'], avoid: ['阴虚质', '湿热质'], score: { '阳虚质': 95, '气虚质': 80, '血瘀质': 75, '阴虚质': 15, '湿热质': 20 } },
  '银耳': { fit: ['阴虚质', '气虚质'], avoid: ['痰湿质'], score: { '阴虚质': 95, '气虚质': 70, '痰湿质': 30 } },
  '绿豆': { fit: ['湿热质'], avoid: ['阳虚质', '气虚质'], score: { '湿热质': 95, '阳虚质': 15, '气虚质': 20 } },
  '山楂': { fit: ['血瘀质', '痰湿质'], avoid: ['气虚质'], score: { '血瘀质': 92, '痰湿质': 80, '气虚质': 30 } },
  '桂圆': { fit: ['气虚质', '阳虚质', '血瘀质'], avoid: ['湿热质', '阴虚质'], score: { '气虚质': 88, '阳虚质': 85, '血瘀质': 75, '湿热质': 20, '阴虚质': 25 } },
  '莲子': { fit: ['气虚质', '阴虚质', '气郁质'], avoid: [], score: { '气虚质': 82, '阴虚质': 78, '气郁质': 70 } },
  '黑芝麻': { fit: ['阴虚质', '血瘀质'], avoid: ['痰湿质'], score: { '阴虚质': 88, '血瘀质': 72, '痰湿质': 35 } },
  '党参': { fit: ['气虚质', '阳虚质'], avoid: ['阴虚质', '湿热质'], score: { '气虚质': 92, '阳虚质': 78, '阴虚质': 25, '湿热质': 20 } },
  '茯苓': { fit: ['痰湿质', '气虚质'], avoid: ['阴虚质'], score: { '痰湿质': 90, '气虚质': 80, '阴虚质': 35 } },
  '肉桂': { fit: ['阳虚质', '血瘀质'], avoid: ['阴虚质', '湿热质'], score: { '阳虚质': 95, '血瘀质': 70, '阴虚质': 15, '湿热质': 15 } },
  '薄荷': { fit: ['气郁质', '湿热质'], avoid: ['阳虚质'], score: { '气郁质': 85, '湿热质': 75, '阳虚质': 25 } },
  '佛手': { fit: ['气郁质'], avoid: [], score: { '气郁质': 90 } },
  '蜂蜜': { fit: ['阴虚质', '气虚质', '平和质'], avoid: ['痰湿质', '湿热质'], score: { '阴虚质': 80, '气虚质': 72, '平和质': 78, '痰湿质': 30, '湿热质': 25 } },
  '冬虫夏草': { fit: ['气虚质', '阳虚质', '阴虚质'], avoid: ['湿热质'], score: { '气虚质': 88, '阳虚质': 85, '阴虚质': 82, '湿热质': 25 } },
};

// ══════════════════════════════════════════
// AI舌象分析（模拟，需对接实际AI视觉模型）
// ══════════════════════════════════════════
function analyzeTongue(tongueData) {
  // tongueData: { color, body, coating, sublingual_vein, image_features }
  var results = {
    tongue_color: tongueData.color || '淡红',
    tongue_body: tongueData.body || '正常',
    tongue_coating: tongueData.coating || '薄白',
    sublingual_vein: tongueData.sublingual_vein || '正常淡紫',
    analysis: {},
    constitution_scores: {},
    confidence: 0
  };

  // 分析每个维度
  var colorInfo = TONGUE_KNOWLEDGE.tongue_color[results.tongue_color] || TONGUE_KNOWLEDGE.tongue_color['淡红'];
  var bodyInfo = TONGUE_KNOWLEDGE.tongue_body[results.tongue_body] || TONGUE_KNOWLEDGE.tongue_body['正常'];
  var coatInfo = TONGUE_KNOWLEDGE.tongue_coating[results.tongue_coating] || TONGUE_KNOWLEDGE.tongue_coating['薄白'];
  var veinInfo = TONGUE_KNOWLEDGE.sublingual_vein[results.sublingual_vein] || TONGUE_KNOWLEDGE.sublingual_vein['正常淡紫'];

  results.analysis = {
    tongue_color: colorInfo.description,
    tongue_body: bodyInfo.description,
    tongue_coating: coatInfo.description,
    sublingual_vein: veinInfo.description
  };

  // 计算体质评分
  var scoreMap = {};
  function addScores(constitutions, weight) {
    for (var i = 0; i < constitutions.length; i++) {
      var ct = constitutions[i];
      scoreMap[ct] = (scoreMap[ct] || 0) + weight;
    }
  }
  addScores(colorInfo.constitutions, 4); // 舌色权重最高
  addScores(bodyInfo.constitutions, 3);  // 舌体次之
  addScores(coatInfo.constitutions, 3);  // 舌苔
  addScores(veinInfo.constitutions, 2);  // 舌下络脉

  results.constitution_scores = scoreMap;
  
  // 确定主体质
  var sorted = [];
  for (var k in scoreMap) {
    if (scoreMap.hasOwnProperty(k)) sorted.push({ type: k, score: scoreMap[k] });
  }
  sorted.sort(function(a, b) { return b.score - a.score; });
  results.primary_type = sorted.length > 0 ? sorted[0].type : '平和质';
  results.secondary_type = sorted.length > 1 ? sorted[1].type : null;
  results.sorted_results = sorted;

  // 置信度
  if (sorted.length >= 2) {
    results.confidence = Math.min(0.95, sorted[0].score / (sorted[0].score + (sorted[1] ? sorted[1].score * 0.5 : 0)));
  } else {
    results.confidence = 0.5;
  }

  return results;
}

// ══════════════════════════════════════════
// 语音问诊分析
// ══════════════════════════════════════════
function analyzeVoiceSymptoms(text) {
  if (!text) return { matched_types: [], keywords_found: {}, follow_ups: [], confidence: 0 };
  
  var results = { matched_types: [], keywords_found: {}, follow_ups: [], constitution_scores: {}, confidence: 0 };
  
  for (var ct in VOICE_SYMPTOM_MAP) {
    if (!VOICE_SYMPTOM_MAP.hasOwnProperty(ct)) continue;
    var data = VOICE_SYMPTOM_MAP[ct];
    var found = [];
    for (var i = 0; i < data.keywords.length; i++) {
      if (text.indexOf(data.keywords[i]) !== -1) {
        found.push(data.keywords[i]);
      }
    }
    if (found.length > 0) {
      results.matched_types.push(ct);
      results.keywords_found[ct] = found;
      results.follow_ups.push({ type: ct, question: data.follow_up });
      results.constitution_scores[ct] = found.length * 2; // 每个关键词2分
    }
  }

  results.matched_types.sort(function(a, b) {
    return (results.constitution_scores[b] || 0) - (results.constitution_scores[a] || 0);
  });

  results.confidence = results.matched_types.length > 0 ? Math.min(0.85, results.matched_types[0] && results.keywords_found[results.matched_types[0]] ? results.keywords_found[results.matched_types[0]].length / 4 : 0) : 0;

  return results;
}

// ══════════════════════════════════════════
// 综合辨体（融合问卷+舌象+语音）
// ══════════════════════════════════════════
function comprehensiveAssessment(questionnaireScores, tongueResult, voiceResult) {
  var combined = {};
  
  // 问卷评分（权重50%）
  if (questionnaireScores) {
    for (var ct in questionnaireScores) {
      if (questionnaireScores.hasOwnProperty(ct)) {
        combined[ct] = (combined[ct] || 0) + questionnaireScores[ct] * 0.5;
      }
    }
  }
  
  // 舌象评分（权重30%）
  if (tongueResult && tongueResult.constitution_scores) {
    for (var ct in tongueResult.constitution_scores) {
      if (tongueResult.constitution_scores.hasOwnProperty(ct)) {
        combined[ct] = (combined[ct] || 0) + tongueResult.constitution_scores[ct] * 3; // 舌象权重3
      }
    }
  }
  
  // 语音问诊评分（权重20%）
  if (voiceResult && voiceResult.constitution_scores) {
    for (var ct in voiceResult.constitution_scores) {
      if (voiceResult.constitution_scores.hasOwnProperty(ct)) {
        combined[ct] = (combined[ct] || 0) + voiceResult.constitution_scores[ct] * 2; // 语音权重2
      }
    }
  }

  var sorted = [];
  for (var k in combined) {
    if (combined.hasOwnProperty(k)) sorted.push({ type: k, score: combined[k] });
  }
  sorted.sort(function(a, b) { return b.score - a.score; });

  var primary = sorted.length > 0 ? sorted[0].type : '平和质';
  var secondary = sorted.length > 1 && sorted[1].score > sorted[0].score * 0.5 ? sorted[1].type : null;

  return {
    primary_type: primary,
    secondary_type: secondary,
    all_scores: combined,
    sorted_results: sorted,
    data_sources: {
      questionnaire: !!questionnaireScores,
      tongue: !!tongueResult,
      voice: !!voiceResult
    },
    confidence: calculateConfidence(sorted)
  };
}

function calculateConfidence(sorted) {
  if (sorted.length === 0) return 0;
  var top = sorted[0].score;
  var second = sorted.length > 1 ? sorted[1].score : 0;
  var total = 0;
  for (var i = 0; i < sorted.length; i++) total += sorted[i].score;
  if (total === 0) return 0;
  return Math.min(0.98, top / total + (top - second) / total * 0.3);
}

// ══════════════════════════════════════════
// 一键配菜：基于体质的商品智能排序
// ══════════════════════════════════════════
function rankProductsForConstitution(products, constitutionType) {
  if (!products || !products.length) return [];
  
  var ranked = [];
  for (var i = 0; i < products.length; i++) {
    var p = products[i];
    var fitScore = 50; // 默认中等适配度
    var tag = '一般';
    var reason = '';
    
    // 在食材名中查找匹配
    var name = (p.name || '') + (p.description || '');
    var bestFood = null;
    var bestScore = 0;
    
    for (var food in FOOD_CONSTITUTION_FIT) {
      if (!FOOD_CONSTITUTION_FIT.hasOwnProperty(food)) continue;
      if (name.indexOf(food) !== -1) {
        var fd = FOOD_CONSTITUTION_FIT[food];
        var sc = fd.score[constitutionType] || 50;
        if (sc > bestScore) {
          bestScore = sc;
          bestFood = food;
          fitScore = sc;
        }
      }
    }

    // 根据体质信息调整
    var info = CONSTITUTION_INFO[constitutionType];
    if (info && name) {
      // 宜吃加分
      for (var fi = 0; fi < (info.foods || []).length; fi++) {
        if (name.indexOf(info.foods[fi]) !== -1) {
          fitScore = Math.max(fitScore, 88);
          break;
        }
      }
      // 忌口减分
      for (var ai = 0; ai < (info.avoid || []).length; ai++) {
        if (name.indexOf(info.avoid[ai]) !== -1) {
          fitScore = Math.min(fitScore, 25);
          break;
        }
      }
      // 推荐茶饮加分
      if (info.tea && name.indexOf(info.tea) !== -1) {
        fitScore = Math.max(fitScore, 92);
      }
    }

    // 设置标签
    if (fitScore >= 85) {
      tag = '🌟 宜吃';
      reason = '非常适合' + constitutionType + '人群';
    } else if (fitScore >= 65) {
      tag = '✅ 适合';
      reason = '较适合' + constitutionType + '人群';
    } else if (fitScore >= 45) {
      tag = '一般';
      reason = '可适量食用';
    } else if (fitScore >= 30) {
      tag = '⚠️ 少吃';
      reason = constitutionType + '人群建议少吃';
    } else {
      tag = '❌ 忌口';
      reason = constitutionType + '人群不建议食用';
    }

    ranked.push({
      product: p,
      fit_score: fitScore,
      tag: tag,
      reason: reason,
      matched_food: bestFood
    });
  }

  // 按适配度从高到低排序
  ranked.sort(function(a, b) { return b.fit_score - a.fit_score; });
  return ranked;
}

// ══════════════════════════════════════════
// 生成个性化食疗方案
// ══════════════════════════════════════════
function generateDietPlan(constitutionType, userProfile) {
  var info = CONSTITUTION_INFO[constitutionType] || CONSTITUTION_INFO['平和质'];
  var age = userProfile && userProfile.birth_year ? new Date().getFullYear() - userProfile.birth_year : 30;
  var gender = userProfile && userProfile.gender ? userProfile.gender : '';
  
  var plan = {
    constitution_type: constitutionType,
    description: info.description || '',
    core_principles: info.principles || '',
    diet_principles: info.dietPrinciples || '',
    
    // 分场景推荐
    scenarios: [],
    
    // 宜吃忌口清单
    recommended_foods: info.foods || [],
    avoid_foods: info.avoid || [],
    recommended_tea: info.tea || '',
    
    // 商城关联推荐
    shop_recommendations: []
  };

  // 人群场景推荐
  if (age >= 60) {
    plan.scenarios.push({
      group: '老年人',
      focus: '慢性病管理 · 延缓衰老',
      tips: [
        '饮食宜温热软烂，忌生冷硬食',
        '少食多餐，每餐七分饱',
        '适当补充钙质和优质蛋白'
      ],
      food_focus: info.foods ? info.foods.slice(0, 3).concat(['黑芝麻', '核桃', '山药']) : [],
      exercise: '太极、八段锦、散步'
    });
  } else if (age >= 35 && age < 60) {
    plan.scenarios.push({
      group: '中年人',
      focus: '防御型养生 · 抗疲劳',
      tips: [
        '注意规律作息，避免熬夜',
        '适当疏肝理气，缓解压力',
        '控制体重，预防代谢疾病'
      ],
      food_focus: info.foods ? info.foods.slice(0, 3).concat(['枸杞', '菊花', '陈皮']) : [],
      exercise: '快走、游泳、瑜伽'
    });
    if (gender === '女' || gender === 'female') {
      plan.scenarios.push({
        group: '女性专属',
        focus: '气血调理 · 情绪管理',
        tips: [
          '经前一周疏肝理气，可饮玫瑰花茶',
          '经期注意保暖，忌寒凉',
          '日常补充铁质和维生素C'
        ],
        food_focus: ['红枣', '桂圆', '玫瑰花', '当归'],
        exercise: '瑜伽、普拉提、散步'
      });
    }
  } else if (age <= 3) {
    plan.scenarios.push({
      group: '婴幼儿',
      focus: '脾胃调理 · 营养均衡',
      tips: [
        '辅食添加循序渐进',
        '注重脾胃养护，避免积食',
        '适当小儿推拿助消化'
      ],
      food_focus: ['山药', '莲子', '山楂', '薏米'],
      exercise: '小儿推拿、被动操'
    });
  } else {
    plan.scenarios.push({
      group: '青年人',
      focus: '体质改善 · 习惯养成',
      tips: [
        '避免长期熬夜和外卖',
        '适量运动，增强体质',
        '建立规律饮食习惯'
      ],
      food_focus: info.foods ? info.foods.slice(0, 5) : [],
      exercise: info.exercises ? info.exercises.slice(0, 3).join('、') : '跑步、游泳、瑜伽'
    });
  }

  // 商城关联推荐
  for (var food in FOOD_CONSTITUTION_FIT) {
    if (!FOOD_CONSTITUTION_FIT.hasOwnProperty(food)) continue;
    var fd = FOOD_CONSTITUTION_FIT[food];
    if (fd.fit.indexOf(constitutionType) !== -1) {
      plan.shop_recommendations.push({
        food: food,
        score: fd.score[constitutionType] || 80,
        reason: fd.fit.indexOf(constitutionType) !== -1 ? '宜吃' : '适合'
      });
    }
  }
  plan.shop_recommendations.sort(function(a, b) { return b.score - a.score; });

  return plan;
}

// ══════════════════════════════════════════
// Express 路由
// ══════════════════════════════════════════
function setupRoutes(app, auth) {
  var gQ = function() { return global.queryOne.apply(null, arguments); };
  var gA = function() { return global.queryAll.apply(null, arguments); };
  var gR = function() { return global.queryRun.apply(null, arguments); };

  // 1. AI舌象分析
  app.post('/api/ai/tongue-analysis', auth, function(req, res) {
    try {
      var data = req.body || {};
      var result = analyzeTongue({
        color: data.tongue_color,
        body: data.tongue_body,
        coating: data.tongue_coating,
        sublingual_vein: data.sublingual_vein,
        image_features: data.image_features
      });
      res.json(result);
    } catch (e) {
      console.error('Tongue analysis error:', e);
      res.status(500).json({ detail: '舌象分析失败' });
    }
  });

  // 2. 语音问诊分析
  app.post('/api/ai/voice-consultation', auth, function(req, res) {
    try {
      var text = (req.body || {}).text || '';
      if (!text.trim()) return res.status(400).json({ detail: '请描述您的症状' });
      var result = analyzeVoiceSymptoms(text);
      res.json(result);
    } catch (e) {
      console.error('Voice consultation error:', e);
      res.status(500).json({ detail: '语音问诊分析失败' });
    }
  });

  // 3. 综合辨体（融合三种数据源）
  app.post('/api/ai/comprehensive-assessment', auth, function(req, res) {
    try {
      var data = req.body || {};
      var user = gQ('SELECT * FROM users WHERE id = ?', [req.userId]);
      if (!user) return res.status(404).json({ detail: 'User not found' });
      
      var questionnaireScores = data.questionnaire_scores || null;
      var tongueResult = data.tongue_result || null;
      var voiceResult = data.voice_result || null;

      // 如果有问卷ID，从数据库获取
      if (data.record_id && !questionnaireScores) {
        var record = gQ('SELECT scores FROM constitution_records WHERE id = ? AND user_id = ?', [data.record_id, req.userId]);
        if (record) questionnaireScores = JSON.parse(record.scores);
      }

      var result = comprehensiveAssessment(questionnaireScores, tongueResult, voiceResult);
      
      // 保存综合辨体结果
      var detail = JSON.stringify({
        primary: result.primary_type,
        secondary: result.secondary_type,
        confidence: result.confidence,
        sources: result.data_sources,
        scores: result.all_scores
      });

      gR('INSERT INTO constitution_records (user_id, result_type, scores, detail) VALUES (?, ?, ?, ?)',
        [req.userId, result.primary_type, JSON.stringify(result.all_scores), detail]);
      
      // 更新用户体质
      gR('UPDATE users SET constitution_type = ? WHERE id = ?', [result.primary_type, req.userId]);
      
      res.json(result);
    } catch (e) {
      console.error('Comprehensive assessment error:', e);
      res.status(500).json({ detail: '综合辨体失败' });
    }
  });

  // 4. 一键配菜 — 基于体质的商品智能排序
  app.get('/api/ai/smart-shop', auth, function(req, res) {
    try {
      var user = gQ('SELECT * FROM users WHERE id = ?', [req.userId]);
      if (!user) return res.status(404).json({ detail: 'User not found' });
      var ct = user.constitution_type || '平和质';
      
      var products = gA('SELECT * FROM shop_products WHERE stock > 0');
      var ranked = rankProductsForConstitution(products, ct);
      
      res.json({
        constitution_type: ct,
        total: ranked.length,
        products: ranked
      });
    } catch (e) {
      console.error('Smart shop error:', e);
      res.status(500).json({ detail: '智能推荐失败' });
    }
  });

  // 5. 个性化食疗方案
  app.get('/api/ai/diet-plan', auth, function(req, res) {
    try {
      var user = gQ('SELECT * FROM users WHERE id = ?', [req.userId]);
      if (!user) return res.status(404).json({ detail: 'User not found' });
      var ct = user.constitution_type;
      if (!ct) return res.status(400).json({ detail: '请先完成体质测评', code: 'no_constitution' });
      
      var plan = generateDietPlan(ct, user);
      res.json(plan);
    } catch (e) {
      console.error('Diet plan error:', e);
      res.status(500).json({ detail: '生成食疗方案失败' });
    }
  });

  // 6. 获取舌象采集指导
  app.get('/api/ai/tongue-guide', auth, function(req, res) {
    res.json({
      instructions: [
        '请在自然光线下拍摄',
        '伸出舌头，自然放松，不要用力',
        '拍摄前1小时内避免进食、饮水、刷舌苔',
        '正面拍摄舌面，侧面拍摄舌边',
        '翘起舌尖拍摄舌下络脉'
      ],
      capture_steps: [
        { step: 1, title: '舌面正面', description: '自然伸出舌头，正面拍摄' },
        { step: 2, title: '舌面侧面', description: '舌头稍偏，拍摄舌边颜色' },
        { step: 3, title: '舌下络脉', description: '翘起舌尖，拍摄舌底静脉' }
      ],
      tips: '良好的舌象照片是AI精准辨体的基础，请尽量按指导拍摄。'
    });
  });

  // 7. 语音问诊引导问题
  app.get('/api/ai/voice-questions', auth, function(req, res) {
    var user = gQ('SELECT * FROM users WHERE id = ?', [req.userId]);
    var ct = user && user.constitution_type;
    
    var baseQuestions = [
      '您最近有什么不舒服的地方吗？请描述一下。',
      '您的睡眠质量如何？容易入睡吗？会中途醒来吗？',
      '您的胃口怎么样？有没有口干、口苦、口臭？',
      '大便情况如何？成形吗？颜色和频率？',
      '情绪方面怎么样？容易焦虑或低落吗？'
    ];

    var followUps = [];
    if (ct && VOICE_SYMPTOM_MAP[ct]) {
      followUps.push(VOICE_SYMPTOM_MAP[ct].follow_up);
    }

    res.json({ base_questions: baseQuestions, follow_ups: followUps, current_constitution: ct });
  });
}

module.exports = {
  analyzeTongue,
  analyzeVoiceSymptoms,
  comprehensiveAssessment,
  rankProductsForConstitution,
  generateDietPlan,
  setupRoutes
};
