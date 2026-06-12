// ==================== 医生上线模块 ====================

// 1. 医生列表页
async function renderDoctors() {
  updateThemeIcon();
  var isGuest = !state.user;
  var h = '<div class="header"><h1><i class="fa-solid fa-user-doctor"></i> 医生上线</h1></div>';
  var b = '<div class="page" id="doctors-page">' +
    '<div style="padding:12px 16px 8px">' +
    '<div style="display:flex;gap:8px;align-items:center">' +
    '<input id="doctor-search" style="flex:1;padding:10px 14px;border:1px solid var(--border);border-radius:20px;font-size:14px;background:var(--bg);color:var(--text)" placeholder="搜索医生姓名/擅长..." onkeyup="if(event.key==\'Enter\')filterDoctors()">' +
    '<button onclick="filterDoctors()" style="background:var(--green);color:#fff;border:none;padding:10px 16px;border-radius:20px;cursor:pointer;font-size:14px">搜索</button>' +
    '</div></div>' +
    '<div id="doctors-list" class="loading"><div class="spinner"></div><p>加载中...</p></div>' +
    '</div>';
  document.getElementById('app').innerHTML = h + b;

  try {
    var doctors = await api('/tcm/doctors');
    window._doctorsCache = doctors;
    renderDoctorsList(doctors);
  } catch(e) {
    document.getElementById('doctors-list').innerHTML = '<div style="padding:40px;text-align:center;color:var(--red)">加载失败<br><button class="btn btn-sm btn-outline mt-2" onclick="renderDoctors()">重试</button></div>';
  }
}

function filterDoctors() {
  var term = document.getElementById('doctor-search').value.trim().toLowerCase();
  var doctors = window._doctorsCache || [];
  if (!term) {
    renderDoctorsList(doctors);
    return;
  }
  var filtered = doctors.filter(function(d) {
    return (d.name && d.name.toLowerCase().indexOf(term) >= 0) ||
           (d.specialty && d.specialty.toLowerCase().indexOf(term) >= 0) ||
           (d.hospital && d.hospital.toLowerCase().indexOf(term) >= 0);
  });
  renderDoctorsList(filtered);
}

function renderDoctorsList(doctors) {
  var html = '';
  if (!doctors || !doctors.length) {
    html = '<div style="padding:40px;text-align:center;color:var(--text2)">暂无医生数据</div>';
    document.getElementById('doctors-list').innerHTML = html;
    return;
  }
  for (var i = 0; i < doctors.length; i++) {
    var d = doctors[i];
    var stars = '';
    for (var j = 0; j < 5; j++) {
      stars += j < Math.round(d.rating || 0) ? '★' : '☆';
    }
    html += '<div class="card" style="cursor:pointer;margin-bottom:10px" onclick="navigate(\'doctor-detail\',{doctorId:' + d.id + '})">' +
      '<div style="display:flex;gap:12px;align-items:start">' +
      '<div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--green),#2d8a4e);display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:bold;flex-shrink:0">' + esc(d.name ? d.name[0] : '?') + '</div>' +
      '<div style="flex:1">' +
      '<div style="font-weight:600;font-size:16px">' + esc(d.name || '') + ' <span style="font-size:12px;color:var(--green)">' + esc(d.title || '') + '</span></div>' +
      '<div style="font-size:12px;color:var(--text2);margin:2px 0">' + esc(d.hospital || '') + '</div>' +
      '<div style="font-size:12px;color:var(--text2)">擅长: ' + esc(d.specialty || '') + '</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">' +
      '<span style="color:#f5a623;font-size:12px">' + stars + ' <span style="color:var(--text2)">' + (d.rating || 0) + '分 · ' + (d.consultation_count || 0) + '次咨询</span></span>' +
      '<span style="font-size:14px;font-weight:600;color:var(--green)">¥' + (d.price_online || 0) + '起</span></div></div></div>';
  }
  document.getElementById('doctors-list').innerHTML = html;
}

