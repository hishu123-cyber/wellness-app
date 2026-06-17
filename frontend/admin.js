/* =============================================
   食术养生 - 管理后台 v2 (Admin Panel)
   ============================================= */

// ====== 管理员入口：在profile页面显示 ======
function renderAdminDashboard() {
  updateThemeIcon();
  var h = '<div class="header"><h1><i class="fa-solid fa-gauge-high"></i> 管理后台</h1></div>';
  var b = '<div class="page"><div class="loading"><div class="spinner"></div><p>加载中...</p></div></div>';
  document.getElementById('app').innerHTML = h + b;

  Promise.all([
    api('/api/admin/dashboard'),
    api('/api/admin/provider/dashboard').catch(function() { return null; })
  ]).then(function(results) {
    var dash = results[0] || {};
    var pdash = results[1] || {};
    buildDashboard(dash, pdash);
  }).catch(function() {
    document.getElementById('app').innerHTML = h + '<div class="page"><div class="empty-state"><div class="empty-icon">🔒</div><p>权限不足，请联系管理员</p><button class="btn btn-primary mt-4" onclick="navigate(\'profile\')">返回</button></div></div>';
  });
}

function buildDashboard(dash, pdash) {
  if (!dash) dash = {};
  if (!pdash) pdash = {};
  var apps = pdash.applications || {};

  // Stats cards - 2 rows of 4
  var row1 = [
    { icon: '👥', label: '总用户', value: dash.total_users || 0, color: '#4A7C59' },
    { icon: '📦', label: '总订单', value: dash.total_orders || 0, color: '#C75B39' },
    { icon: '💰', label: '总收入', value: '¥' + ((dash.total_revenue || 0).toLocaleString()), color: '#D4A017' },
    { icon: '📝', label: '商品数', value: dash.product_count || 0, color: '#5B7FBB' }
  ];
  var row2 = [
    { icon: '📄', label: '文章数', value: dash.article_count || 0, color: '#8B6FBB' },
    { icon: '🏥', label: '已认证服务商', value: apps.approved || 0, color: '#4A7C59' },
    { icon: '⏳', label: '待人工复审', value: apps.pending_manual || 0, color: '#C75B39' },
    { icon: '📋', label: '待AI审核', value: apps.pending_ai || 0, color: '#D4A017' }
  ];

  var html = '<div class="page">';

  // Row 1
  html += '<div class="admin-grid">';
  for (var i = 0; i < row1.length; i++) {
    html += '<div class="admin-stat-card" style="border-top:3px solid ' + row1[i].color + '">';
    html += '<div class="admin-stat-icon">' + row1[i].icon + '</div>';
    html += '<div class="admin-stat-value" style="color:' + row1[i].color + '">' + row1[i].value + '</div>';
    html += '<div class="admin-stat-label">' + row1[i].label + '</div></div>';
  }
  html += '</div>';

  // Row 2
  html += '<div class="admin-grid" style="margin-top:8px">';
  for (var i = 0; i < row2.length; i++) {
    html += '<div class="admin-stat-card" style="border-top:3px solid ' + row2[i].color + '">';
    html += '<div class="admin-stat-icon">' + row2[i].icon + '</div>';
    html += '<div class="admin-stat-value" style="color:' + row2[i].color + '">' + row2[i].value + '</div>';
    html += '<div class="admin-stat-label">' + row2[i].label + '</div></div>';
  }
  html += '</div>';

  // Action buttons
  html += '<div class="card mt-4"><div class="card-title">📋 快捷管理</div>';
  html += '<div class="admin-actions">';
  html += '<button class="admin-btn" onclick="navigate(\'admin-providers\')"><span>🏥</span> 服务商审核</button>';
  html += '<button class="admin-btn" onclick="navigate(\'admin-users\')"><span>👥</span> 用户管理</button>';
  html += '<button class="admin-btn" onclick="navigate(\'admin-products\')"><span>📦</span> 商品管理</button>';
  html += '<button class="admin-btn" onclick="navigate(\'admin-articles\')"><span>📄</span> 文章管理</button>';
  html += '<button class="admin-btn" onclick="adminBackup()"><span>💾</span> 数据备份</button>';
  html += '<button class="admin-btn" onclick="adminRefreshDB()"><span>🔄</span> 刷新缓存</button>';
  html += '</div></div>';

  // Recent orders (FIXED: use correct field names)
  html += '<div class="card mt-4"><div class="card-title">🔄 最近订单</div>';
  if (dash.recent_orders && dash.recent_orders.length > 0) {
    html += '<div class="list">';
    for (var i = 0; i < dash.recent_orders.length && i < 5; i++) {
      var o = dash.recent_orders[i];
      var statusColor = {pending:'#D4A017',paid:'#4A7C59',shipped:'#5B7FBB',completed:'#4A7C59',cancelled:'#C75B39'}[o.status] || '#888';
      html += '<div class="list-item">';
      html += '<div class="flex-between"><span style="font-weight:500">' + esc(o.order_no || '#' + o.id) + '</span>';
      html += '<span style="color:var(--green);font-weight:600">¥' + (o.total_amount || 0) + '</span></div>';
      html += '<div class="list-item-sub"><span style="color:' + statusColor + '">● ' + statusText(o.status) + '</span> · ' + (o.created_at || '').substring(0, 16) + '</div>';
      html += '</div>';
    }
    html += '</div>';
  } else {
    html += '<div style="text-align:center;padding:16px;color:var(--text2);font-size:13px">暂无订单数据</div>';
  }
  html += '</div>';

  // Provider overview
  if (apps.total !== undefined) {
    html += '<div class="card mt-4"><div class="card-title">🏥 服务商概览</div>';
    html += '<div class="flex-between mt-2"><span style="color:var(--text2)">营养师</span><span>' + (apps.by_type ? apps.by_type.nutritionist : 0) + ' 人</span></div>';
    html += '<div class="flex-between mt-2"><span style="color:var(--text2)">中医师</span><span>' + (apps.by_type ? apps.by_type.tcm_doctor : 0) + ' 人</span></div>';
    html += '<div class="flex-between mt-2"><span style="color:var(--text2)">试岗中</span><span>' + (apps.probation || 0) + ' 人</span></div>';
    html += '<div class="flex-between mt-2"><span style="color:var(--text2)">已冻结</span><span style="color:#C75B39">' + (apps.frozen || 0) + ' 人</span></div>';
    html += '</div>';
  }

  // System info
  html += '<div class="card mt-4"><div class="card-title">💻 系统信息</div>';
  html += '<div class="flex-between mt-2"><span style="color:var(--text2)">数据库</span><span>' + (dash.db_size || '正常') + '</span></div>';
  if (dash.uptime_seconds) {
    var hours = Math.floor(dash.uptime_seconds / 3600);
    var mins = Math.floor((dash.uptime_seconds % 3600) / 60);
    html += '<div class="flex-between mt-2"><span style="color:var(--text2)">运行时间</span><span>' + hours + '小时' + mins + '分钟</span></div>';
  }
  html += '<div class="flex-between mt-2"><span style="color:var(--text2)">版本</span><span>v0.1.0</span></div>';
  html += '</div>';

  html += '<button class="btn btn-block mt-4" style="background:#f5f5f5;color:var(--text);border:none;padding:12px;border-radius:8px;font-size:14px" onclick="navigate(\'profile\')">返回个人中心</button>';
  html += '</div>';

  document.getElementById('app').innerHTML = h + html;
}

