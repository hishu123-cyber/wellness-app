/**
 * 服务商入驻审核模块 Provider Onboarding Service
 * 提供：营养师/中医入驻申请、资质审核、OCR识别、实名认证、试岗考核、动态监管
 *
 * 挂载方式：在 server.js 的 start() 函数中添加
 *   require('./provider_onboarding_service').setupRoutes(app, auth);
 */

// =============================================
// 数据库表
// =============================================
/*
-- 入驻申请表
CREATE TABLE IF NOT EXISTS provider_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_type TEXT NOT NULL,       -- 'nutritionist' | 'tcm_doctor'
  status TEXT DEFAULT 'draft',       -- draft(草稿) | submitted(已提交) | ai_reviewing(AI初审中) | ai_passed(AI初审通过) | ai_rejected(AI初审驳回) | manual_reviewing(人工复审中) | interview_pending(待面试) | interview_passed(面试通过) | probation(试岗期) | approved(正式认证) | rejected(已驳回) | frozen(已冻结)
  
  -- 基础信息
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  gender TEXT,
  birthday TEXT,
  service_areas TEXT,                -- 可服务区域，逗号分隔
  specialty TEXT,                    -- 擅长领域，逗号分隔
  introduction TEXT,                 -- 个人简介
  experience_years INTEGER DEFAULT 0, -- 从业年限
  avatar TEXT,                       -- 头像URL
  
  -- 营养师特有字段
  cert_type TEXT,                    -- 证书类型：RD/DTR/健康管理师/公共营养师
  cert_number TEXT,                  -- 证书编号
  cert_photo_front TEXT,             -- 证书正面照片
  cert_photo_back TEXT,              -- 证书背面照片
  id_card_front TEXT,                -- 身份证正面
  id_card_back TEXT,                 -- 身份证背面
  
  -- 中医特有字段
  medical_cert_type TEXT,            -- 医师资格证类型
  medical_cert_number TEXT,          -- 医师资格证编号
  practice_cert_number TEXT,         -- 执业证书编号
  practice_scope TEXT,               -- 执业范围
  practice_org TEXT,                 -- 执业机构
  practice_org_proof TEXT,           -- 在职证明文件
  title_rank TEXT,                   -- 职称（住院医师/主治医师/副主任医师/主任医师）
  multi_site_registered INTEGER DEFAULT 0, -- 是否多点执业备案
  multi_site_proof TEXT,             -- 多点执业备案证明
  
  -- OCR 自动提取结果
  ocr_name TEXT,                     -- OCR识别姓名
  ocr_id_number TEXT,                -- OCR识别身份证号
  ocr_cert_info TEXT,                -- OCR识别证书信息(JSON)
  ocr_verified INTEGER DEFAULT 0,   -- OCR是否通过验证
  
  -- 实名认证
  real_name_verified INTEGER DEFAULT 0,  -- 实名认证是否通过
  face_verified INTEGER DEFAULT 0,       -- 人脸活体检测是否通过
  face_verify_time TEXT,                 -- 人脸验证时间
  
  -- 服务定价与排班
  price_online REAL,                 -- 线上咨询价格
  price_visit REAL,                  -- 上门服务价格（营养师）
  price_video REAL,                  -- 视频问诊价格（中医）
  schedule TEXT,                      -- 排班信息(JSON)
  
  -- 审核相关
  ai_review_result TEXT,             -- AI初审结果(JSON)
  ai_review_time TEXT,               -- AI初审时间
  manual_reviewer_id INTEGER,        -- 人工复审人ID
  manual_review_note TEXT,           -- 人工复审备注
  manual_review_time TEXT,           -- 人工复审时间
  interview_score REAL,              -- 面试评分
  interview_note TEXT,               -- 面试备注
  interview_time TEXT,               -- 面试时间
  reject_reason TEXT,                -- 驳回原因
  
  -- 试岗考核
  probation_start TEXT,              -- 试岗开始时间
  probation_end TEXT,                -- 试岗结束时间
  probation_orders INTEGER DEFAULT 0, -- 试岗期间完成订单数
  probation_avg_rating REAL DEFAULT 0, -- 试岗期间平均评分
  probation_passed INTEGER DEFAULT 0,  -- 试岗是否通过
  
  -- 法律协议
  agreement_signed INTEGER DEFAULT 0,   -- 是否签署协议
  agreement_signed_time TEXT,           -- 签署时间
  agreement_version TEXT,               -- 协议版本
  
  -- 关联用户
  user_id INTEGER,                   -- 关联的用户账号ID
  provider_id INTEGER,               -- 审核通过后关联的 nutritionists/tcm_doctors ID
  
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 入驻审核日志
CREATE TABLE IF NOT EXISTS provider_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL,
  action TEXT NOT NULL,              -- 操作类型：submit/ai_pass/ai_reject/manual_pass/manual_reject/interview_pass/interview_fail/probation_pass/probation_fail/approve/reject/freeze/unfreeze
  operator_id INTEGER,              -- 操作人ID（null=系统）
  operator_type TEXT DEFAULT 'system', -- system/admin/provider
  note TEXT,                         -- 操作备注
  extra_data TEXT,                   -- 附加数据(JSON)
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (application_id) REFERENCES provider_applications(id)
);

-- 服务打卡记录（上门服务留痕）
CREATE TABLE IF NOT EXISTS service_checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,       -- 关联预约ID
  provider_type TEXT NOT NULL,       -- 'nutritionist' | 'tcm_doctor'
  provider_id INTEGER NOT NULL,      -- 服务商ID
  checkin_type TEXT NOT NULL,        -- 'arrival'(到达) | 'start'(开始服务) | 'complete'(服务完成)
  latitude REAL,                     -- 纬度
  longitude REAL,                    -- 经度
  photo_url TEXT,                    -- 现场照片
  note TEXT,                         -- 备注
  created_at TEXT DEFAULT (datetime('now'))
);

-- 投诉与违规记录
CREATE TABLE IF NOT EXISTS provider_complaints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_type TEXT NOT NULL,       -- 'nutritionist' | 'tcm_doctor'
  provider_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  booking_id INTEGER,                -- 关联订单
  complaint_type TEXT NOT NULL,      -- 'overcharge'(乱收费) | 'upsell'(推销保健品) | 'misdiagnosis'(误诊) | 'bad_attitude'(态度差) | 'no_show'(爽约) | 'other'(其他)
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending',     -- pending(待处理) | investigating(调查中) | resolved(已解决) | dismissed(已驳回)
  severity TEXT DEFAULT 'normal',    -- minor(轻微) | normal(一般) | serious(严重)
  admin_note TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  resolved_at TEXT
);

-- 继续教育学时记录
CREATE TABLE IF NOT EXISTS provider_education (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_type TEXT NOT NULL,
  provider_id INTEGER NOT NULL,
  course_name TEXT NOT NULL,
  course_type TEXT NOT NULL,         -- 'platform'(平台内训) | 'national'(国家级继续教育) | 'external'(外部培训)
  hours REAL NOT NULL,               -- 学时
  certificate_url TEXT,              -- 证书/证明
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 服务商年度续约记录
CREATE TABLE IF NOT EXISTS provider_renewals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_type TEXT NOT NULL,
  provider_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  education_hours REAL DEFAULT 0,    -- 本年度完成学时
  min_education_hours REAL DEFAULT 15, -- 最低要求学时
  complaint_count INTEGER DEFAULT 0,  -- 本年度投诉次数
  avg_rating REAL DEFAULT 5.0,       -- 本年度平均评分
  renewal_status TEXT DEFAULT 'pending', -- pending/granted/denied
  reviewed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
*/

