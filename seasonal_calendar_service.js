/**
 * 节气日历 + 任务打卡服务
 * 功能：24节气养生日历、每日健康小任务、积分奖励、游戏化打卡
 * 
 * 核心机制：
 * 1. 节气日历：后台配置24节气及换季高风险期，自动推送饮食/作息方案
 * 2. 每日任务：根据体质+节气+人群，派发个性化轻量级任务
 * 3. 积分体系：完成任务获得积分，积分兑换商城优惠券
 * 4. 连续打卡：streak机制，连续打卡加倍奖励
 */
var path = require('path');

var CONSTITUTION_INFO = (function() {
  try { return require('./constitution_data.json'); } catch(e) {}
  return {};
})();

// ══════════════════════════════════════════
// 节气养生方案配置
// ══════════════════════════════════════════
var SEASONAL_WELLNESS = {
  '立春': {
    risk_groups: ['气郁质', '阴虚质'],
    theme: '养肝护阳',
    diet_focus: '省酸增甘，养脾护肝',
    tasks: ['早起舒展身体', '喝一杯玫瑰花茶疏肝', '出门踏青散步30分钟'],
    recommended_foods: ['韭菜', '春笋', '菠菜', '红枣'],
    avoid_foods: ['酸味过重', '生冷'],
    constitution_specific: {
      '气郁质': { extra_task: '晨起做深呼吸10次', tea: '玫瑰花茶' },
      '阴虚质': { extra_task: '早睡养肝血', tea: '枸杞菊花茶' }
    }
  },
  '雨水': {
    risk_groups: ['痰湿质', '湿热质'],
    theme: '健脾祛湿',
    diet_focus: '健脾祛湿，饮食清淡',
    tasks: ['喝一碗薏米红豆粥', '避免久坐，每小时起身活动', '室内除湿通风'],
    recommended_foods: ['薏米', '红豆', '山药', '茯苓'],
    avoid_foods: ['油腻', '甜食', '冷饮'],
    constitution_specific: {
      '痰湿质': { extra_task: '饭后散步助消化', tea: '陈皮茯苓茶' },
      '湿热质': { extra_task: '忌辛辣油腻', tea: '菊花金银花茶' }
    }
  },
  '惊蛰': {
    risk_groups: ['阴虚质', '气虚质'],
    theme: '养阴润肺',
    diet_focus: '滋阴润燥，增强免疫',
    tasks: ['吃一个梨或喝雪梨汤', '开窗通风换气', '适当增减衣物防感冒'],
    recommended_foods: ['梨', '银耳', '百合', '蜂蜜'],
    avoid_foods: ['辛辣', '油炸'],
    constitution_specific: {
      '阴虚质': { extra_task: '睡前喝一杯蜂蜜水', tea: '麦冬玉竹茶' },
      '气虚质': { extra_task: '黄芪泡水代茶饮', tea: '黄芪红枣茶' }
    }
  },
  '春分': {
    risk_groups: ['气郁质', '血瘀质'],
    theme: '调和阴阳',
    diet_focus: '阴阳调和，不偏不倚',
    tasks: ['早睡早起，保持作息规律', '户外运动30分钟', '情绪平和，避免大喜大悲'],
    recommended_foods: ['时令蔬菜', '豆芽', '荠菜'],
    avoid_foods: ['过寒过热之品'],
    constitution_specific: {
      '气郁质': { extra_task: '听舒缓音乐放松心情', tea: '玫瑰花薄荷茶' },
      '血瘀质': { extra_task: '做轻柔的拉伸运动', tea: '玫瑰花山楂茶' }
    }
  },
  '清明': {
    risk_groups: ['气郁质', '湿热质'],
    theme: '疏肝清热',
    diet_focus: '清热解毒，疏肝理气',
    tasks: ['踏青郊游放松心情', '喝一杯菊花茶清肝火', '饮食清淡，多吃绿色蔬菜'],
    recommended_foods: ['菊花', '芹菜', '苦瓜', '绿茶'],
    avoid_foods: ['肥甘厚味'],
    constitution_specific: {
      '气郁质': { extra_task: '与朋友聊天疏解情绪', tea: '佛手茶' },
      '湿热质': { extra_task: '吃苦瓜清热', tea: '薄荷柠檬茶' }
    }
  },
  '谷雨': {
    risk_groups: ['痰湿质', '湿热质'],
    theme: '祛湿健脾',
    diet_focus: '祛湿养胃，饮食规律',
    tasks: ['喝一碗冬瓜薏米排骨汤', '减少甜食摄入', '避免淋雨受湿'],
    recommended_foods: ['冬瓜', '薏米', '赤小豆', '山药'],
    avoid_foods: ['甜食', '冰冷'],
    constitution_specific: {
      '痰湿质': { extra_task: '每天快走40分钟排湿', tea: '陈皮茯苓茶' },
      '湿热质': { extra_task: '绿豆汤代茶饮', tea: '绿豆汤' }
    }
  },
  '立夏': {
    risk_groups: ['阴虚质', '气虚质'],
    theme: '养心安神',
    diet_focus: '养心安神，清淡为主',
    tasks: ['午睡20分钟养心', '避免大汗淋漓的运动', '多吃苦味食物清心火'],
    recommended_foods: ['苦瓜', '莲子', '百合', '绿豆'],
    avoid_foods: ['过咸', '辛辣'],
    constitution_specific: {
      '阴虚质': { extra_task: '晚11点前入睡养心', tea: '麦冬莲子心茶' },
      '气虚质': { extra_task: '午后喝黄芪红枣茶', tea: '黄芪红枣茶' }
    }
  },
  '小满': {
    risk_groups: ['湿热质', '痰湿质'],
    theme: '防湿除热',
    diet_focus: '清热利湿，健脾和胃',
    tasks: ['吃一碗绿豆粥', '保持室内通风干燥', '勤换衣物防湿气'],
    recommended_foods: ['绿豆', '薏米', '冬瓜', '黄瓜'],
    avoid_foods: ['烧烤', '火锅', '冰冷'],
    constitution_specific: {
      '湿热质': { extra_task: '忌酒和甜饮料', tea: '菊花金银花茶' },
      '痰湿质': { extra_task: '运动微汗排湿', tea: '荷叶茶' }
    }
  },
  '芒种': {
    risk_groups: ['痰湿质', '气虚质'],
    theme: '清热化湿',
    diet_focus: '清淡饮食，化湿健脾',
    tasks: ['喝一碗酸梅汤生津止渴', '午间小憩恢复精力', '饮食定时定量'],
    recommended_foods: ['酸梅', '绿豆', '西瓜', '荷叶'],
    avoid_foods: ['油腻', '冷饮过量'],
    constitution_specific: {
      '痰湿质': { extra_task: '晚餐少吃主食', tea: '山楂决明子茶' },
      '气虚质': { extra_task: '避免过度出汗', tea: '党参枸杞茶' }
    }
  },
  '夏至': {
    risk_groups: ['阴虚质', '阳虚质'],
    theme: '养阳护阴',
    diet_focus: '顺应天时，养阳护阴',
    tasks: ['适当晒太阳补充阳气', '喝一碗莲子百合粥', '避免空调直吹'],
    recommended_foods: ['莲子', '百合', '西瓜', '绿豆'],
    avoid_foods: ['过寒', '过燥'],
    constitution_specific: {
      '阴虚质': { extra_task: '银耳羹滋阴润燥', tea: '蜂蜜柠檬水' },
      '阳虚质': { extra_task: '晨起喝生姜红糖水', tea: '生姜红糖水' }
    }
  },
  '小暑': {
    risk_groups: ['湿热质', '阴虚质'],
    theme: '清热解暑',
    diet_focus: '消暑降温，饮食清淡',
    tasks: ['喝一杯绿豆汤', '午休30分钟', '减少户外高温活动'],
    recommended_foods: ['绿豆', '西瓜', '荷叶', '薄荷'],
    avoid_foods: ['辛辣', '油炸', '烈酒'],
    constitution_specific: {
      '湿热质': { extra_task: '苦瓜清炒助清热', tea: '薄荷柠檬茶' },
      '阴虚质': { extra_task: '多喝水补充津液', tea: '麦冬玉竹茶' }
    }
  },
  '大暑': {
    risk_groups: ['气虚质', '阴虚质'],
    theme: '防暑益气',
    diet_focus: '益气生津，防暑降温',
    tasks: ['避免正午外出', '喝一碗西洋参麦冬茶', '保持室内通风降温'],
    recommended_foods: ['西洋参', '麦冬', '绿豆', '西瓜'],
    avoid_foods: ['冰冷过量', '油腻'],
    constitution_specific: {
      '气虚质': { extra_task: '少动多休，避免大汗', tea: '黄芪西洋参茶' },
      '阴虚质': { extra_task: '银耳雪梨汤滋阴', tea: '百合银耳羹' }
    }
  },
  '立秋': {
    risk_groups: ['阴虚质', '气虚质'],
    theme: '润燥养肺',
    diet_focus: '滋阴润燥，养肺为先',
    tasks: ['喝一碗银耳雪梨羹', '早睡早起收敛阳气', '适当增加酸味食物'],
    recommended_foods: ['银耳', '雪梨', '百合', '蜂蜜'],
    avoid_foods: ['辛辣', '油炸'],
    constitution_specific: {
      '阴虚质': { extra_task: '每日一杯蜂蜜水润燥', tea: '蜂蜜柠檬水' },
      '气虚质': { extra_task: '山药粥补肺气', tea: '黄芪红枣茶' }
    }
  },
  '处暑': {
    risk_groups: ['阴虚质', '湿热质'],
    theme: '润肺清热',
    diet_focus: '清热润肺，饮食渐温',
    tasks: ['喝一杯梨汁润肺', '逐渐增加衣物防秋凉', '保持规律作息'],
    recommended_foods: ['梨', '百合', '莲子', '蜂蜜'],
    avoid_foods: ['寒凉', '生冷'],
    constitution_specific: {
      '阴虚质': { extra_task: '百合银耳粥滋阴', tea: '枸杞菊花茶' },
      '湿热质': { extra_task: '清利余热，忌油腻', tea: '菊花茶' }
    }
  },
  '白露': {
    risk_groups: ['阳虚质', '气虚质'],
    theme: '温阳防寒',
    diet_focus: '温补脾胃，防寒保暖',
    tasks: ['注意腹部保暖', '喝一碗红枣山药粥', '晚上泡脚15分钟'],
    recommended_foods: ['红枣', '山药', '桂圆', '生姜'],
    avoid_foods: ['寒凉', '生冷', '瓜果过量'],
    constitution_specific: {
      '阳虚质': { extra_task: '晨起喝姜枣茶暖身', tea: '肉桂干姜茶' },
      '气虚质': { extra_task: '黄芪炖鸡汤补气', tea: '党参红枣茶' }
    }
  },
  '秋分': {
    risk_groups: ['阴虚质', '气郁质'],
    theme: '平衡阴阳',
    diet_focus: '阴阳平衡，秋燥润肺',
    tasks: ['早睡早起，收敛神气', '户外赏秋散步30分钟', '喝一杯枸杞菊花茶'],
    recommended_foods: ['枸杞', '菊花', '银耳', '梨'],
    avoid_foods: ['辛辣', '煎炸', '葱姜过量'],
    constitution_specific: {
      '阴虚质': { extra_task: '睡前一杯温牛奶安眠', tea: '麦冬玉竹茶' },
      '气郁质': { extra_task: '户外活动疏解秋悲', tea: '玫瑰花茶' }
    }
  },
  '寒露': {
    risk_groups: ['阳虚质', '血瘀质'],
    theme: '温阳活血',
    diet_focus: '温补驱寒，活血通络',
    tasks: ['每晚泡脚加生姜或艾叶', '喝一碗当归羊肉汤', '注意手脚保暖'],
    recommended_foods: ['当归', '羊肉', '生姜', '红枣'],
    avoid_foods: ['寒凉', '生冷'],
    constitution_specific: {
      '阳虚质': { extra_task: '艾灸关元穴温阳', tea: '肉桂干姜茶' },
      '血瘀质': { extra_task: '山楂红糖水活血', tea: '玫瑰花山楂茶' }
    }
  },
  '霜降': {
    risk_groups: ['阳虚质', '气虚质'],
    theme: '温补固本',
    diet_focus: '温补肝肾，固本培元',
    tasks: ['进补羊肉或牛肉', '早睡以养阳气', '减少晨练，等太阳出来再运动'],
    recommended_foods: ['羊肉', '牛肉', '核桃', '板栗'],
    avoid_foods: ['寒凉', '生冷', '冷饮'],
    constitution_specific: {
      '阳虚质': { extra_task: '睡前热水袋暖腹部', tea: '红枣桂圆茶' },
      '气虚质': { extra_task: '黄芪党参炖鸡补气', tea: '黄芪红枣茶' }
    }
  },
  '立冬': {
    risk_groups: ['阳虚质', '气虚质', '血瘀质'],
    theme: '温阳进补',
    diet_focus: '温补养藏，以食为补',
    tasks: ['吃一碗当归生姜羊肉汤', '注意头部和脚部保暖', '适当减少户外运动量'],
    recommended_foods: ['羊肉', '当归', '生姜', '核桃'],
    avoid_foods: ['寒凉', '生冷', '西瓜'],
    constitution_specific: {
      '阳虚质': { extra_task: '姜茶每日不可少', tea: '生姜红糖茶' },
      '气虚质': { extra_task: '人参炖鸡大补元气', tea: '人参茶' },
      '血瘀质': { extra_task: '每天热水泡脚加红花', tea: '丹参茶' }
    }
  },
  '小雪': {
    risk_groups: ['阳虚质', '气郁质'],
    theme: '温阳解郁',
    diet_focus: '温补养肾，疏肝解郁',
    tasks: ['喝一碗黑豆核桃粥', '保持室内温暖通风', '与朋友聚会避免独处'],
    recommended_foods: ['黑豆', '核桃', '黑芝麻', '羊肉'],
    avoid_foods: ['寒凉', '生冷'],
    constitution_specific: {
      '阳虚质': { extra_task: '肉桂粉加入热牛奶', tea: '肉桂干姜茶' },
      '气郁质': { extra_task: '听音乐做手工解郁', tea: '玫瑰花茶' }
    }
  },
  '大雪': {
    risk_groups: ['阳虚质', '血瘀质'],
    theme: '温阳御寒',
    diet_focus: '温补驱寒，养肾固精',
    tasks: ['吃一碗红薯生姜粥', '搓手搓脚促进血液循环', '出门戴帽子和手套'],
    recommended_foods: ['红薯', '生姜', '羊肉', '板栗'],
    avoid_foods: ['寒凉', '冷饮', '生食'],
    constitution_specific: {
      '阳虚质': { extra_task: '艾灸命门穴壮阳', tea: '干姜红枣茶' },
      '血瘀质': { extra_task: '室内运动促进循环', tea: '山楂红糖茶' }
    }
  },
  '冬至': {
    risk_groups: ['阳虚质', '气虚质'],
    theme: '温阳养藏',
    diet_focus: '冬至进补，养藏温阳',
    tasks: ['吃饺子或汤圆暖身', '早睡晚起，养藏阳气', '艾灸足三里补阳'],
    recommended_foods: ['羊肉', '饺子', '汤圆', '核桃'],
    avoid_foods: ['寒凉', '生冷', '过度节食'],
    constitution_specific: {
      '阳虚质': { extra_task: '当归羊肉汤温补', tea: '肉桂干姜茶' },
      '气虚质': { extra_task: '黄芪红枣鸡汤', tea: '黄芪党参茶' }
    }
  },
  '小寒': {
    risk_groups: ['阳虚质', '气虚质', '血瘀质'],
    theme: '御寒温补',
    diet_focus: '温补肝肾，御寒防冻',
    tasks: ['喝一碗板栗炖鸡汤', '睡前热水泡脚20分钟', '注意关节保暖'],
    recommended_foods: ['板栗', '鸡肉', '羊肉', '核桃'],
    avoid_foods: ['寒凉', '生冷', '冷饮'],
    constitution_specific: {
      '阳虚质': { extra_task: '生姜红枣茶全天代水', tea: '生姜红糖茶' },
      '血瘀质': { extra_task: '室内原地跑促进循环', tea: '红糖姜茶' }
    }
  },
  '大寒': {
    risk_groups: ['阳虚质', '气虚质'],
    theme: '温补迎春',
    diet_focus: '温补为主，兼顾养肝',
    tasks: ['吃一碗当归生姜羊肉汤', '适当增加室内运动', '为立春养生做准备'],
    recommended_foods: ['当归', '羊肉', '生姜', '红枣'],
    avoid_foods: ['寒凉', '生冷'],
    constitution_specific: {
      '阳虚质': { extra_task: '持续温补，不可懈怠', tea: '肉桂干姜茶' },
      '气虚质': { extra_task: '补气养血，为春天蓄力', tea: '黄芪红枣茶' }
    }
  }
};