function statusText(s) {
  var map = {pending:'待支付',paid:'已支付',shipped:'已发货',completed:'已完成',cancelled:'已取消',draft:'草稿',ai_reviewing:'AI审核中',ai_passed:'AI通过',ai_rejected:'AI驳回',manual_reviewing:'人工复审',interview_pending:'待面试',probation:'试岗中',approved:'已认证',rejected:'已驳回',frozen:'已冻结'};
  return map[s] || s || '';
}

// ====== 服务商审核管理 ======
async function renderAdminProviders() {
  updateThemeIcon();
  var h = '<div class="header"><h1><i class="fa-solid fa-file-shield"></i> 服务商审核</h1></div>';
  var b = '<div class="page"><div class="loading"><div class="spinner"></div><p>加载中...</p></div></div>';
  document.getElementById('app').innerHTML = h + b;

  try {
    var apps = await api('/api/admin/provider/applications');
    var pdash = await api('/api/admin/provider/dashboard').catch(function() { return null; });
    var html = '<div class="page">';

    // Summary bar
    if (pdash && pdash.applications) {
      var a = pdash.applications;
      html += '<div class="admin-summary-bar">';
      html += '<span>全部 <b>' + a.total + '</b></span>';
      html += '<span style="color:#D4A017">⏳待复审 <b>' + a.pending_manual + '</b></span>';
      html += '<span style="color:#4A7C59">✅通过 <b>' + a.approved + '</b></span>';
      html += '<span style="color:#C75B39">❌驳回 <b>' + a.rejected + '</b></span>';
      html += '</div>';
    }

    if (!apps || apps.length === 0) {
      html += '<div class="empty-state"><div class="empty-icon">✅</div><p>暂无待审核申请</p></div>';
    } else {
      for (var i = 0; i < apps.length; i++) {
        var a = apps[i];
        var statusMap = {
          'draft': '📝 草稿', 'submitted': '📤 已提交', 'ai_reviewing': '🤖 AI审核中',
          'ai_passed': '✅ AI通过', 'ai_rejected': '❌ AI驳回', 'manual_reviewing': '👤 人工复审',
          'interview_pending': '🎯 待面试', 'interview_scheduled': '📅 已安排面试',
          'probation': '🔄 试岗中', 'approved': '✔️ 已认证', 'rejected': '❌ 已驳回',
          'withdrawn': '↩️ 已撤回', 'frozen': '🧊 已冻结', 'expired': '⌛ 已过期'
        };
        var statusText2 = statusMap[a.status] || a.status;
        var statusClass = a.status === 'approved' ? 'status-approved' : (a.status === 'rejected' || a.status === 'frozen' ? 'status-rejected' : 'status-pending');
        var typeIcon = a.provider_type === 'nutritionist' ? '🥗' : '🏺';
        var city = a.city || a.service_areas || '';

        html += '<div class="card provider-card" onclick="renderAdminProviderDetail(' + a.id + ')" style="cursor:pointer;margin-bottom:8px">';
        html += '<div class="flex-between"><div><strong>' + typeIcon + ' ' + esc(a.name || '未命名') + '</strong></div><div><span class="status-badge ' + statusClass + '">' + statusText2 + '</span></div></div>';
        html += '<div class="list-item-sub mt-1">' + esc(a.provider_type === 'nutritionist' ? '营养师' : '中医师') + (city ? ' · ' + esc(city) : '') + '</div>';
        html += '<div class="list-item-sub" style="color:var(--text2)">' + (a.created_at ? a.created_at.substring(0, 10) : '') + (a.specialty || a.specialties ? ' · ' + esc(a.specialty || a.specialties) : '') + '</div>';
        html += '</div>';
      }
    }

    html += '<button class="btn btn-block mt-4" style="background:#eee;border:none;padding:12px;border-radius:8px;font-size:14px" onclick="navigate(\'admin-dashboard\')">返回后台</button>';
    html += '</div>';
    document.getElementById('app').innerHTML = h + html;

  } catch (e) {
    document.getElementById('app').innerHTML = h + '<div class="page"><div class="empty-state"><div class="empty-icon">🔒</div><p>权限不足</p><button class="btn btn-primary mt-4" onclick="navigate(\'profile\')">返回</button></div></div>';
  }
}