// 2. 医生详情页
async function renderDoctorDetail() {
  var doctorId = state.pageParams.doctorId;
  if (!doctorId) { navigate('doctors'); return; }
  updateThemeIcon();
  var h = '<div class="header"><h1><i class="fa-solid fa-user-doctor"></i> 医生详情</h1></div>';
  document.getElementById('app').innerHTML = h + '<div class="page" id="doctor-detail-page"><div class="loading"><div class="spinner"></div><p>加载中...</p></div></div>';

  try {
    var doctor = await api('/tcm/doctors/' + doctorId);
    window._currentDoctor = doctor;
    var stars = '';
    for (var i = 0; i < 5; i++) {
      stars += i < Math.round(doctor.rating || 0) ? '★' : '☆';
    }

    var services = doctor.services || [];
    var servicesHtml = '';
    for (var j = 0; j < services.length; j++) {
      var s = services[j];
      servicesHtml += '<div class="card" style="margin-bottom:8px">' +
        '<div style="font-weight:600;font-size:15px">' + esc(s.title || '') + '</div>' +
        '<div style="font-size:13px;color:var(--text2);margin:4px 0">' + esc(s.description || '') + '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">' +
        '<span style="font-size:13px;color:var(--text2)">时长: ' + (s.duration_minutes || 0) + '分钟</span>' +
        '<span style="font-size:16px;font-weight:700;color:var(--green)">¥' + (s.price || 0) + '</span></div>' +
        '<button onclick="startConsult(' + doctor.id + ',\'' + esc(doctor.name).replace(/'/g, '') + '\',\'' + esc(doctor.title || '').replace(/'/g, '') + '\',' + (s.price || 0) + ')" class="btn btn-primary btn-block mt-2" style="border-radius:8px">预约咨询</button>' +
        '</div>';
    }

    var html = '<div class="page" id="doctor-detail-page" style="padding-bottom:100px">' +
      '<div class="card" style="text-align:center;padding:20px">' +
      '<div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--green),#2d8a4e);display:flex;align-items:center;justify-content:center;color:#fff;font-size:36px;font-weight:bold;margin:0 auto 12px">' + esc(doctor.name ? doctor.name[0] : '?') + '</div>' +
      '<div style="font-size:20px;font-weight:700;margin-bottom:4px">' + esc(doctor.name || '') + '</div>' +
      '<div style="font-size:14px;color:var(--green);margin-bottom:8px">' + esc(doctor.title || '') + ' · ' + esc(doctor.hospital || '') + '</div>' +
      '<div style="font-size:13px;color:var(--text2);margin-bottom:4px">擅长: ' + esc(doctor.specialty || '') + '</div>' +
      '<div style="font-size:13px;color:var(--text2);margin-bottom:8px">' + esc(doctor.introduction || '') + '</div>' +
      '<div style="display:flex;justify-content:center;gap:16px;font-size:13px;color:var(--text2)">' +
      '<span>' + stars + ' ' + (doctor.rating || 0) + '分</span>' +
      '<span>' + (doctor.consultation_count || 0) + '次咨询</span>' +
      '</div></div>' +
      '<div class="card-title" style="padding:0 16px">服务项目</div>' +
      '<div style="padding:0 16px">' + (servicesHtml || '<div style="padding:20px;text-align:center;color:var(--text2)">暂无服务项目</div>') + '</div>' +
      '</div>';

    document.getElementById('doctor-detail-page').outerHTML = html;
  } catch(e) {
    document.getElementById('doctor-detail-page').innerHTML = '<div style="padding:40px;text-align:center;color:var(--red)">加载失败<br><button class="btn btn-sm btn-outline mt-2" onclick="renderDoctorDetail()">重试</button></div>';
  }
}

// ==================== 营养师上门模块 ====================

// 营养师列表页
async function renderNutritionists(filter) {
  updateThemeIcon();
  var h = '<div class="header"><h1><i class="fa-solid fa-apple-whole"></i> 营养师上门</h1></div>';
  var b = '<div class="page" id="nutritionists-page">' +
    '<div style="padding:12px 16px 8px">' +
    '<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">' +
    '<input id="nutritionist-search" style="flex:1;padding:10px 14px;border:1px solid var(--border);border-radius:20px;font-size:14px;background:var(--bg);color:var(--text)" placeholder="搜索营养师姓名/擅长..." onkeyup="if(event.key==\'Enter\')filterNutritionists()">' +
    '<button onclick="filterNutritionists()" style="background:var(--green);color:#fff;border:none;padding:10px 16px;border-radius:20px;cursor:pointer;font-size:14px">搜索</button>' +
    '</div>' +
    '<div id="nutritionist-filters" style="display:flex;gap:6px;overflow-x:auto;padding-bottom:8px">' +
    '<button class="filter-btn active" onclick="filterNutritionistsByType(\'all\')">全部</button>' +
    '<button class="filter-btn" onclick="filterNutritionistsByType(\'online\')">线上咨询</button>' +
    '<button class="filter-btn" onclick="filterNutritionistsByType(\'visit\')">上门服务</button>' +
    '</div></div>' +
    '<div id="nutritionists-list" class="loading"><div class="spinner"></div><p>加载中...</p></div>' +
    '</div>';
  document.getElementById('app').innerHTML = h + b;

  try {
    var nutritionists = await api('/nutritionists');
    window._nutritionistsCache = nutritionists;
    renderNutritionistsList(nutritionists);
  } catch(e) {
    document.getElementById('nutritionists-list').innerHTML = '<div style="padding:40px;text-align:center;color:var(--red)">加载失败<br><button class="btn btn-sm btn-outline mt-2" onclick="renderNutritionists()">重试</button></div>';
  }
}

function filterNutritionists() {
  var term = document.getElementById('nutritionist-search').value.trim().toLowerCase();
  var list = window._nutritionistsCache || [];
  if (!term) { renderNutritionistsList(list); return; }
  var filtered = list.filter(function(n) {
    return (n.name && n.name.toLowerCase().indexOf(term) >= 0) ||
           (n.specialty && n.specialty.toLowerCase().indexOf(term) >= 0) ||
           (n.hospital && n.hospital.toLowerCase().indexOf(term) >= 0);
  });
  renderNutritionistsList(filtered);
}

function filterNutritionistsByType(type) {
  var btns = document.querySelectorAll('#nutritionist-filters .filter-btn');
  for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
  event.target.classList.add('active');

  var list = window._nutritionistsCache || [];
  if (type === 'all') { renderNutritionistsList(list); return; }
  var filtered = list.filter(function(n) {
    return (type === 'online' && n.price_online > 0) ||
           (type === 'visit' && n.price_visit > 0);
  });
  renderNutritionistsList(filtered);
}

function renderNutritionistsList(list) {
  var html = '';
  if (!list || !list.length) {
    html = '<div style="padding:40px;text-align:center;color:var(--text2)">暂无营养师数据</div>';
    document.getElementById('nutritionists-list').innerHTML = html;
    return;
  }
  for (var i = 0; i < list.length; i++) {
    var n = list[i];
    var stars = '';
    for (var j = 0; j < 5; j++) {
      stars += j < Math.round(n.rating || 0) ? '★' : '☆';
    }
    html += '<div class="card" style="cursor:pointer;margin-bottom:10px" onclick="navigate(\'nutritionist-detail\',' + JSON.stringify({ id: n.id }).replace(/"/g, '&quot;') + ')">' +
      '<div style="display:flex;gap:12px;align-items:start">' +
      '<div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--green),#2d8a4e);display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:bold;flex-shrink:0">' + esc(n.name ? n.name[0] : '?') + '</div>' +
      '<div style="flex:1">' +
      '<div style="font-weight:600;font-size:16px">' + esc(n.name || '') + ' <span style="font-size:12px;color:var(--green)">' + esc(n.title || '') + '</span></div>' +
      '<div style="font-size:12px;color:var(--text2);margin:2px 0">' + esc(n.hospital || '') + '</div>' +
      '<div style="font-size:12px;color:var(--text2)">擅长: ' + esc(n.specialty || '') + '</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">' +
      '<span style="color:#f5a623;font-size:12px">' + stars + ' <span style="color:var(--text2)">' + (n.rating || 0) + '分 · ' + (n.service_count || 0) + '次服务</span></span>' +
      '<span style="font-size:14px;font-weight:600;color:var(--green)">线上¥' + (n.price_online || 0) + ' 上门¥' + (n.price_visit || 0) + '</span></div></div></div>';
  }
  document.getElementById('nutritionists-list').innerHTML = html;
}