// ══════════════════════════════════════════
// 通用每日任务模板
// ══════════════════════════════════════════
var DAILY_TASK_TEMPLATES = [
  { id: 'sleep_early', title: '今晚11点前入睡', icon: '😴', points: 10, category: '作息' },
  { id: 'foot_bath', title: '睡前泡脚15分钟', icon: '🦶', points: 8, category: '养生' },
  { id: 'health_tea', title: '喝一杯养生茶', icon: '🍵', points: 8, category: '饮食' },
  { id: 'walk_30', title: '散步30分钟', icon: '🚶', points: 12, category: '运动' },
  { id: 'no_cold_food', title: '今天不吃生冷食物', icon: '🚫', points: 8, category: '饮食' },
  { id: 'water_8', title: '喝够8杯水', icon: '💧', points: 8, category: '饮食' },
  { id: 'deep_breath', title: '深呼吸10次放松', icon: '🌬️', points: 5, category: '养生' },
  { id: 'no_phone_bed', title: '睡前不玩手机', icon: '📵', points: 10, category: '作息' },
  { id: 'stretch', title: '做一组拉伸运动', icon: '🧘', points: 8, category: '运动' },
  { id: 'good_mood', title: '保持好心情一整天', icon: '😊', points: 10, category: '情绪' },
  { id: 'acupoint', title: '按压养生穴位3分钟', icon: '👐', points: 8, category: '养生' },
  { id: 'fruit_veg', title: '吃5份蔬果', icon: '🥬', points: 8, category: '饮食' },
];