async function renderAdminProviderDetail(id) {
  updateThemeIcon();
  var h = '<div class="header"><a onclick="navigate(\'admin-providers\')" style="position:absolute;left:12px;top:0;font-size:20px;color:var(--green)">←</a><h1><i class="fa-solid fa-file"></i> 申请详情</h1></div>';
  var b = '<div class="page"><div class="loading"><div class="spinner"></div><p>加载中...</p></div></div>';
  document.getElementById('app').innerHTML = h + b;

  try {
    var a = await api('/api/admin/provider/applications/' + id);
    var html = '<div class="page">';

    // Status badge
    var statusMap = {
      'draft':'📝 草稿','submitted':'📤 已提交','ai_reviewing':'🤖 AI审核中',
      'ai_passed':'✅ AI通过','ai_rejected':'❌ AI驳回','manual_reviewing':'👤 人工复审',
      'interview_pending':'🎯 待面试','probation':'🔄 试岗中','approved':'✔️ 已认证',
      'rejected':'❌ 已驳回','frozen':'🧊 已冻结'
    };
    var statusText2 = statusMap[a.status] || a.status;
    var statusClass = a.status === 'approved' ? 'status-approved' : (a.status === 'rejected' || a.status === 'frozen' ? 'status-rejected' : 'status-pending');

    html += '<div class="card"><div class="card-title">👤 基本资料</div>';
    html += '<div style="text-align:center;margin-bottom:12px"><span class="status-badge ' + statusClass + '" style="font-size:14px;padding:4px 12px">' + statusText2 + '</span></div>';
    html += row('姓名', esc(a.name || '-'));
    html += row('类型', a.provider_type === 'nutritionist' ? '🥗 营养师' : '🏺 中医师');
    html += row('手机', esc(a.phone || '-'));
    html += row('性别', {male:'男',female:'女'}[a.gender] || '-');
    html += row('城市', esc(a.city || a.service_areas || '-'));
    if (a.specialty || a.specialties) html += row('专长', esc(a.specialty || a.specialties));
    if (a.experience_years) html += row('从业年限', a.experience_years + ' 年');
    if (a.price_online) html += row('线上咨询价', '¥' + a.price_online + '/次');
    if (a.price_visit) html += row('上门服务价', '¥' + a.price_visit + '/次');
    html += row('提交时间', a.created_at ? a.created_at.substring(0, 16) : '-');
    html += '</div>';

    // AI review result
    if (a.ai_review_result) {
      var aiResult = null;
      try { aiResult = typeof a.ai_review_result === 'string' ? JSON.parse(a.ai_review_result) : a.ai_review_result; } catch(e) {}
      if (aiResult && aiResult.score !== undefined) {
        var scoreColor = aiResult.score >= 7 ? '#4A7C59' : (aiResult.score >= 5 ? '#D4A017' : '#C75B39');
        html += '<div class="card mt-4"><div class="card-title">🤖 AI初审结果</div>';
        html += row('AI评分', '<span style="color:' + scoreColor + ';font-weight:bold">' + aiResult.score + '/10</span>');
        if (aiResult.reasons && aiResult.reasons.length) html += '<div style="margin-top:8px;font-size:13px;color:var(--text2);line-height:1.6">' + esc(aiResult.reasons.join('；')) + '</div>';
        if (a.ocr_verified) html += '<div style="margin-top:6px;font-size:12px;color:#4A7C59">✅ OCR证件识别已验证</div>';
        html += '</div>';
      }
    }

    // Real name / face verify
    html += '<div class="card mt-4"><div class="card-title">🔐 实名认证</div>';
    html += row('证件认证', a.real_name_verified ? '<span style="color:#4A7C59">✅ 已认证</span>' : '<span style="color:#C75B39">❌ 未认证</span>');
    html += row('人脸核验', a.face_verified ? '<span style="color:#4A7C59">✅ 已核验</span>' : '<span style="color:#C75B39">❌ 未核验</span>');
    if (a.cert_type) html += row('证书类型', esc(a.cert_type));
    if (a.cert_number) html += row('证书编号', esc(a.cert_number));
    html += '</div>';

    // Review actions
    html += '<div class="card mt-4"><div class="card-title">⚡ 审核操作</div>';

    if (a.status === 'ai_passed' || a.status === 'manual_reviewing') {
      html += '<div class="form-group"><label>审核备注</label><textarea id="review-note" rows="3" class="form-input" placeholder="请输入审核意见（选填）..."></textarea></div>';
      html += '<div style="display:flex;gap:8px;margin-top:8px">';
      html += '<button class="btn btn-primary" style="flex:1;background:#4A7C59;border:none" onclick="adminReview(' + a.id + ', \'pass\')">✅ 通过认证</button>';
      html += '<button class="btn btn-outline" style="flex:1;background:#FFEBEE;color:#C75B39;border:1px solid #C75B39" onclick="adminReview(' + a.id + ', \'reject\')">❌ 驳回申请</button>';
      html += '</div>';
      if (a.provider_type === 'nutritionist') {
        html += '<button class="btn btn-outline btn-block mt-2" style="border:1px solid #5B7FBB;color:#5B7FBB" onclick="adminReview(' + a.id + ', \'interview\')">🎯 转为面试</button>';
      }
    } else if (a.status === 'interview_pending') {
      html += '<div class="form-group"><label>面试评分 (1-10)</label><input id="interview-score" type="number" min="1" max="10" value="7" class="form-input"></div>';
      html += '<div class="form-group"><label>面试备注</label><textarea id="interview-note" rows="2" class="form-input" placeholder="面试评价..."></textarea></div>';
      html += '<div style="display:flex;gap:8px;margin-top:8px">';
      html += '<button class="btn btn-primary" style="flex:1;background:#4A7C59;border:none" onclick="adminInterview(' + a.id + ', true)">✅ 面试通过</button>';
      html += '<button class="btn btn-outline" style="flex:1;background:#FFEBEE;color:#C75B39;border:1px solid #C75B39" onclick="adminInterview(' + a.id + ', false)">❌ 面试未过</button>';
      html += '</div>';
    } else if (a.status === 'probation') {
      html += '<div class="form-group"><label>试岗备注</label><textarea id="probation-note" rows="2" class="form-input" placeholder="试岗考核备注..."></textarea></div>';
      html += '<div style="display:flex;gap:8px;margin-top:8px">';
      html += '<button class="btn btn-primary" style="flex:1;background:#4A7C59;border:none" onclick="adminProbation(' + a.id + ', true)">✅ 批准转正</button>';
      html += '<button class="btn btn-outline" style="flex:1;background:#FFEBEE;color:#C75B39;border:1px solid #C75B39" onclick="adminProbation(' + a.id + ', false)">❌ 试岗淘汰</button>';
      html += '</div>';
    } else if (a.status === 'approved') {
      html += '<div style="display:flex;gap:8px">';
      html += '<button class="btn btn-outline" style="flex:1;background:#FFF3E0;color:#E65100;border:1px solid #E65100" onclick="adminReview(' + a.id + ', \'freeze\')">🧊 冻结账号</button>';
      html += '<button class="btn btn-outline" style="flex:1;background:#FFEBEE;color:#C75B39;border:1px solid #C75B39" onclick="adminReview(' + a.id + ', \'reject\')">❌ 注销认证</button>';
      html += '</div>';
    } else if (a.status === 'frozen' || a.status === 'rejected') {
      html += '<button class="btn btn-primary btn-block" style="background:#4A7C59;border:none" onclick="adminReview(' + a.id + ', \'restore\')">🔓 解除冻结/重新认证</button>';
    } else {
      html += '<div style="text-align:center;padding:16px;color:var(--text2);font-size:13px">当前状态「' + statusText2 + '」暂无操作</div>';
    }
    html += '</div>';

    html += '<button class="btn btn-block mt-4" style="background:#eee;border:none;padding:12px;border-radius:8px;font-size:14px" onclick="navigate(\'admin-providers\')">返回列表</button>';
    html += '</div>';
    document.getElementById('app').innerHTML = h + html;

  } catch (e) {
    document.getElementById('app').innerHTML = h + '<div class="page"><div class="empty-state"><div class="empty-icon">🔒</div><p>加载失败</p><button class="btn btn-primary mt-4" onclick="navigate(\'admin-providers\')">返回</button></div></div>';
  }
}