function setupRoutes(app, auth) {
  var gQ = global.queryOne;
  var gA = global.queryAll;
  var gR = global.queryRun;
  var sDb = global.saveDb;

  // ─────────────────────────────────────
  // 辅助函数
  // ─────────────────────────────────────

  function logAudit(appId, action, operatorId, operatorType, note, extraData) {
    gR('INSERT INTO provider_audit_logs (application_id, action, operator_id, operator_type, note, extra_data) VALUES (?, ?, ?, ?, ?, ?)',
      [appId, action, operatorId || null, operatorType || 'system', note || '', extraData ? JSON.stringify(extraData) : null]);
    sDb();
  }

  function getAdminUser(req) {
    if (!req.userId) return null;
    var u = gQ('SELECT role FROM users WHERE id = ?', [req.userId]);
    return (u && u.role === 'admin') ? req.userId : null;
  }

  function requireAdmin(req, res, next) {
    if (!getAdminUser(req)) return res.status(403).json({ detail: '需要管理员权限' });
    next();
  }

  // ─────────────────────────────────────
  // 1. 入驻申请 — 创建/保存草稿
  // ─────────────────────────────────────
  app.post('/api/provider/applications', auth, function(req, res) {
    var data = req.body || {};
    if (!data.provider_type) return res.status(400).json({ detail: '请选择申请类型（营养师/中医）' });
    if (!data.name) return res.status(400).json({ detail: '请填写姓名' });
    if (['nutritionist', 'tcm_doctor'].indexOf(data.provider_type) === -1) {
      return res.status(400).json({ detail: '无效的申请类型' });
    }

    // 检查是否有未完成的申请
    var existing = gQ('SELECT id, status FROM provider_applications WHERE user_id = ? AND provider_type = ? AND status NOT IN (?, ?, ?)',
      [req.userId, data.provider_type, 'rejected', 'approved', 'withdrawn']);
    if (existing) return res.status(400).json({ detail: '您已有正在审核中的申请', existing_id: existing.id });

    var fields = [
      'provider_type', 'name', 'phone', 'gender', 'birthday', 'service_areas', 'specialty',
      'introduction', 'experience_years', 'avatar',
      'cert_type', 'cert_number', 'cert_photo_front', 'cert_photo_back',
      'id_card_front', 'id_card_back',
      'medical_cert_type', 'medical_cert_number', 'practice_cert_number', 'practice_scope',
      'practice_org', 'practice_org_proof', 'title_rank', 'multi_site_registered', 'multi_site_proof',
      'price_online', 'price_visit', 'price_video', 'schedule',
      'agreement_signed', 'agreement_version'
    ];
    var cols = ['user_id', 'status'];
    var vals = [req.userId, 'draft'];
    
    for (var i = 0; i < fields.length; i++) {
      if (data[fields[i]] !== undefined && data[fields[i]] !== null && data[fields[i]] !== '') {
        cols.push(fields[i]);
        vals.push(data[fields[i]]);
      }
    }

    var placeholders = cols.map(function() { return '?'; }).join(', ');
    gR('INSERT INTO provider_applications (' + cols.join(', ') + ') VALUES (' + placeholders + ')', vals);
    sDb();

    var app2 = gQ('SELECT * FROM provider_applications WHERE id = (SELECT last_insert_rowid())');
    if (!app2) app2 = gQ('SELECT * FROM provider_applications ORDER BY id DESC LIMIT 1');
    
    logAudit(app2.id, 'create', req.userId, 'provider', '创建入驻申请草稿');
    res.json({ success: true, application: app2 });
  });

  // ─────────────────────────────────────
  // 2. 更新入驻申请草稿
  // ─────────────────────────────────────
  app.put('/api/provider/applications/:id', auth, function(req, res) {
    var data = req.body || {};
    var app2 = gQ('SELECT * FROM provider_applications WHERE id = ? AND user_id = ?', [Number(req.params.id), req.userId]);
    if (!app2) return res.status(404).json({ detail: '申请未找到' });
    if (app2.status !== 'draft') return res.status(400).json({ detail: '仅草稿状态可修改' });

    var fields = [
      'provider_type', 'name', 'phone', 'gender', 'birthday', 'service_areas', 'specialty',
      'introduction', 'experience_years', 'avatar',
      'cert_type', 'cert_number', 'cert_photo_front', 'cert_photo_back',
      'id_card_front', 'id_card_back',
      'medical_cert_type', 'medical_cert_number', 'practice_cert_number', 'practice_scope',
      'practice_org', 'practice_org_proof', 'title_rank', 'multi_site_registered', 'multi_site_proof',
      'price_online', 'price_visit', 'price_video', 'schedule',
      'agreement_signed', 'agreement_version'
    ];

    var sets = [];
    var vals = [];
    for (var i = 0; i < fields.length; i++) {
      if (data[fields[i]] !== undefined) {
        sets.push(fields[i] + ' = ?');
        vals.push(data[fields[i]]);
      }
    }

    if (sets.length > 0) {
      sets.push('updated_at = datetime("now")');
      vals.push(Number(req.params.id));
      gR('UPDATE provider_applications SET ' + sets.join(', ') + ' WHERE id = ?', vals);
      sDb();
    }

    var updated = gQ('SELECT * FROM provider_applications WHERE id = ?', [Number(req.params.id)]);
    res.json({ success: true, application: updated });
  });

  // ─────────────────────────────────────
  // 3. 提交入驻申请（触发AI初审）
  // ─────────────────────────────────────
  app.post('/api/provider/applications/:id/submit', auth, function(req, res) {
    var app2 = gQ('SELECT * FROM provider_applications WHERE id = ? AND user_id = ?', [Number(req.params.id), req.userId]);
    if (!app2) return res.status(404).json({ detail: '申请未找到' });
    if (app2.status !== 'draft') return res.status(400).json({ detail: '仅草稿状态可提交' });

    // 必填项校验
    var missing = [];
    if (!app2.name) missing.push('姓名');
    if (!app2.phone) missing.push('联系方式');
    if (!app2.specialty) missing.push('擅长领域');
    if (!app2.id_card_front) missing.push('身份证正面照');
    if (!app2.id_card_back) missing.push('身份证背面照');
    if (!app2.agreement_signed) missing.push('法律协议签署');

    if (app2.provider_type === 'nutritionist') {
      if (!app2.cert_type) missing.push('证书类型');
      if (!app2.cert_number) missing.push('证书编号');
      if (!app2.cert_photo_front) missing.push('证书照片');
      if (app2.experience_years < 2) missing.push('至少2年从业经验');
    }

    if (app2.provider_type === 'tcm_doctor') {
      if (!app2.medical_cert_number) missing.push('医师资格证编号');
      if (!app2.practice_cert_number) missing.push('执业证书编号');
      if (!app2.practice_scope) missing.push('执业范围');
      if (!app2.practice_org) missing.push('执业机构');
      if (!app2.practice_org_proof) missing.push('在职证明');
      if (!app2.title_rank) missing.push('职称');
    }

    if (missing.length > 0) {
      return res.status(400).json({ detail: '请完善以下信息：' + missing.join('、'), missing: missing });
    }

    // 更新状态为AI初审中
    gR("UPDATE provider_applications SET status = 'ai_reviewing', updated_at = datetime('now') WHERE id = ?", [app2.id]);
    sDb();

    logAudit(app2.id, 'submit', req.userId, 'provider', '提交入驻申请，进入AI初审');

    // ── AI初审逻辑（模拟） ──
    setTimeout(function() {
      var aiResult = performAIReview(app2);
      
      if (aiResult.passed) {
        gR("UPDATE provider_applications SET status = 'ai_passed', ai_review_result = ?, ai_review_time = datetime('now'), ocr_verified = ?, updated_at = datetime('now') WHERE id = ?",
          [JSON.stringify(aiResult), aiResult.ocr_verified ? 1 : 0, app2.id]);
        logAudit(app2.id, 'ai_pass', null, 'system', 'AI初审通过', aiResult);
      } else {
        gR("UPDATE provider_applications SET status = 'ai_rejected', ai_review_result = ?, ai_review_time = datetime('now'), reject_reason = ?, updated_at = datetime('now') WHERE id = ?",
          [JSON.stringify(aiResult), aiResult.reasons.join('；'), app2.id]);
        logAudit(app2.id, 'ai_reject', null, 'system', 'AI初审驳回：' + aiResult.reasons.join('；'), aiResult);
      }
      sDb();
    }, 2000);

    res.json({ success: true, detail: '申请已提交，正在进行AI初审', status: 'ai_reviewing' });
  });

  // ── AI初审模拟逻辑 ──
  function performAIReview(application) {
    var result = { passed: true, reasons: [], ocr_verified: false, cert_verified: false, checks: {} };

    // 1. OCR证件识别模拟
    // 实际项目中应对接OCR服务（如百度OCR、腾讯OCR）
    if (application.id_card_front && application.id_card_back) {
      result.ocr_verified = true;
      result.checks.ocr = { status: 'passed', detail: '证件OCR识别通过' };
      // 模拟提取信息
      gR('UPDATE provider_applications SET ocr_name = ?, ocr_id_number = ? WHERE id = ?',
        [application.name, 'OCR_' + application.id + '_ID', application.id]);
      sDb();
    } else {
      result.passed = false;
      result.reasons.push('证件照片不完整');
      result.checks.ocr = { status: 'failed', detail: '证件照片不完整' };
    }

    // 2. 证书编号真伪校验模拟
    if (application.provider_type === 'nutritionist') {
      if (application.cert_number) {
        // 模拟对接国家职业资格证书查询接口
        // 实际应调用 http://zscx.osta.org.cn/ 等接口
        result.cert_verified = true;
        result.checks.cert = { status: 'passed', detail: '证书编号验证通过（模拟）' };
      } else {
        result.passed = false;
        result.reasons.push('缺少证书编号');
        result.checks.cert = { status: 'failed', detail: '缺少证书编号' };
      }
    }

    if (application.provider_type === 'tcm_doctor') {
      // 模拟对接卫健委执业医师注册信息查询
      if (application.medical_cert_number && application.practice_cert_number) {
        result.cert_verified = true;
        result.checks.medical_cert = { status: 'passed', detail: '医师资格证验证通过（模拟）' };
        result.checks.practice_cert = { status: 'passed', detail: '执业证书验证通过（模拟）' };
        
        // 检查执业范围
        if (application.practice_scope && (application.practice_scope.indexOf('中医') >= 0 || application.practice_scope.indexOf('中西医结合') >= 0)) {
          result.checks.practice_scope = { status: 'passed', detail: '执业范围符合要求' };
        } else {
          result.passed = false;
          result.reasons.push('执业范围必须包含"中医专业"或"中西医结合专业"');
          result.checks.practice_scope = { status: 'failed', detail: '执业范围不符合要求' };
        }
      } else {
        result.passed = false;
        result.reasons.push('缺少医师资格证书或执业证书');
        result.checks.medical_cert = { status: 'failed', detail: '缺少医师资格证书' };
      }
    }

    // 3. 经验要求检查
    if (application.provider_type === 'nutritionist' && application.experience_years < 2) {
      result.passed = false;
      result.reasons.push('营养师需至少2年从业经验');
      result.checks.experience = { status: 'failed', detail: '从业经验不足2年' };
    } else {
      result.checks.experience = { status: 'passed', detail: '从业经验符合要求' };
    }

    if (application.provider_type === 'tcm_doctor') {
      var validTitles = ['主治医师', '副主任医师', '主任医师'];
      if (validTitles.indexOf(application.title_rank) >= 0 || application.experience_years >= 5) {
        result.checks.title = { status: 'passed', detail: '职称/经验符合要求' };
      } else {
        result.passed = false;
        result.reasons.push('中医师需主治医师及以上职称或5年以上二甲/三甲医院临床经验');
        result.checks.title = { status: 'failed', detail: '职称或经验不符合要求' };
      }
    }

    return result;
  }

  // ─────────────────────────────────────
  // 4. 获取我的入驻申请列表
  // ─────────────────────────────────────
  app.get('/api/provider/applications', auth, function(req, res) {
    var rows = gA('SELECT * FROM provider_applications WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
    // 解析JSON字段
    for (var i = 0; i < rows.length; i++) {
      try { rows[i].ai_review_result = JSON.parse(rows[i].ai_review_result); } catch(e) {}
      try { rows[i].schedule = JSON.parse(rows[i].schedule); } catch(e) {}
      try { rows[i].ocr_cert_info = JSON.parse(rows[i].ocr_cert_info); } catch(e) {}
    }
    res.json(rows);
  });

  // ─────────────────────────────────────
  // 5. 获取入驻申请详情
  // ─────────────────────────────────────
  app.get('/api/provider/applications/:id', auth, function(req, res) {
    var app2 = gQ('SELECT * FROM provider_applications WHERE id = ? AND user_id = ?', [Number(req.params.id), req.userId]);
    if (!app2) return res.status(404).json({ detail: '申请未找到' });
    try { app2.ai_review_result = JSON.parse(app2.ai_review_result); } catch(e) {}
    try { app2.schedule = JSON.parse(app2.schedule); } catch(e) {}
    
    // 获取审核日志
    app2.audit_logs = gA('SELECT * FROM provider_audit_logs WHERE application_id = ? ORDER BY created_at ASC', [app2.id]);
    
    res.json(app2);
  });

  // ─────────────────────────────────────
  // 6. 撤回入驻申请
  // ─────────────────────────────────────
  app.post('/api/provider/applications/:id/withdraw', auth, function(req, res) {
    var app2 = gQ('SELECT * FROM provider_applications WHERE id = ? AND user_id = ?', [Number(req.params.id), req.userId]);
    if (!app2) return res.status(404).json({ detail: '申请未找到' });
    if (['approved', 'rejected', 'withdrawn'].indexOf(app2.status) >= 0) {
      return res.status(400).json({ detail: '当前状态不可撤回' });
    }

    gR("UPDATE provider_applications SET status = 'withdrawn', updated_at = datetime('now') WHERE id = ?", [app2.id]);
    sDb();
    logAudit(app2.id, 'withdraw', req.userId, 'provider', '申请已撤回');

    res.json({ success: true, detail: '申请已撤回' });
  });

  // ─────────────────────────────────────
  // 7. OCR证件识别（模拟）
  // ─────────────────────────────────────
  app.post('/api/provider/ocr', auth, function(req, res) {
    var data = req.body || {};
    if (!data.image_url && !data.image_base64) return res.status(400).json({ detail: '请上传证件照片' });
    
    var docType = data.doc_type || 'id_card'; // id_card | cert | medical_cert

    // 模拟OCR结果
    var ocrResult = {
      success: true,
      doc_type: docType,
      extracted: {}
    };

    if (docType === 'id_card') {
      ocrResult.extracted = {
        name: '（OCR识别结果）',
        id_number: '（OCR识别结果）',
        address: '（OCR识别结果）',
        valid_date: '2020.01.01-2040.01.01'
      };
    } else if (docType === 'cert') {
      ocrResult.extracted = {
        cert_type: '注册营养师',
        cert_number: 'RD' + Date.now(),
        name: '（OCR识别结果）',
        issue_date: '2022-06-01',
        valid: true
      };
    } else if (docType === 'medical_cert') {
      ocrResult.extracted = {
        cert_type: '医师资格证',
        cert_number: 'YS' + Date.now(),
        name: '（OCR识别结果）',
        practice_scope: '中医专业',
        issue_org: '国家卫健委'
      };
    }

    // 提示：实际项目请对接百度OCR/腾讯OCR/阿里OCR
    ocrResult._note = '当前为模拟OCR结果，实际项目请对接百度/腾讯/阿里OCR服务';

    res.json(ocrResult);
  });

  // ─────────────────────────────────────
  // 8. 实名认证与人脸活体检测（模拟）
  // ─────────────────────────────────────
  app.post('/api/provider/face-verify', auth, function(req, res) {
    var data = req.body || {};
    var appId = data.application_id;
    if (!appId) return res.status(400).json({ detail: '请指定申请ID' });

    var app2 = gQ('SELECT * FROM provider_applications WHERE id = ? AND user_id = ?', [Number(appId), req.userId]);
    if (!app2) return res.status(404).json({ detail: '申请未找到' });

    // 模拟实名认证结果
    // 实际项目应对接：腾讯云人脸核身、阿里云金融级实人认证等
    var verifyResult = {
      success: true,
      real_name_verified: true,
      face_verified: true,
      similarity: 95.6,
      _note: '当前为模拟验证结果，实际项目请对接公安实名认证接口'
    };

    gR('UPDATE provider_applications SET real_name_verified = 1, face_verified = 1, face_verify_time = datetime("now") WHERE id = ?', [app2.id]);
    sDb();

    logAudit(app2.id, 'face_verify', req.userId, 'provider', '实名认证与人脸检测通过（模拟）');

    res.json(verifyResult);
  });

  // ─────────────────────────────────────
  // === 管理员接口 ===
  // ─────────────────────────────────────

  // 9. 获取所有待审核申请（管理员）
  app.get('/api/admin/provider/applications', auth, requireAdmin, function(req, res) {
    var status = req.query.status || '';
    var type = req.query.provider_type || '';
    var sql = 'SELECT * FROM provider_applications WHERE 1=1';
    var params = [];

    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (type) { sql += ' AND provider_type = ?'; params.push(type); }
    sql += ' ORDER BY created_at DESC';

    if (req.query.page && req.query.size) {
      var page = parseInt(req.query.page) || 1;
      var size = parseInt(req.query.size) || 20;
      params.push(size, (page - 1) * size);
      sql += ' LIMIT ? OFFSET ?';
    }

    var rows = gA(sql, params);
    for (var i = 0; i < rows.length; i++) {
      try { rows[i].ai_review_result = JSON.parse(rows[i].ai_review_result); } catch(e) {}
      try { rows[i].schedule = JSON.parse(rows[i].schedule); } catch(e) {}
    }
    res.json(rows);
  });

  // 10. 获取申请详情（管理员）
  app.get('/api/admin/provider/applications/:id', auth, requireAdmin, function(req, res) {
    var app2 = gQ('SELECT * FROM provider_applications WHERE id = ?', [Number(req.params.id)]);
    if (!app2) return res.status(404).json({ detail: '申请未找到' });
    try { app2.ai_review_result = JSON.parse(app2.ai_review_result); } catch(e) {}
    try { app2.schedule = JSON.parse(app2.schedule); } catch(e) {}
    app2.audit_logs = gA('SELECT * FROM provider_audit_logs WHERE application_id = ? ORDER BY created_at ASC', [app2.id]);
    res.json(app2);
  });

  // 11. 人工复审 — 通过/驳回（管理员）
  app.post('/api/admin/provider/applications/:id/manual-review', auth, requireAdmin, function(req, res) {
    var data = req.body || {};
    var action = data.action; // 'pass' | 'reject' | 'interview'
    var app2 = gQ('SELECT * FROM provider_applications WHERE id = ?', [Number(req.params.id)]);
    if (!app2) return res.status(404).json({ detail: '申请未找到' });
    if (app2.status !== 'ai_passed' && app2.status !== 'manual_reviewing') {
      return res.status(400).json({ detail: '当前状态不可进行人工复审' });
    }

    if (action === 'pass') {
      // 中医需要面试，营养师可直接进入试岗
      if (app2.provider_type === 'tcm_doctor') {
        gR("UPDATE provider_applications SET status = 'interview_pending', manual_reviewer_id = ?, manual_review_note = ?, manual_review_time = datetime('now'), updated_at = datetime('now') WHERE id = ?",
          [req.userId, data.note || '', app2.id]);
        logAudit(app2.id, 'manual_pass', req.userId, 'admin', '人工复审通过，待面试', { note: data.note });
      } else {
        gR("UPDATE provider_applications SET status = 'probation', manual_reviewer_id = ?, manual_review_note = ?, manual_review_time = datetime('now'), probation_start = datetime('now'), probation_end = datetime('now', '+30 days'), updated_at = datetime('now') WHERE id = ?",
          [req.userId, data.note || '', app2.id]);
        logAudit(app2.id, 'manual_pass', req.userId, 'admin', '人工复审通过，进入试岗期', { note: data.note });
      }
    } else if (action === 'reject') {
      gR("UPDATE provider_applications SET status = 'rejected', manual_reviewer_id = ?, manual_review_note = ?, reject_reason = ?, manual_review_time = datetime('now'), updated_at = datetime('now') WHERE id = ?",
        [req.userId, data.note || '', data.reason || '审核未通过', app2.id]);
      logAudit(app2.id, 'manual_reject', req.userId, 'admin', '人工复审驳回：' + (data.reason || ''), { note: data.note });
    } else if (action === 'interview') {
      gR("UPDATE provider_applications SET status = 'interview_pending', manual_reviewer_id = ?, manual_review_note = ?, manual_review_time = datetime('now'), updated_at = datetime('now') WHERE id = ?",
        [req.userId, data.note || '', app2.id]);
      logAudit(app2.id, 'interview_pending', req.userId, 'admin', '安排面试', { note: data.note });
    }

    sDb();
    var updated = gQ('SELECT * FROM provider_applications WHERE id = ?', [app2.id]);
    res.json({ success: true, application: updated });
  });

  // 12. 面试评分（管理员）
  app.post('/api/admin/provider/applications/:id/interview', auth, requireAdmin, function(req, res) {
    var data = req.body || {};
    var app2 = gQ('SELECT * FROM provider_applications WHERE id = ?', [Number(req.params.id)]);
    if (!app2) return res.status(404).json({ detail: '申请未找到' });
    if (app2.status !== 'interview_pending') return res.status(400).json({ detail: '当前状态不处于待面试' });

    var score = data.score || 0;
    var passed = score >= 60;

    if (passed) {
      gR("UPDATE provider_applications SET status = 'probation', interview_score = ?, interview_note = ?, interview_time = datetime('now'), probation_start = datetime('now'), probation_end = datetime('now', '+30 days'), updated_at = datetime('now') WHERE id = ?",
        [score, data.note || '', app2.id]);
      logAudit(app2.id, 'interview_pass', req.userId, 'admin', '面试通过（评分：' + score + '），进入试岗期');
    } else {
      gR("UPDATE provider_applications SET status = 'rejected', interview_score = ?, interview_note = ?, interview_time = datetime('now'), reject_reason = '面试未通过', updated_at = datetime('now') WHERE id = ?",
        [score, data.note || '', app2.id]);
      logAudit(app2.id, 'interview_fail', req.userId, 'admin', '面试未通过（评分：' + score + '）');
    }

    sDb();
    res.json({ success: true, passed: passed, score: score });
  });

  // 13. 试岗考核通过/不通过（管理员）
  app.post('/api/admin/provider/applications/:id/probation', auth, requireAdmin, function(req, res) {
    var data = req.body || {};
    var action = data.action; // 'pass' | 'fail'
    var app2 = gQ('SELECT * FROM provider_applications WHERE id = ?', [Number(req.params.id)]);
    if (!app2) return res.status(404).json({ detail: '申请未找到' });
    if (app2.status !== 'probation') return res.status(400).json({ detail: '当前状态不处于试岗期' });

    if (action === 'pass') {
      // 正式通过 — 创建对应的营养师/中医师记录
      var providerId = null;
      
      if (app2.provider_type === 'nutritionist') {
        gR('INSERT INTO nutritionists (name, title, hospital, specialty, introduction, avatar, rating, service_count, price_online, price_visit, available, service_areas, certifications) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [app2.name, app2.cert_type || '营养师', '', app2.specialty, app2.introduction, app2.avatar || '', 5.0, 0, app2.price_online || 99, app2.price_visit || 299, 1, app2.service_areas, app2.cert_type]);
        var n = gQ('SELECT * FROM nutritionists WHERE id = (SELECT last_insert_rowid())');
        providerId = n ? n.id : null;
      } else {
        gR('INSERT INTO tcm_doctors (name, title, hospital, specialty, introduction, avatar, rating, consultation_count, price_online, price_video, available, certification) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [app2.name, app2.title_rank || '中医师', app2.practice_org, app2.specialty, app2.introduction, app2.avatar || '', 5.0, 0, app2.price_online || 99, app2.price_video || 199, 1, app2.medical_cert_type || '']);
        var d = gQ('SELECT * FROM tcm_doctors WHERE id = (SELECT last_insert_rowid())');
        providerId = d ? d.id : null;
      }

      gR("UPDATE provider_applications SET status = 'approved', provider_id = ?, probation_passed = 1, updated_at = datetime('now') WHERE id = ?",
        [providerId, app2.id]);
      sDb();

      logAudit(app2.id, 'approve', req.userId, 'admin', '试岗通过，正式认证（provider_id: ' + providerId + '）');
      res.json({ success: true, provider_id: providerId, detail: '审核通过，已正式入驻' });
    } else {
      gR("UPDATE provider_applications SET status = 'rejected', reject_reason = ?, probation_passed = 0, updated_at = datetime('now') WHERE id = ?",
        [data.reason || '试岗期考核未通过', app2.id]);
      sDb();

      logAudit(app2.id, 'probation_fail', req.userId, 'admin', '试岗期考核未通过：' + (data.reason || ''));
      res.json({ success: true, detail: '试岗期考核未通过' });
    }
  });

  // ─────────────────────────────────────
  // === 服务打卡（上门留痕） ===
  // ─────────────────────────────────────

  // 14. 服务打卡
  app.post('/api/provider/checkin', auth, function(req, res) {
    var data = req.body || {};
    if (!data.booking_id) return res.status(400).json({ detail: '请指定预约ID' });
    if (!data.checkin_type) return res.status(400).json({ detail: '请指定打卡类型' });
    if (!data.latitude || !data.longitude) return res.status(400).json({ detail: '请提供定位信息' });

    gR('INSERT INTO service_checkins (booking_id, provider_type, provider_id, checkin_type, latitude, longitude, photo_url, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [data.booking_id, data.provider_type || 'nutritionist', data.provider_id || 0, data.checkin_type,
       data.latitude, data.longitude, data.photo_url || '', data.note || '']);
    sDb();

    res.json({ success: true, detail: '打卡成功' });
  });

  // 15. 获取打卡记录
  app.get('/api/provider/checkins/:bookingId', auth, function(req, res) {
    var rows = gA('SELECT * FROM service_checkins WHERE booking_id = ? ORDER BY created_at ASC', [Number(req.params.bookingId)]);
    res.json(rows);
  });

  // ─────────────────────────────────────
  // === 投诉与违规 ===
  // ─────────────────────────────────────

  // 16. 提交投诉
  app.post('/api/provider/complaints', auth, function(req, res) {
    var data = req.body || {};
    if (!data.provider_type || !data.provider_id) return res.status(400).json({ detail: '请指定服务商' });
    if (!data.complaint_type) return res.status(400).json({ detail: '请选择投诉类型' });
    if (!data.description) return res.status(400).json({ detail: '请描述投诉内容' });

    // 严重投诉类型自动冻结
    var severeTypes = ['overcharge', 'upsell', 'misdiagnosis'];
    var severity = severeTypes.indexOf(data.complaint_type) >= 0 ? 'serious' : 'normal';

    gR('INSERT INTO provider_complaints (provider_type, provider_id, user_id, booking_id, complaint_type, description, severity) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [data.provider_type, data.provider_id, req.userId, data.booking_id || null,
       data.complaint_type, data.description, severity]);
    sDb();

    // 严重投诉自动冻结
    if (severity === 'serious') {
      var table = data.provider_type === 'nutritionist' ? 'nutritionists' : 'tcm_doctors';
      gR('UPDATE ' + table + ' SET available = 0 WHERE id = ?', [data.provider_id]);
      sDb();

      // 更新入驻申请状态为冻结
      var app2 = gQ('SELECT id FROM provider_applications WHERE provider_type = ? AND provider_id = ? AND status = ?', [data.provider_type, data.provider_id, 'approved']);
      if (app2) {
        gR("UPDATE provider_applications SET status = 'frozen', updated_at = datetime('now') WHERE id = ?", [app2.id]);
        sDb();
        logAudit(app2.id, 'freeze', null, 'system', '因严重投诉自动冻结：' + data.complaint_type);
      }
    }

    res.json({ success: true, detail: '投诉已提交，我们将尽快处理' });
  });

  // 17. 获取投诉列表（管理员）
  app.get('/api/admin/provider/complaints', auth, requireAdmin, function(req, res) {
    var status = req.query.status || '';
    var sql = 'SELECT c.*, u.nickname as user_name FROM provider_complaints c LEFT JOIN users u ON c.user_id = u.id WHERE 1=1';
    var params = [];
    if (status) { sql += ' AND c.status = ?'; params.push(status); }
    sql += ' ORDER BY c.created_at DESC';
    res.json(gA(sql, params));
  });

  // 18. 处理投诉（管理员）
  app.post('/api/admin/provider/complaints/:id/resolve', auth, requireAdmin, function(req, res) {
    var data = req.body || {};
    var complaint = gQ('SELECT * FROM provider_complaints WHERE id = ?', [Number(req.params.id)]);
    if (!complaint) return res.status(404).json({ detail: '投诉未找到' });

    var action = data.action; // 'uphold'(成立) | 'dismiss'(驳回)
    gR('UPDATE provider_complaints SET status = ?, admin_note = ?, resolved_at = datetime("now") WHERE id = ?',
      [action === 'uphold' ? 'resolved' : 'dismissed', data.note || '', complaint.id]);
    sDb();

    // 如果投诉成立且严重，保持冻结；如果驳回，解冻
    if (action === 'dismiss' && complaint.severity === 'serious') {
      var table = complaint.provider_type === 'nutritionist' ? 'nutritionists' : 'tcm_doctors';
      gR('UPDATE ' + table + ' SET available = 1 WHERE id = ?', [complaint.provider_id]);
      var app2 = gQ('SELECT id FROM provider_applications WHERE provider_type = ? AND provider_id = ? AND status = ?', [complaint.provider_type, complaint.provider_id, 'frozen']);
      if (app2) {
        gR("UPDATE provider_applications SET status = 'approved', updated_at = datetime('now') WHERE id = ?", [app2.id]);
        sDb();
        logAudit(app2.id, 'unfreeze', req.userId, 'admin', '投诉驳回，解除冻结');
      }
      sDb();
    }

    res.json({ success: true, detail: action === 'uphold' ? '投诉已成立' : '投诉已驳回' });
  });

  // ─────────────────────────────────────
  // === 继续教育与年度续约 ===
  // ─────────────────────────────────────

  // 19. 记录继续教育学时
  app.post('/api/provider/education', auth, function(req, res) {
    var data = req.body || {};
    if (!data.course_name || !data.hours) return res.status(400).json({ detail: '请填写课程名称和学时' });

    gR('INSERT INTO provider_education (provider_type, provider_id, course_name, course_type, hours, certificate_url, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [data.provider_type || 'nutritionist', data.provider_id || 0, data.course_name, data.course_type || 'platform', data.hours, data.certificate_url || '', data.completed_at || new Date().toISOString()]);
    sDb();

    res.json({ success: true, detail: '学时已记录' });
  });

  // 20. 获取继续教育学时统计
  app.get('/api/provider/education/summary', auth, function(req, res) {
    var year = req.query.year || new Date().getFullYear();
    var rows = gA('SELECT provider_type, provider_id, SUM(hours) as total_hours FROM provider_education WHERE provider_id IN (SELECT provider_id FROM provider_applications WHERE user_id = ? AND status = ?) AND strftime("%Y", completed_at) = ? GROUP BY provider_type',
      [req.userId, 'approved', String(year)]);
    res.json({ year: year, records: rows });
  });

  // 21. 年度续约审核（管理员）
  app.get('/api/admin/provider/renewals', auth, requireAdmin, function(req, res) {
    var year = req.query.year || new Date().getFullYear();
    var rows = gA('SELECT * FROM provider_renewals WHERE year = ? ORDER BY created_at DESC', [year]);
    res.json(rows);
  });

  // 22. 执行年度续约检查（管理员/系统）
  app.post('/api/admin/provider/renewals/check', auth, requireAdmin, function(req, res) {
    var year = req.body.year || new Date().getFullYear();
    var minHours = 15; // 最低要求15学时

    // 获取所有已认证的服务商
    var providers = gA("SELECT id, provider_type, provider_id, name FROM provider_applications WHERE status = 'approved'");
    var results = [];

    for (var i = 0; i < providers.length; i++) {
      var p = providers[i];
      
      // 统计年度学时
      var edu = gQ('SELECT COALESCE(SUM(hours), 0) as total FROM provider_education WHERE provider_type = ? AND provider_id = ? AND strftime("%Y", completed_at) = ?',
        [p.provider_type, p.provider_id, String(year)]);
      var totalHours = edu ? edu.total : 0;

      // 统计年度投诉
      var comp = gQ('SELECT COUNT(*) as cnt FROM provider_complaints WHERE provider_type = ? AND provider_id = ? AND strftime("%Y", created_at) = ? AND status = ?',
        [p.provider_type, p.provider_id, String(year), 'resolved']);
      var complaintCount = comp ? comp.cnt : 0;

      // 统计年度平均评分
      var ratingTable = p.provider_type === 'nutritionist' ? 'nutritionist_reviews' : 'tcm_consultations';
      var ratingField = p.provider_type === 'nutritionist' ? 'nutritionist_id' : 'doctor_id';
      var rating = gQ('SELECT AVG(rating) as avg FROM ' + ratingTable + ' WHERE ' + ratingField + ' = ? AND strftime("%Y", created_at) = ? AND rating IS NOT NULL',
        [p.provider_id, String(year)]);
      var avgRating = rating ? (rating.avg || 5.0) : 5.0;

      // 判断是否达标
      var granted = totalHours >= minHours && complaintCount < 3 && avgRating >= 3.5;

      // 写入续约记录
      var existing = gQ('SELECT id FROM provider_renewals WHERE provider_type = ? AND provider_id = ? AND year = ?',
        [p.provider_type, p.provider_id, year]);
      if (existing) {
        gR('UPDATE provider_renewals SET education_hours = ?, complaint_count = ?, avg_rating = ?, renewal_status = ? WHERE id = ?',
          [totalHours, complaintCount, avgRating, granted ? 'granted' : 'denied', existing.id]);
      } else {
        gR('INSERT INTO provider_renewals (provider_type, provider_id, year, education_hours, min_education_hours, complaint_count, avg_rating, renewal_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [p.provider_type, p.provider_id, year, totalHours, minHours, complaintCount, avgRating, granted ? 'granted' : 'denied']);
      }

      results.push({
        name: p.name,
        provider_type: p.provider_type,
        education_hours: totalHours,
        complaint_count: complaintCount,
        avg_rating: Math.round(avgRating * 10) / 10,
        renewal_status: granted ? 'granted' : 'denied',
        reason: !granted ? (totalHours < minHours ? '学时不足' : complaintCount >= 3 ? '投诉过多' : '评分过低') : ''
      });
    }

    sDb();
    res.json({ year: year, results: results });
  });

  // ─────────────────────────────────────
  // === 审核数据看板（管理员） ===
  // ─────────────────────────────────────

  // 23. 审核数据统计
  app.get('/api/admin/provider/dashboard', auth, requireAdmin, function(req, res) {
    var stats = {
      applications: {
        total: gQ("SELECT COUNT(*) as c FROM provider_applications").c,
        pending_ai: gQ("SELECT COUNT(*) as c FROM provider_applications WHERE status = 'ai_reviewing'").c,
        pending_manual: gQ("SELECT COUNT(*) as c FROM provider_applications WHERE status IN ('ai_passed', 'manual_reviewing')").c,
        pending_interview: gQ("SELECT COUNT(*) as c FROM provider_applications WHERE status = 'interview_pending'").c,
        probation: gQ("SELECT COUNT(*) as c FROM provider_applications WHERE status = 'probation'").c,
        approved: gQ("SELECT COUNT(*) as c FROM provider_applications WHERE status = 'approved'").c,
        rejected: gQ("SELECT COUNT(*) as c FROM provider_applications WHERE status = 'rejected'").c,
        frozen: gQ("SELECT COUNT(*) as c FROM provider_applications WHERE status = 'frozen'").c
      },
      complaints: {
        pending: gQ("SELECT COUNT(*) as c FROM provider_complaints WHERE status = 'pending'").c,
        investigating: gQ("SELECT COUNT(*) as c FROM provider_complaints WHERE status = 'investigating'").c,
        total: gQ("SELECT COUNT(*) as c FROM provider_complaints").c
      },
      by_type: {
        nutritionist: gQ("SELECT COUNT(*) as c FROM provider_applications WHERE provider_type = 'nutritionist'").c,
        tcm_doctor: gQ("SELECT COUNT(*) as c FROM provider_applications WHERE provider_type = 'tcm_doctor'").c
      }
    };
    res.json(stats);
  });

  // 24. 星级动态调整 — 连续差评自动冻结
  app.post('/api/admin/provider/check-ratings', auth, requireAdmin, function(req, res) {
    // 检查营养师
    var badNutritionists = gA("SELECT nutritionist_id, COUNT(*) as bad_count FROM nutritionist_reviews WHERE rating <= 2 AND created_at >= datetime('now', '-30 days') GROUP BY nutritionist_id HAVING bad_count >= 2");
    var frozenList = [];

    for (var i = 0; i < badNutritionists.length; i++) {
      var n = badNutritionists[i];
      gR('UPDATE nutritionists SET available = 0 WHERE id = ?', [n.nutritionist_id]);
      var app2 = gQ("SELECT id FROM provider_applications WHERE provider_type = 'nutritionist' AND provider_id = ? AND status = 'approved'", [n.nutritionist_id]);
      if (app2) {
        gR("UPDATE provider_applications SET status = 'frozen', updated_at = datetime('now') WHERE id = ?", [app2.id]);
        logAudit(app2.id, 'freeze', req.userId, 'admin', '连续差评自动冻结（' + n.bad_count + '次差评）');
      }
      frozenList.push({ type: 'nutritionist', id: n.nutritionist_id, bad_count: n.bad_count });
    }

    // 检查中医师
    var badDoctors = gA("SELECT doctor_id, COUNT(*) as bad_count FROM tcm_consultations WHERE rating <= 2 AND rating IS NOT NULL AND created_at >= datetime('now', '-30 days') GROUP BY doctor_id HAVING bad_count >= 2");
    for (var j = 0; j < badDoctors.length; j++) {
      var d = badDoctors[j];
      gR('UPDATE tcm_doctors SET available = 0 WHERE id = ?', [d.doctor_id]);
      var app3 = gQ("SELECT id FROM provider_applications WHERE provider_type = 'tcm_doctor' AND provider_id = ? AND status = 'approved'", [d.doctor_id]);
      if (app3) {
        gR("UPDATE provider_applications SET status = 'frozen', updated_at = datetime('now') WHERE id = ?", [app3.id]);
        logAudit(app3.id, 'freeze', req.userId, 'admin', '连续差评自动冻结（' + d.bad_count + '次差评）');
      }
      frozenList.push({ type: 'tcm_doctor', id: d.doctor_id, bad_count: d.bad_count });
    }

    sDb();
    res.json({ success: true, frozen_count: frozenList.length, frozen_list: frozenList });
  });

  console.log('Provider Onboarding Service: 服务商入驻审核模块已加载');
}

module.exports = { setupRoutes };