// ══════════════════════════════════════════
// 生成个性化每日任务
// ══════════════════════════════════════════
function generateDailyTasks(constitutionType, currentTerm, userSegment) {
  var tasks = [];
  
  // 1. 节气专属任务（3个）
  if (currentTerm && SEASONAL_WELLNESS[currentTerm]) {
    var termData = SEASONAL_WELLNESS[currentTerm];
    for (var i = 0; i < termData.tasks.length; i++) {
      tasks.push({
        id: 'term_' + i,
        title: termData.tasks[i],
        icon: '🌸',
        points: 15, // 节气任务加分
        category: '节气·' + currentTerm,
        type: 'seasonal',
        term: currentTerm
      });
    }
    // 体质专属节气任务
    if (termData.constitution_specific && termData.constitution_specific[constitutionType]) {
      var spec = termData.constitution_specific[constitutionType];
      tasks.push({
        id: 'term_constitution',
        title: spec.extra_task,
        icon: '🎯',
        points: 20,
        category: '节气·体质专属',
        type: 'constitution_seasonal',
        term: currentTerm,
        tea: spec.tea
      });
    }
  }

  // 2. 从通用任务中随机挑选3-4个
  var available = DAILY_TASK_TEMPLATES.slice();
  // 根据体质优先选择相关任务
  if (constitutionType === '阳虚质') {
    available.sort(function(a, b) {
      var aScore = ['foot_bath', 'no_cold_food', 'health_tea'].indexOf(a.id) >= 0 ? 1 : 0;
      var bScore = ['foot_bath', 'no_cold_food', 'health_tea'].indexOf(b.id) >= 0 ? 1 : 0;
      return bScore - aScore;
    });
  } else if (constitutionType === '气郁质') {
    available.sort(function(a, b) {
      var aScore = ['deep_breath', 'good_mood', 'stretch'].indexOf(a.id) >= 0 ? 1 : 0;
      var bScore = ['deep_breath', 'good_mood', 'stretch'].indexOf(b.id) >= 0 ? 1 : 0;
      return bScore - aScore;
    });
  }

  // 挑选3个不重复的
  var count = 0;
  var usedIds = {};
  for (var i = 0; i < available.length && count < 3; i++) {
    if (!usedIds[available[i].id]) {
      tasks.push(Object.assign({}, available[i], { type: 'daily' }));
      usedIds[available[i].id] = true;
      count++;
    }
  }

  // 3. 人群专属任务
  if (userSegment === 'elderly') {
    tasks.push({ id: 'taichi', title: '打太极拳/八段锦15分钟', icon: '🥋', points: 15, category: '老年养生', type: 'segment' });
  } else if (userSegment === 'female') {
    tasks.push({ id: 'rose_tea', title: '喝一杯玫瑰花茶疏肝', icon: '🌹', points: 8, category: '女性养生', type: 'segment' });
  } else if (userSegment === 'infant') {
    tasks.push({ id: 'baby_massage', title: '给宝宝做小儿推拿5分钟', icon: '👐', points: 15, category: '宝宝养护', type: 'segment' });
  } else if (userSegment === 'middle_aged') {
    tasks.push({ id: 'eye_rest', title: '工作间隙远眺5分钟护眼', icon: '👁️', points: 5, category: '职场养生', type: 'segment' });
  }

  return tasks;
}