function row(label, value) {
  return '<div class="flex-between mt-2"><span style="color:var(--text2);font-size:13px">' + label + '</span><span style="font-size:13px;text-align:right;max-width:60%">' + value + '</span></div>';
}

// ====== 用户管理 ======
async function renderAdminUsers() {
  updateThemeIcon();
  var h = '<div class="header"><h1><i class="fa-solid fa-users"></i> 用户管理</h1></div>';
  document.getElementById('app').innerHTML = h + '<div class="page"><div class="loading"><div class="spinner"></div><p>加载中...</p></div></div>';

  try {
    var users = await api('/api/admin/users');
    var html = '<div class="page">';

    // Search bar
    html += '<div style="position:relative;margin-bottom:12px">';
    html += '<input id="user-search" type="text" class="form-input" placeholder="🔍 搜索用户名/昵称..." oninput="filterUsers(this.value)">';
    html += '</div>';

    // Summary
    var adminCount = users.filter(function(u) { return u.role === 'admin'; }).length;
    var vipCount = users.filter(function(u) { return u.is_vip; }).length;
    html += '<div class="admin-summary-bar" style="margin-bottom:12px">';
    html += '<span>全部 <b>' + users.length + '</b></span>';
    html += '<span style="color:#D4A017">👑管理员 <b>' + adminCount + '</b></span>';
    html += '<span style="color:#4A7C59">⭐VIP <b>' + vipCount + '</b></span>';
    html += '</div>';

    html += '<div id="users-list">';
    html += buildUsersList(users);
    html += '</div>';

    html += '<button class="btn btn-block mt-4" style="background:#eee;border:none;padding:12px;border-radius:8px;font-size:14px" onclick="navigate(\'admin-dashboard\')">返回后台</button>';
    html += '</div>';
    document.getElementById('app').innerHTML = h + html;

    // Store for filtering
    window._adminUsers = users;

  } catch (e) {
    document.getElementById('app').innerHTML = h + '<div class="page"><div class="empty-state"><div class="empty-icon">🔒</div><p>权限不足</p></div></div>';
  }
}