// ══════════════════════════════════════════
// 计算连续打卡天数
// ══════════════════════════════════════════
function calculateStreak(checkins) {
  if (!checkins || !checkins.length) return 0;
  
  var dates = [];
  for (var i = 0; i < checkins.length; i++) {
    dates.push(checkins[i].checkin_date);
  }
  dates.sort().reverse(); // 最近的在前

  var today = new Date().toISOString().slice(0, 10);
  var streak = 0;
  var current = new Date(today);

  for (var i = 0; i < 365; i++) {
    var dateStr = current.toISOString().slice(0, 10);
    if (dates.indexOf(dateStr) !== -1) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else if (i === 0) {
      // 今天还没打卡，从昨天开始算
      current.setDate(current.getDate() - 1);
      continue;
    } else {
      break;
    }
  }

  return streak;
}

// ══════════════════════════════════════════
// 积分奖励计算
// ══════════════════════════════════════════
function calculatePointsEarned(taskPoints, streak) {
  var base = taskPoints;
  var multiplier = 1;
  
  if (streak >= 30) multiplier = 2.0;
  else if (streak >= 21) multiplier = 1.8;
  else if (streak >= 14) multiplier = 1.5;
  else if (streak >= 7) multiplier = 1.3;
  else if (streak >= 3) multiplier = 1.1;
  
  return Math.round(base * multiplier);
}