function buildUsersList(users) {
  if (!users || users.length === 0) {
    return '<div class="empty-state"><div class="empty-icon">👥</div><p>暂无用户</p></div>';
  }
  var html = '';
  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    var roleColor = u.role === 'admin' ? '#D4A017' : '#5B7FBB';
    var roleLabel = u.role === 'admin' ? '管理员' : '普通用户';
    var vipLabel = u.is_vip ? '<span style="color:#D4A017;font-size:11px">⭐ VIP</span>' : '';
    var createdAt = u.created_at ? u.created_at.substring(0, 10) : '';

    html += '<div class="card admin-user-card" style="margin-bottom:8px;padding:12px 14px" data-username="' + esc(u.username).toLowerCase() + '" data-nickname="' + esc(u.nickname || '').toLowerCase() + '">';
    html += '<div class="flex-between"><div style="display:flex;align-items:center;gap:8px">';
    html += '<div style="width:36px;height:36px;background:var(--green);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px;font-weight:bold">' + esc((u.nickname || u.username || '?')[0].toUpperCase()) + '</div>';
    html += '<div><div style="font-weight:600;font-size:14px">' + esc(u.nickname || u.username) + '</div>';
    html += '<div style="font-size:12px;color:var(--text2)">' + esc(u.username) + ' · ' + createdAt + '</div></div></div>';
    html += '<div style="text-align:right"><span class="status-badge" style="background:' + roleColor + ';color:#fff;font-size:11px;padding:2px 8px;border-radius:10px">' + roleLabel + '</span>';
    if (vipLabel) html += '<div style="margin-top:4px;text-align:right">' + vipLabel + '</div>';
    html += '</div></div>';

    // Action buttons
    html += '<div style="margin-top:8px;padding-top:8px;border-top:1px solid #f0f0f0;display:flex;gap:6px;flex-wrap:wrap">';
    if (u.role !== 'admin') {
      html += '<button class="admin-action-btn" style="color:#D4A017" onclick="adminSetRole(' + u.id + ', \'admin\')">👑 升为管理员</button>';
    } else {
      html += '<button class="admin-action-btn" style="color:#888" onclick="adminSetRole(' + u.id + ', \'user\')">👤 撤销管理员</button>';
    }
    html += '<button class="admin-action-btn" style="color:#4A7C59" onclick="adminSetVIP(' + u.id + ', 1)">⭐ 开通VIP</button>';
    if (u.is_vip) {
      html += '<button class="admin-action-btn" style="color:#C75B39" onclick="adminSetVIP(' + u.id + ', 0)">✖ 取消VIP</button>';
    }
    html += '<button class="admin-action-btn" style="color:#5B7FBB" onclick="adminResetPwd(' + u.id + ', \'' + esc(u.username) + '\')">🔑 重置密码</button>';
    html += '</div></div>';
  }
  return html;
}