// ══════════════════════════════════════════
// Express 路由
// ══════════════════════════════════════════
function setupRoutes(app, auth) {
  var gQ = function() { return global.queryOne.apply(null, arguments); };
  var gA = function() { return global.queryAll.apply(null, arguments); };
  var gR = function() { return global.queryRun.apply(null, arguments); };

  // 获取当前节气养生方案
  app.get('/api/seasonal/current-wellness', auth, function(req, res) {
    try {
      var user = gQ('SELECT * FROM users WHERE id = ?', [req.userId]);
      if (!user) return res.status(404).json({ detail: 'User not found' });
      
      var ct = user.constitution_type || '平和质';
      
      // 获取当前节气
      var term = gQ('SELECT * FROM solar_terms WHERE date_mmdd >= ? ORDER BY date_mmdd LIMIT 1', [new Date().toISOString().slice(5, 10)]);
      var termName = term ? term.name : '立春';
      
      var wellness = SEASONAL_WELLNESS[termName] || { theme: '顺时养生', tasks: [], diet_focus: '饮食有节，起居有常' };
      
      // 添加体质专属方案
      var constitutionPlan = null;
      if (wellness.constitution_specific && wellness.constitution_specific[ct]) {
        constitutionPlan = wellness.constitution_specific[ct];
      }

      res.json({
        term: termName,
        theme: wellness.theme,
        diet_focus: wellness.diet_focus,
        risk_groups: wellness.risk_groups || [],
        tasks: wellness.tasks || [],
        recommended_foods: wellness.recommended_foods || [],
        avoid_foods: wellness.avoid_foods || [],
        constitution_specific: constitutionPlan,
        user_constitution: ct,
        is_risk_group: (wellness.risk_groups || []).indexOf(ct) >= 0
      });
    } catch (e) {
      console.error('Seasonal wellness error:', e);
      res.status(500).json({ detail: '获取节气方案失败' });
    }
  });

  // 获取今日任务
  app.get('/api/seasonal/daily-tasks', auth, function(req, res) {
    try {
      var user = gQ('SELECT * FROM users WHERE id = ?', [req.userId]);
      if (!user) return res.status(404).json({ detail: 'User not found' });

      var ct = user.constitution_type || '平和质';
      
      // 获取当前节气
      var term = gQ('SELECT * FROM solar_terms WHERE date_mmdd >= ? ORDER BY date_mmdd LIMIT 1', [new Date().toISOString().slice(5, 10)]);
      var termName = term ? term.name : '立春';

      // 判断人群
      var age = user.birth_year ? new Date().getFullYear() - user.birth_year : 30;
      var gender = user.gender || '';
      var segment = 'youth';
      if (age <= 3) segment = 'infant';
      else if (age >= 60) segment = 'elderly';
      else if (gender === '女' || gender === 'female') segment = 'female';
      else if (age >= 35) segment = 'middle_aged';

      var tasks = generateDailyTasks(ct, termName, segment);

      // 检查今日已完成任务
      var todayStr = new Date().toISOString().slice(0, 10);
      var completed = gA('SELECT * FROM task_checkins WHERE user_id = ? AND checkin_date = ?', [req.userId, todayStr]);
      var completedIds = {};
      for (var i = 0; i < completed.length; i++) {
        completedIds[completed[i].task_id] = completed[i];
      }

      // 标记已完成
      for (var i = 0; i < tasks.length; i++) {
        if (completedIds[tasks[i].id]) {
          tasks[i].completed = true;
          tasks[i].completed_at = completedIds[tasks[i].id].created_at;
          tasks[i].points_earned = completedIds[tasks[i].id].points_earned;
        } else {
          tasks[i].completed = false;
        }
      }

      // 连续打卡天数
      var allCheckins = gA('SELECT DISTINCT checkin_date FROM task_checkins WHERE user_id = ? ORDER BY checkin_date DESC LIMIT 60', [req.userId]);
      var streak = calculateStreak(allCheckins.map(function(c) { return { checkin_date: c.checkin_date }; }));

      // 今日积分
      var todayPoints = 0;
      for (var i = 0; i < completed.length; i++) {
        todayPoints += completed[i].points_earned || 0;
      }

      res.json({
        date: todayStr,
        term: termName,
        constitution: ct,
        segment: segment,
        tasks: tasks,
        streak: streak,
        today_points: todayPoints,
        total_tasks: tasks.length,
        completed_tasks: completed.length
      });
    } catch (e) {
      console.error('Daily tasks error:', e);
      res.status(500).json({ detail: '获取每日任务失败' });
    }
  });

  // 完成任务打卡
  app.post('/api/seasonal/checkin', auth, function(req, res) {
    try {
      var taskId = (req.body || {}).task_id;
      if (!taskId) return res.status(400).json({ detail: 'task_id required' });

      var user = gQ('SELECT * FROM users WHERE id = ?', [req.userId]);
      var todayStr = new Date().toISOString().slice(0, 10);

      // 检查是否已完成
      var existing = gQ('SELECT * FROM task_checkins WHERE user_id = ? AND task_id = ? AND checkin_date = ?', [req.userId, taskId, todayStr]);
      if (existing) return res.status(400).json({ detail: '今日已完成此任务' });

      // 获取任务基础积分
      var taskPoints = 10; // 默认
      var allTemplates = DAILY_TASK_TEMPLATES;
      for (var i = 0; i < allTemplates.length; i++) {
        if (allTemplates[i].id === taskId) { taskPoints = allTemplates[i].points; break; }
      }
      // 节气任务和体质专属任务加分
      if (taskId.startsWith('term_')) taskPoints = taskId === 'term_constitution' ? 20 : 15;
      if (taskId.startsWith('segment_')) taskPoints = 15;

      // 计算连续打卡加成
      var allCheckins = gA('SELECT DISTINCT checkin_date FROM task_checkins WHERE user_id = ? ORDER BY checkin_date DESC LIMIT 60', [req.userId]);
      var streak = calculateStreak(allCheckins.map(function(c) { return { checkin_date: c.checkin_date }; }));
      var pointsEarned = calculatePointsEarned(taskPoints, streak);

      // 保存打卡记录
      gR('INSERT INTO task_checkins (user_id, task_id, checkin_date, points_earned) VALUES (?, ?, ?, ?)',
        [req.userId, taskId, todayStr, pointsEarned]);

      // 更新用户积分
      gR('UPDATE users SET points = COALESCE(points, 0) + ? WHERE id = ?', [pointsEarned, req.userId]);

      res.json({
        success: true,
        task_id: taskId,
        points_earned: pointsEarned,
        streak: streak + 1, // 今日打卡后+1
        multiplier: streak >= 30 ? 2.0 : streak >= 14 ? 1.5 : streak >= 7 ? 1.3 : streak >= 3 ? 1.1 : 1.0,
        message: streak >= 7 ? '🔥 连续' + (streak + 1) + '天打卡！积分加成中！' : '打卡成功！'
      });
    } catch (e) {
      console.error('Checkin error:', e);
      res.status(500).json({ detail: '打卡失败' });
    }
  });

  // 打卡历史
  app.get('/api/seasonal/checkin-history', auth, function(req, res) {
    try {
      var days = parseInt(req.query.days) || 30;
      var checkins = gA('SELECT * FROM task_checkins WHERE user_id = ? ORDER BY checkin_date DESC LIMIT ?', [req.userId, days * 5]);
      
      var byDate = {};
      for (var i = 0; i < checkins.length; i++) {
        var d = checkins[i].checkin_date;
        if (!byDate[d]) byDate[d] = { date: d, tasks: [], total_points: 0 };
        byDate[d].tasks.push(checkins[i]);
        byDate[d].total_points += checkins[i].points_earned || 0;
      }

      var history = [];
      for (var k in byDate) {
        if (byDate.hasOwnProperty(k)) history.push(byDate[k]);
      }
      history.sort(function(a, b) { return b.date.localeCompare(a.date); });

      var allCheckins = gA('SELECT DISTINCT checkin_date FROM task_checkins WHERE user_id = ? ORDER BY checkin_date DESC LIMIT 60', [req.userId]);
      var streak = calculateStreak(allCheckins.map(function(c) { return { checkin_date: c.checkin_date }; }));

      res.json({ streak: streak, history: history, total_days: history.length });
    } catch (e) {
      console.error('Checkin history error:', e);
      res.status(500).json({ detail: '获取打卡历史失败' });
    }
  });

  // 获取24节气养生日历
  app.get('/api/seasonal/calendar', auth, function(req, res) {
    try {
      var user = gQ('SELECT * FROM users WHERE id = ?', [req.userId]);
      var ct = user ? (user.constitution_type || '平和质') : '平和质';

      var terms = gA('SELECT * FROM solar_terms ORDER BY date_mmdd');
      var calendar = [];
      for (var i = 0; i < terms.length; i++) {
        var t = terms[i];
        var wellness = SEASONAL_WELLNESS[t.name] || {};
        var isRisk = (wellness.risk_groups || []).indexOf(ct) >= 0;
        calendar.push({
          name: t.name,
          date: t.date_mmdd,
          description: t.description,
          theme: wellness.theme || '',
          is_risk_for_me: isRisk,
          diet_focus: wellness.diet_focus || '',
          recommended_foods: wellness.recommended_foods || []
        });
      }

      res.json({ constitution: ct, calendar: calendar });
    } catch (e) {
      console.error('Calendar error:', e);
      res.status(500).json({ detail: '获取节气日历失败' });
    }
  });

  // 积分兑换优惠券
  app.post('/api/seasonal/redeem-coupon', auth, function(req, res) {
    try {
      var couponType = (req.body || {}).type || 'discount_5';
      var costs = { discount_5: 100, discount_10: 200, free_shipping: 150 };
      var cost = costs[couponType] || 100;

      var user = gQ('SELECT * FROM users WHERE id = ?', [req.userId]);
      var points = (user && user.points) || 0;
      if (points < cost) return res.status(400).json({ detail: '积分不足，需要' + cost + '积分', current: points, needed: cost });

      gR('UPDATE users SET points = points - ? WHERE id = ?', [cost, req.userId]);

      res.json({
        success: true,
        coupon_type: couponType,
        points_spent: cost,
        remaining_points: points - cost,
        message: '兑换成功！优惠券已发放到您的账户'
      });
    } catch (e) {
      console.error('Redeem error:', e);
      res.status(500).json({ detail: '兑换失败' });
    }
  });
}

module.exports = {
  generateDailyTasks,
  calculateStreak,
  calculatePointsEarned,
  SEASONAL_WELLNESS,
  setupRoutes
};