function filterUsers(query) {
  query = query.toLowerCase();
  var cards = document.querySelectorAll('.admin-user-card');
  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];
    var match = card.dataset.username.indexOf(query) !== -1 || card.dataset.nickname.indexOf(query) !== -1;
    card.style.display = match ? '' : 'none';
  }
}

async function adminSetRole(userId, role) {
  if (!confirm('确定将用户 #' + userId + ' 的角色变更为「' + (role === 'admin' ? '管理员' : '普通用户') + '」？')) return;
  try {
    showToast('处理中...');
    await api('/api/admin/users/' + userId + '/role', { method: 'PUT', body: { role: role } });
    showToast('✅ 角色已更新');
    renderAdminUsers();
  } catch(e) {
    showToast('❌ 操作失败');
  }
}

async function adminSetVIP(userId, isVip) {
  try {
    showToast('处理中...');
    await api('/api/admin/users/' + userId + '/vip', { method: 'PUT', body: { is_vip: isVip } });
    showToast(isVip ? '✅ VIP已开通' : '✅ VIP已取消');
    renderAdminUsers();
  } catch(e) {
    showToast('❌ 操作失败');
  }
}

async function adminResetPwd(userId, username) {
  var newPwd = prompt('为用户「' + username + '」设置新密码（留空则随机生成）：');
  if (newPwd === null) return;
  if (newPwd === '') {
    var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$';
    newPwd = '';
    for (var i = 0; i < 12; i++) newPwd += chars[Math.floor(Math.random() * chars.length)];
  }
  try {
    showToast('处理中...');
    var result = await api('/api/admin/users/' + userId + '/reset-password', { method: 'POST', body: { password: newPwd } });
    showToast('✅ 新密码：' + newPwd);
  } catch(e) {
    showToast('❌ 操作失败');
  }
}

// ====== 商品管理 ======
async function renderAdminProducts() {
  updateThemeIcon();
  var h = '<div class="header"><h1><i class="fa-solid fa-box"></i> 商品管理</h1></div>';
  document.getElementById('app').innerHTML = h + '<div class="page"><div class="loading"><div class="spinner"></div><p>加载中...</p></div></div>';

  try {
    var products = await api('/api/admin/products');
    var html = '<div class="page">';

    // Category filter
    var cats = [];
    if (products) {
      for (var i = 0; i < products.length; i++) {
        if (cats.indexOf(products[i].category) === -1) cats.push(products[i].category);
      }
    }
    html += '<div class="admin-summary-bar" style="margin-bottom:12px">';
    html += '<span>全部 <b>' + (products ? products.length : 0) + '</b></span>';
    for (var i = 0; i < cats.length; i++) {
      html += '<span style="cursor:pointer" onclick="filterProducts(\'' + esc(cats[i]) + '\')">' + esc(cats[i]) + '</span>';
    }
    html += '<span style="cursor:pointer" onclick="filterProducts(\'\')">全部</span>';
    html += '</div>';
    html += '<div id="products-list">';

    if (!products || products.length === 0) {
      html += '<div class="empty-state"><div class="empty-icon">📦</div><p>暂无商品</p></div>';
    } else {
      for (var i = 0; i < products.length; i++) {
        var p = products[i];
        var isActive = p.is_active !== 0;
        var stockLow = p.stock < 5;
        html += '<div class="card" style="margin-bottom:8px" data-category="' + esc(p.category || '') + '">';
        html += '<div class="flex-between"><div><strong>' + esc(p.name) + '</strong>';
        if (!isActive) html += ' <span style="background:#f5f5f5;color:#999;font-size:11px;padding:1px 6px;border-radius:4px">已下架</span>';
        html += '</div><div><span style="color:var(--green);font-weight:bold;font-size:15px">¥' + p.price + '</span></div></div>';
        html += '<div class="list-item-sub">' + esc(p.category || '') + ' · 库存 <span style="color:' + (stockLow ? '#C75B39' : '#4A7C59') + ';font-weight:' + (stockLow ? 'bold' : 'normal') + '">' + p.stock + '</span> · 销量 ' + (p.sales_count || 0) + '</div>';
        if (p.description) html += '<div style="font-size:12px;color:var(--text2);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(p.description) + '</div>';
        html += '<div style="margin-top:8px;display:flex;gap:6px">';
        html += '<button class="admin-action-btn" style="color:' + (isActive ? '#C75B39' : '#4A7C59') + '" onclick="adminToggleProduct(' + p.id + ', ' + !isActive + ')">' + (isActive ? '⬇️ 下架' : '⬆️ 上架') + '</button>';
        html += '<button class="admin-action-btn" style="color:#5B7FBB" onclick="adminEditProduct(' + p.id + ')">✏️ 编辑</button>';
        html += '</div></div>';
      }
    }
    html += '</div>';
    html += '<button class="btn btn-block mt-4" style="background:#4A7C59;color:#fff;border:none;padding:12px;border-radius:8px;font-size:14px" onclick="adminAddProduct()">➕ 添加商品</button>';
    html += '<button class="btn btn-block mt-3" style="background:#eee;border:none;padding:12px;border-radius:8px;font-size:14px" onclick="navigate(\'admin-dashboard\')">返回后台</button>';
    html += '</div>';
    document.getElementById('app').innerHTML = h + html;

  } catch (e) {
    document.getElementById('app').innerHTML = h + '<div class="page"><div class="empty-state"><div class="empty-icon">🔒</div><p>权限不足</p></div></div>';
  }
}

function filterProducts(category) {
  var cards = document.querySelectorAll('#products-list .card');
  for (var i = 0; i < cards.length; i++) {
    var match = category === '' || cards[i].dataset.category === category;
    cards[i].style.display = match ? '' : 'none';
  }
}

async function adminToggleProduct(id, activate) {
  try {
    await api('/api/shop/products/' + id, { method: 'PUT', body: { is_active: activate ? 1 : 0 } });
    showToast(activate ? '✅ 商品已上架' : '⬇️ 商品已下架');
    renderAdminProducts();
  } catch(e) {
    showToast('❌ 操作失败');
  }
}

function adminEditProduct(id) {
  showToast('✏️ 商品编辑功能开发中');
}

function adminAddProduct() {
  showToast('➕ 添加商品功能开发中');
}

// ====== 文章管理 ======
async function renderAdminArticles() {
  updateThemeIcon();
  var h = '<div class="header"><h1><i class="fa-solid fa-newspaper"></i> 文章管理</h1></div>';
  document.getElementById('app').innerHTML = h + '<div class="page"><div class="loading"><div class="spinner"></div><p>加载中...</p></div></div>';

  try {
    var articles = await api('/api/admin/articles');
    var items = articles && articles.items ? articles.items : (Array.isArray(articles) ? articles : []);
    var html = '<div class="page">';

    var cats = {};
    for (var i = 0; i < items.length; i++) {
      var c = items[i].category || '未分类';
      cats[c] = (cats[c] || 0) + 1;
    }
    html += '<div class="admin-summary-bar" style="margin-bottom:12px">';
    html += '<span>全部 <b>' + items.length + '</b></span>';
    for (var c in cats) {
      html += '<span style="cursor:pointer" onclick="filterArticles(\'' + esc(c) + '\')">' + esc(c) + ' <b>' + cats[c] + '</b></span>';
    }
    html += '<span style="cursor:pointer" onclick="filterArticles(\'\')">全部</span>';
    html += '</div>';
    html += '<div id="articles-list">';

    if (items.length === 0) {
      html += '<div class="empty-state"><div class="empty-icon">📄</div><p>暂无文章</p></div>';
    } else {
      for (var i = 0; i < items.length; i++) {
        var a = items[i];
        var isPublished = a.is_published !== 0;
        html += '<div class="card" style="margin-bottom:8px" data-category="' + esc(a.category || '未分类') + '">';
        html += '<div class="flex-between"><div><strong>' + esc(a.title) + '</strong>';
        if (!isPublished) html += ' <span style="background:#FFF3E0;color:#E65100;font-size:11px;padding:1px 6px;border-radius:4px">草稿</span>';
        html += '</div><span class="status-badge status-pending" style="font-size:11px">' + esc(a.category || '未分类') + '</span></div>';
        if (a.summary) html += '<div style="font-size:12px;color:var(--text2);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(a.summary.substring(0, 80)) + '</div>';
        html += '<div class="list-item-sub">👁 ' + (a.view_count || 0) + ' · ' + (a.created_at ? a.created_at.substring(0, 10) : '') + '</div>';
        html += '<div style="margin-top:8px;display:flex;gap:6px">';
        html += '<button class="admin-action-btn" style="color:' + (isPublished ? '#C75B39' : '#4A7C59') + '" onclick="adminToggleArticle(' + a.id + ', ' + !isPublished + ')">' + (isPublished ? '📥 下架' : '📤 发布') + '</button>';
        html += '<button class="admin-action-btn" style="color:#5B7FBB" onclick="adminPreviewArticle(' + a.id + ')">👁 预览</button>';
        html += '</div></div>';
      }
    }
    html += '</div>';
    html += '<button class="btn btn-block mt-3" style="background:#eee;border:none;padding:12px;border-radius:8px;font-size:14px" onclick="navigate(\'admin-dashboard\')">返回后台</button>';
    html += '</div>';
    document.getElementById('app').innerHTML = h + html;

  } catch (e) {
    document.getElementById('app').innerHTML = h + '<div class="page"><div class="empty-state"><div class="empty-icon">🔒</div><p>权限不足</p></div></div>';
  }
}

function filterArticles(category) {
  var cards = document.querySelectorAll('#articles-list .card');
  for (var i = 0; i < cards.length; i++) {
    var match = category === '' || cards[i].dataset.category === category;
    cards[i].style.display = match ? '' : 'none';
  }
}

async function adminToggleArticle(id, publish) {
  try {
    await api('/api/articles/' + id, { method: 'PUT', body: { is_published: publish ? 1 : 0 } });
    showToast(publish ? '✅ 文章已发布' : '📥 文章已下架');
    renderAdminArticles();
  } catch(e) {
    showToast('❌ 操作失败');
  }
}

function adminPreviewArticle(id) {
  navigate('article-detail');
  // Try to find the article in current cache
  showToast('正在加载文章...');
}

// ====== Admin API functions ======
async function adminBackup() {
  showToast('💾 正在备份数据库...');
  try {
    var r = await api('/api/admin/backup', { method: 'POST' });
    showToast('✅ 备份完成');
  } catch(e) {
    showToast('❌ 备份失败');
  }
}

async function adminRefreshDB() {
  showToast('🔄 刷新缓存...');
  window.location.reload();
}

async function adminCheckRatings() {
  showToast('正在检查评分...');
  try {
    var r = await api('/api/admin/provider/check-ratings', { method: 'POST' });
    showToast('✅ ' + (r.detail || '检查完成'));
  } catch(e) {
    showToast('❌ ' + (e.detail || '检查失败'));
  }
}

async function adminReview(appId, action) {
  var note = document.getElementById('review-note');
  var noteText = note ? note.value : '';
  try {
    showToast('处理中...');
    await api('/api/admin/provider/applications/' + appId + '/manual-review', {
      method: 'POST',
      body: { action: action, note: noteText }
    });
    showToast('✅ 操作成功');
    renderAdminProviders();
  } catch(e) {
    showToast('❌ ' + (e.detail || '操作失败'));
  }
}

async function adminInterview(appId, passed) {
  var scoreEl = document.getElementById('interview-score');
  var noteEl = document.getElementById('interview-note');
  try {
    showToast('处理中...');
    await api('/api/admin/provider/applications/' + appId + '/interview', {
      method: 'POST',
      body: {
        passed: passed,
        score: passed ? parseInt(scoreEl ? scoreEl.value : 7) : 0,
        note: noteEl ? noteEl.value : ''
      }
    });
    showToast(passed ? '✅ 面试通过' : '❌ 面试未过');
    renderAdminProviders();
  } catch(e) {
    showToast('❌ ' + (e.detail || '操作失败'));
  }
}

async function adminProbation(appId, passed) {
  var noteEl = document.getElementById('probation-note');
  try {
    showToast('处理中...');
    await api('/api/admin/provider/applications/' + appId + '/probation', {
      method: 'POST',
      body: {
        passed: passed,
        reason: passed ? '' : (noteEl ? noteEl.value : '')
      }
    });
    showToast(passed ? '✅ 已批准转正' : '❌ 已淘汰');
    renderAdminProviders();
  } catch(e) {
    showToast('❌ ' + (e.detail || '操作失败'));
  }
}

// ====== Toast ======
function showToast(msg) {
  var t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.8);color:#fff;padding:12px 24px;border-radius:8px;font-size:14px;z-index:9999;transition:opacity .3s;text-align:center;max-width:80%;line-height:1.5';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._hide);
  t._hide = setTimeout(function() { t.style.opacity = '0'; }, 2500);
}
