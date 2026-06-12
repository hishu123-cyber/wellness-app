const API=window.location.origin+'/api';
let state={user:null,token:localStorage.getItem('token'),page:'home',pageParams:{}};
function toast(m,t){if(!t)t='success';var e=document.getElementById('toast');if(!e){e=document.createElement('div');e.id='toast';e.className='toast';document.body.appendChild(e);}e.textContent=m;e.className='toast toast-'+t+' show';clearTimeout(e._timer);e._timer=setTimeout(function(){e.classList.remove('show');},2500);}
async function api(p,o){if(!o)o={};var h={'Content-Type':'application/json'};if(state.token)h['Authorization']='Bearer '+state.token;try{var r=await fetch(API+p,{...o,headers:h});if(r.status===401&&!p.startsWith('/auth/')&&!o.noRedirect){state.token=null;localStorage.removeItem('token');state.user=null;navigate('login');throw Error('Unauthorized');}var d=await r.json();if(!r.ok)throw Error(d.detail||'Error');return d;}catch(e){if(o.silent)return null;throw e;}}
function navigate(p,params){if(!params)params={};state.page=p;state.pageParams=params;window.scrollTo(0,0);if(typeof updateTabBar==='function')updateTabBar();render();}
function render(){console.log('[render] called, page=', state.page, 'user=', !!state.user, 'token=', !!state.token);var guestPages=['shop','shop-product','shop-cart','recipes','recipe-detail','solar','articles','article-detail','tea'];var needAuth=state.page&&!guestPages.includes(state.page);if(!state.user&&state.token){api('/auth/me').then(function(u){state.user=u;render();}).catch(function(){state.token=null;localStorage.removeItem('token');if(needAuth){renderLogin();}else{render();}});document.getElementById('app').innerHTML='<div class="loading"><div class="spinner"></div><p>加载中...</p></div>';return;}if(!state.user&&needAuth){renderLogin();return;}var ps={home:renderHome,diary:renderDiary,tea:renderTea,shop:renderShop,'shop-product':renderShopProduct,'shop-cart':renderShopCart,'diary-edit':renderDiaryEdit,constitution:renderConstitution,'constitution-assess':renderConstitutionAssess,'constitution-result':renderConstitutionResult,recipes:renderRecipes,'recipe-detail':renderRecipeDetail,solar:renderSolar,articles:renderArticles,'article-detail':renderArticleDetail,profile:renderProfile,'profile-edit':renderProfileEdit,tcm:renderTCM,consulting:renderConsulting,doctors:renderDoctors,'doctor-detail':renderDoctorDetail,consultation:renderConsultation,'my-consultations':renderMyConsultations,nutritionists:renderNutritionists,'nutritionist-detail':renderNutritionistDetail,'nutritionist-booking':renderNutritionistBooking,'my-nutritionist-bookings':renderMyNutritionistBookings,'provider-apply':renderProviderApply,'provider-application':renderProviderApplication,'provider-my-applications':renderProviderMyApplications,'ai-constitution':renderAIConstitution,'smart-shop':renderSmartShop,'diet-plan':renderDietPlan,'seasonal-calendar':renderSeasonalCalendar,'daily-tasks':renderDailyTasks,'health-archive':renderHealthArchive};var fn=ps[state.page];if(fn)fn();else renderHome();}
// nav removed: now using app.html fixed bottom navigation bar
function hd(t,b){return '<div class="header header-back"><button onclick="navigate(\''+(b||'home')+'\')">‹</button><div style="flex:1"><h1>'+t+'</h1></div><button class="theme-toggle" onclick="toggleTheme()" style="background:none;border:none;color:#fff;font-size:20px;padding:4px;line-height:1"><i class="fa-solid fa-moon"></i></button></div>';}
function esc(s){if(!s)return'';return s.toString().replace(/</g,'&lt;').replace(/>/g,'&gt;');}
window.onerror=function(msg,url,line,col,error){var app=document.getElementById('app');if(app)app.innerHTML='<div style="padding:40px;color:red"><h3>⚠️ 全局错误</h3><p>'+String(msg)+'</p><p>位置: line '+String(line)+'</p><button onclick="location.reload()">刷新</button></div>';return true;};
function mood(s){if(!s)return'-';return s<=3?'😢':s<=5?'😐':s<=7?'😊':'😄';}
function today(){return new Date().toISOString().slice(0,10);}
function toggleTheme(){var t=document.documentElement.getAttribute('data-theme');var n=t==='dark'?'':'dark';document.documentElement.setAttribute('data-theme',n);localStorage.setItem('theme',n);var ic=n==='dark'?'☀️':'🌙';var els=document.querySelectorAll('.theme-toggle');for(var i=0;i<els.length;i++)els[i].textContent=ic;var ni=document.getElementById('nti');if(ni)ni.textContent=ic;}
function initTheme(){var t=localStorage.getItem('theme');if(t){document.documentElement.setAttribute('data-theme',t);}else if(window.matchMedia('(prefers-color-scheme:dark)').matches){document.documentElement.setAttribute('data-theme','dark');}}
function showSkeleton(){document.getElementById('app').innerHTML='<div class="page" style="padding-top:20px"><div class="skeleton skeleton-block"></div><div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div></div>';}
function calcScore(d){var s=0;if(d.sleep_hours){if(d.sleep_hours>=7&&d.sleep_hours<=8)s+=30;else if(d.sleep_hours>=6)s+=20;else s+=10;}if(d.exercise_minutes){if(d.exercise_minutes>=30)s+=25;else if(d.exercise_minutes>=15)s+=15;else s+=10;}if(d.meal_count){if(d.meal_count===3)s+=15;else if(d.meal_count>=2)s+=10;else s+=5;}if(d.water_glasses){if(d.water_glasses>=8)s+=20;else if(d.water_glasses>=5)s+=15;else s+=8;}if(d.mood_score){if(d.mood_score>=7)s+=10;else if(d.mood_score>=4)s+=6;else s+=2;}var r=Math.min(100,s);return r;}
function drawChart(cn,data){if(!cn||!data||data.length<2)return;var W=cn.width;var H=cn.height;var ctx=cn.getContext('2d');var pl=32;var pr=12;var pt=10;var pb=20;var cw=W-pl-pr;var ch=H-pt-pb;var n=data.length;var colors=['#8B7355','#4A7C59','#C73E3A','#2C1810'];var labels=['心情','睡眠','运动','健康分'];var series=[[],[],[],[]];for(var i=0;i<n;i++){var d=data[i];series[0].push((d.mood_score||0)/10*100);series[1].push(Math.min(100,(d.sleep_hours||0)/9*100));series[2].push(Math.min(100,(d.exercise_minutes||0)/60*100));series[3].push(calcScore(d));}for(var g=0;g<=4;g++){var y=pt+ch*g/4;ctx.strokeStyle='#eee';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pl,y);ctx.lineTo(W-pr,y);ctx.stroke();ctx.fillStyle='#999';ctx.font='9px sans-serif';ctx.textAlign='right';ctx.fillText(Math.round(100*(1-g/4)),pl-4,y+3);}for(var i=0;i<n;i++){ctx.fillStyle='#999';ctx.font='9px sans-serif';ctx.textAlign='center';ctx.fillText((data[i].record_date||'').slice(5,10),pl+cw*i/(n-1),H-4);}for(var si=0;si<4;si++){var vs=series[si];ctx.strokeStyle=colors[si];ctx.lineWidth=1.5;ctx.beginPath();for(var i=0;i<vs.length;i++){var x=pl+cw*i/(n-1);var y=pt+ch*(1-vs[i]/100);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();for(var i=0;i<vs.length;i++){var x=pl+cw*i/(n-1);var y=pt+ch*(1-vs[i]/100);ctx.fillStyle=colors[si];ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fill();}}for(var si=0;si<4;si++){ctx.fillStyle=colors[si];ctx.fillRect(pl+si*60,4,8,8);ctx.fillStyle='#666';ctx.font='9px sans-serif';ctx.textAlign='left';ctx.fillText(labels[si],pl+si*60+10,11);}}
initTheme();
function updateTabBar() {
  var tabs = document.querySelectorAll('.tab-item');
  for (var i = 0; i < tabs.length; i++) { tabs[i].classList.remove('active'); }
  var page = state.page || 'home';
  var activeTab = document.querySelector('.tab-item[data-page="' + page + '"]');
  if (activeTab) activeTab.classList.add('active');
  if (page === 'shop-product' || page === 'shop-cart') {
    var shopTab = document.querySelector('.tab-item[data-page="shop"]');
    if (shopTab) shopTab.classList.add('active');
  }
}
window.addEventListener('load', updateTabBar);
function updateThemeIcon(){var ni=document.getElementById("nti");if(ni){var t=document.documentElement.getAttribute("data-theme");ni.innerHTML=t==="dark"?"☀️":"🌙";}}

// ==================== 认证模块 ====================
function renderLogin(){showSkeleton();var _=this;setTimeout(function(){var du=window.location.search.includes('demo');var h='<div class="auth-form"><h2><i class="fa-solid fa-leaf"></i> 食术养生</h2><div id="auth-error" class="auth-error"></div><div class="form-group"><input id="login-user" class="form-input" placeholder="用户名" value="'+(du?'demo':'')+'" /></div><div class="form-group"><input id="login-pass" class="form-input" type="password" placeholder="密码" value="'+(du?'123456':'')+'" /></div><button class="btn btn-primary btn-block btn-lg" onclick="handleLogin()">登录</button><div class="auth-links">还没有账号？<a href="#" onclick="renderRegister();return false">立即注册</a></div></div>';document.getElementById("app").innerHTML=h;document.getElementById("login-pass").addEventListener("keydown",function(e){if(e.key==="Enter")handleLogin();});if(du){setTimeout(function(){handleLogin();},500);}var skipBtn=document.createElement('button');skipBtn.className='btn btn-outline btn-block';skipBtn.style.marginTop='12px';skipBtn.textContent='跳过登录，先看看';skipBtn.onclick=function(){navigate('shop');};document.querySelector('.auth-form').appendChild(skipBtn);},50);}
function renderRegister(){showSkeleton();var _=this;setTimeout(function(){var h='<div class="auth-form"><h2><i class="fa-solid fa-user-plus"></i> 注册账号</h2><div id="auth-error" class="auth-error"></div><div class="form-group"><input id="reg-user" class="form-input" placeholder="用户名" /></div><div class="form-group"><input id="reg-pass" class="form-input" type="password" placeholder="密码" /></div><div class="form-group"><input id="reg-nick" class="form-input" placeholder="昵称（选填）" /></div><button class="btn btn-primary btn-block btn-lg" onclick="handleRegister()">注册</button><div class="auth-links">已有账号？<a href="#" onclick="renderLogin();return false">去登录</a></div></div>';document.getElementById('app').innerHTML=h;},50);}
async function handleLogin(){var el=document.getElementById('auth-error');try{var u=document.getElementById('login-user').value;var p=document.getElementById('login-pass').value;if(!u||!p){el.style.display='block';el.textContent='请填写用户名和密码';return;}el.style.display='none';var d=await api('/auth/login',{method:'POST',body:JSON.stringify({username:u,password:p})});state.token=d.access_token;state.user=d.user;localStorage.setItem('token',d.access_token);toast('欢迎回来！');navigate('home');}catch(e){el.style.display='block';el.textContent=e.message;}}
async function handleRegister(){var el=document.getElementById('auth-error');try{var u=document.getElementById('reg-user').value;var p=document.getElementById('reg-pass').value;var n=document.getElementById('reg-nick').value||u;if(!u||!p){el.style.display='block';el.textContent='请填写用户名和密码';return;}el.style.display='none';var d=await api('/auth/register',{method:'POST',body:JSON.stringify({username:u,password:p,nickname:n})});state.token=d.access_token;state.user=d.user;localStorage.setItem('token',d.access_token);toast('注册成功！');navigate('home');}catch(e){el.style.display='block';el.textContent=e.message;}}
function handleLogout(){state.token=null;state.user=null;localStorage.removeItem('token');navigate('login');}

// ==================== 首页 ====================
async function renderHome(){updateThemeIcon();var isGuest=!state.user;var nick=isGuest?'游客':esc(state.user.nickname||state.user.username);
var hd='<div class="header"><div style="display:flex;justify-content:space-between;align-items:center"><h1><i class="fa-solid fa-leaf"></i> 食术养生</h1><div style="display:flex;align-items:center;gap:8px"><button class="theme-toggle" onclick="toggleTheme()" style="background:none;border:none;color:#fff;font-size:20px;padding:4px"><i class="fa-solid fa-moon"></i></button>'+(isGuest?'<button class="btn btn-sm btn-outline" style="color:#fff;border-color:rgba(255,255,255,0.5)" onclick="navigate(\'login\')">登录</button>':'')+'</div></div><p>你好，'+nick+' 🌟</p></div>';
var body='<div class="page" style="padding-top:12px">'+
'<div class="health-score"><div class="big-num" id="score-num">--</div><div class="label">今日健康评分</div></div>'+
'<div class="card"><div class="flex-between"><div class="card-title"><i class="fa-solid fa-clipboard-list"></i> 今日健康</div><button class="btn btn-sm btn-outline" id="btn-td">记录</button></div><div id="td-content" class="mt-2" style="font-size:13px;color:var(--text2)">加载中...</div></div>'+
'<div class="card"><div class="card-title"><i class="fa-solid fa-chart-line"></i> 近7天趋势</div><canvas id="chart-canvas" style="width:100%;height:140px"></canvas></div>'+
'<div class="quick-grid">'+
'<div class="quick-card" onclick="navigate(\'ai-constitution\')"><div class="icon">🔍</div><div class="label">AI辨体</div></div>'+
'<div class="quick-card" onclick="navigate(\'diary-edit\')"><div class="icon">✍️</div><div class="label">健康日记</div></div>'+
'<div class="quick-card" onclick="navigate(\'daily-tasks\')"><div class="icon">✅</div><div class="label">每日打卡</div></div>'+
'<div class="quick-card" onclick="navigate(\'doctors\')"><div class="icon">👨⚕️</div><div class="label">医生上线</div></div>'+
'<div class="quick-card" onclick="navigate(\'nutritionists\')"><div class="icon">🍎</div><div class="label">营养师上门</div></div>'+
'<div class="quick-card" onclick="navigate(\'smart-shop\')"><div class="icon">🛒</div><div class="label">智能推荐</div></div>'+
'<div class="quick-card" onclick="navigate(\'diet-plan\')"><div class="icon">🥗</div><div class="label">食疗方案</div></div>'+
'<div class="quick-card" onclick="navigate(\'seasonal-calendar\')"><div class="icon">📅</div><div class="label">节气日历</div></div>'+
'<div class="quick-card" onclick="navigate(\'recipes\')"><div class="icon">🍲</div><div class="label">食疗药膳</div></div>'+
'<div class="quick-card" onclick="navigate(\'solar\')"><div class="icon">🌤️</div><div class="label">节气养生</div></div>'+
'</div>'+
'<div class="card" onclick="navigate(\'articles\')" style="cursor:pointer"><div class="flex-between"><div class="card-title"><i class="fa-solid fa-book-open"></i> 养生知识</div><span style="color:var(--green)">→</span></div><div class="card-subtitle">查看'+(state.user&&state.user.constitution_type?state.user.constitution_type:'体质相关')+'养生文章</div></div>'+
'<div class="card" onclick="navigate(\'my-consultations\')" style="cursor:pointer"><div class="flex-between"><div class="card-title">🏥 我的问诊</div><span style="color:var(--green)">→</span></div><div class="card-subtitle">查看问诊记录和咨询</div></div>'+
'<div class="card" onclick="navigate(\'my-nutritionist-bookings\')" style="cursor:pointer"><div class="flex-between"><div class="card-title">📅 我的预约</div><span style="color:var(--green)">→</span></div><div class="card-subtitle">查看营养师预约记录</div></div>'+
'</div>';
document.getElementById('app').innerHTML=hd+body;
try{var todayData=null,diaryData=null;if(!isGuest){try{var results=await Promise.all([api('/diary/today'),api('/diary')]);todayData=results[0]||{};diaryData=results[1]||[];}catch(e){}}var t=todayData||{};var list=diaryData||[];
if(t&&t.id){var sc=calcScore(t);document.getElementById('score-num').textContent=sc;
document.getElementById('td-content').innerHTML='睡眠 '+(t.sleep_hours||'-')+'h · 运动 '+(t.exercise_minutes||0)+'min · 心情 '+mood(t.mood_score)+'<br>饮食 '+(t.meal_count||0)+'餐 · 饮水 '+(t.water_glasses||0)+'杯';
document.getElementById('btn-td').textContent='编辑';document.getElementById('btn-td').onclick=function(){navigate('diary-edit',{diary:t});};
}else{document.getElementById('score-num').textContent='0';document.getElementById('td-content').textContent='今天还没有记录～';document.getElementById('btn-td').onclick=function(){navigate('diary-edit');};}
var recent=list.slice(0,7).reverse();if(recent.length>0){setTimeout(function(){var c=document.getElementById('chart-canvas');if(c){var dpr=window.devicePixelRatio||1;var pw=c.parentElement.clientWidth;c.width=pw*dpr;c.height=140*dpr;c.style.width=pw+'px';c.style.height='140px';var ctx=c.getContext('2d');ctx.scale(dpr,dpr);drawChart(c,recent);}},100);}
}catch(e){}
updateThemeIcon();}

// ==================== 健康日记 ====================
async function renderDiary(){var h=hd('<i class="fa-solid fa-pen-to-square"></i> 健康日记','home');var b='<div class="page"><button class="btn btn-primary btn-block mb-4" onclick="navigate(\'diary-edit\')"><i class="fa-solid fa-pencil"></i> 记录今天</button><div id="diary-list" class="loading"><div class="spinner"></div></div></div>';document.getElementById('app').innerHTML=h+b;
try{var list=await api('/diary');state._diaryList=list;var c=document.getElementById('diary-list');if(!list.length){c.innerHTML='<div style="padding:40px;text-align:center;color:var(--text2)">还没有记录～<br>开始记录你的健康吧！</div>';return;}var html='';for(var i=0;i<list.length;i++){var d=list[i];html+='<div class="card" style="cursor:pointer" data-diary-id=\''+d.id+'\' onclick="openDiary(\''+d.id+'\')"><div class="flex-between"><span class="diary-date">'+d.record_date+'</span><span style="font-size:12px;color:var(--text2)">'+(d.exercise_minutes||0)+'min · '+mood(d.mood_score)+'</span></div><div class="diary-summary">睡眠 '+(d.sleep_hours||'-')+'h · 饮食 '+(d.meal_count||0)+'餐 · 饮水 '+(d.water_glasses||0)+'杯</div></div>';}c.innerHTML=html;}catch(e){document.getElementById('diary-list').innerHTML='<div style="padding:40px;text-align:center;color:var(--red)">加载失败</div>';}}
function renderDiaryEdit(){var d=state.pageParams.diary;var e=!!d;var dv=d?d.record_date:today();var moodBtns='';var emojis='😢😢😢😐😐😊😊😄😄😄';for(var i=0;i<10;i++){var n=i+1;moodBtns+='<button type="button" data-mood="'+n+'" class="'+(d&&d.mood_score===n?'selected':'')+'" onclick="setMood('+n+')">'+emojis[i]+'</button>';}var h=hd(e?'编辑日记':'新增日记','diary');var body='<div class="page"><div class="card"><div class="form-group"><label>日期</label><input id="d-date" class="form-input" type="date" value="'+dv+'" /></div><div class="form-row"><div class="form-group"><label>睡眠 (小时)</label><input id="d-sleep" class="form-input" type="number" step="0.5" value="'+(d?d.sleep_hours||'':'')+'" placeholder="7" /></div><div class="form-group"><label>运动 (分钟)</label><input id="d-exercise" class="form-input" type="number" value="'+(d?d.exercise_minutes||'':'')+'" placeholder="30" /></div></div><div class="form-group"><label>运动类型</label><input id="d-extype" class="form-input" value="'+esc(d?d.exercise_type:'')+'" placeholder="散步/跑步/瑜伽" /></div><div class="form-row"><div class="form-group"><label>用餐 (餐)</label><input id="d-meals" class="form-input" type="number" value="'+(d?d.meal_count||'':'')+'" placeholder="3" /></div><div class="form-group"><label>饮水 (杯)</label><input id="d-water" class="form-input" type="number" value="'+(d?d.water_glasses||'':'')+'" placeholder="8" /></div></div><div class="form-group"><label>饮食备注</label><input id="d-diet" class="form-input" value="'+esc(d?d.diet_note:'')+'" placeholder="吃了什么？" /></div><div class="form-group"><label>心情</label><div class="mood-emojis" id="mood-picker">'+moodBtns+'</div></div><div class="form-group"><label>备注</label><textarea id="d-note" class="form-textarea">'+esc(d?d.note:'')+'</textarea></div><button class="btn btn-primary btn-block" onclick="saveDiary('+(e?d.id:'null')+')"><i class="fa-solid fa-floppy-disk"></i> 保存</button>'+(e?'<button class="btn btn-block mt-2" style="background:#FFEBEE;color:var(--red);border:none;padding:10px;border-radius:8px" onclick="deleteDiary('+d.id+')"><i class="fa-solid fa-trash-can"></i> 删除</button>':'')+'</div></div>';document.getElementById('app').innerHTML=h+body;window._mood=d?d.mood_score:null;}
window.setMood=function(n){window._mood=n;var btns=document.querySelectorAll('#mood-picker button');for(var i=0;i<btns.length;i++){btns[i].classList.toggle('selected',parseInt(btns[i].dataset.mood)===n);};}
window.openDiary=function(id){var diary=state._diaryList&&state._diaryList[function(){for(var i=0;i<state._diaryList.length;i++){if(state._diaryList[i].id==id)return i;}return -1;}()];if(diary)navigate('diary-edit',{diary:diary});else toast('记录未找到','error');};
async function saveDiary(id){var data={record_date:document.getElementById('d-date').value,sleep_hours:parseFloat(document.getElementById('d-sleep').value)||null,exercise_minutes:parseInt(document.getElementById('d-exercise').value)||null,exercise_type:document.getElementById('d-extype').value,meal_count:parseInt(document.getElementById('d-meals').value)||null,water_glasses:parseInt(document.getElementById('d-water').value)||null,diet_note:document.getElementById('d-diet').value,mood_score:window._mood||null,note:document.getElementById('d-note').value};try{if(id)await api('/diary/'+id,{method:'PUT',body:JSON.stringify(data)});else await api('/diary',{method:'POST',body:JSON.stringify(data)});toast(id?'已更新！':'已记录！');navigate('diary');}catch(e){toast(e.message,'error');}}
async function deleteDiary(id){if(!confirm('确定删除？'))return;try{await api('/diary/'+id,{method:'DELETE'});toast('已删除');navigate('diary');}catch(e){toast(e.message,'error');}}

// ==================== 体质测评 ====================
async function renderConstitution(){var h=hd('<i class="fa-solid fa-spa"></i> 体质测评');var body='<div class="page"><div class="card"><div class="card-title">中医九种体质</div><div class="card-subtitle">平和质·气虚质·阳虚质·阴虚质·痰湿质·湿热质·血瘀质·气郁质·特禀质</div><p style="font-size:13px;line-height:1.6">通过45道题目判断你的体质类型。</p><button class="btn btn-primary btn-block mt-4 btn-lg" onclick="navigate(\'constitution-assess\')">开始测评</button></div><div class="card-title">历史记录</div><div id="c-history"></div></div>';document.getElementById('app').innerHTML=h+body;
try{var records=await api('/constitution/records');var c=document.getElementById('c-history');if(!records.length){c.innerHTML='<div style="padding:20px;text-align:center;color:var(--text2)">暂无记录</div>';return;}var html='';for(var i=0;i<records.length;i++){var r=records[i];html+='<div class="card flex-between"><span style="font-weight:600">'+r.result_type+'</span><span style="font-size:12px;color:var(--text2)">'+(r.created_at?r.created_at.slice(0,10):'')+'</span></div>';}c.innerHTML=html;}catch(e){}}
async function renderConstitutionAssess(){document.getElementById('app').innerHTML='<div class="loading"><div class="spinner"></div><p>加载题目...</p></div>';try{var qs=await api('/constitution/questions');window._conAns={};var html='<div class="page"><div class="card"><div class="card-title">请根据近一年体验回答</div><div class="card-subtitle">没有(1)→很少(2)→有时(3)→经常(4)→总是(5)</div></div><div class="card">';for(var i=0;i<qs.length;i++){var q=qs[i];html+='<div class="question-item"><div class="q-text">'+(i+1)+'. '+q.question_text+'</div><div class="score-options">';var labels='没有,很少,有时,经常,总是'.split(',');for(var j=0;j<5;j++){var s=j+1;html+='<button type="button" onclick="selAns('+q.id+','+s+',this)">'+labels[j]+'</button>';}html+='</div></div>';}html+='</div><button class="btn btn-primary btn-block btn-lg" onclick="subAssess()">提交测评</button></div>';document.getElementById('app').innerHTML=hd('🧘 体质测评')+html;}catch(e){toast(e.message,'error');}}
window.selAns=function(qid,score,btn){window._conAns[qid]=score;var bs=btn.parentElement.querySelectorAll('button');for(var i=0;i<bs.length;i++)bs[i].classList.remove('selected');btn.classList.add('selected');};
async function subAssess(){var items=document.querySelectorAll('.question-item');if(Object.keys(window._conAns).length<items.length){toast('还有题未答','error');return;}try{var r=await api('/constitution/assess',{method:'POST',body:JSON.stringify({answers:window._conAns})});state.user.constitution_type=r.result_type;navigate('constitution-result',r);}catch(e){toast(e.message,'error');}}
function renderConstitutionResult(){var r=state.pageParams;var tips={'平和质':'恭喜！最健康。保持规律作息、均衡饮食、适量运动。','气虚质':'多吃补气食物：黄芪、山药、红枣。避免过度劳累。','阳虚质':'注意保暖，多吃温补食物：羊肉、生姜。多晒太阳。','阴虚质':'多吃滋阴食物：银耳、百合、梨。避免熬夜。','痰湿质':'健脾祛湿：薏米、赤小豆、冬瓜。加强运动。','湿热质':'清热利湿：绿豆、苦瓜、薏米。忌辛辣油腻。','血瘀质':'活血化瘀：山楂、黑木耳、玫瑰花茶。适量运动。','气郁质':'疏肝理气：玫瑰花茶、柑橘。多社交冥想。','特禀质':'增强免疫力，避免过敏原。规律作息。'};var scores=r.scores||{};var sorted=[];for(var k in scores)sorted.push([k,scores[k]]);sorted.sort(function(a,b){return b[1]-a[1];});var slist='';for(var i=0;i<sorted.length;i++){slist+='<div class="flex-between mt-2"><span>'+sorted[i][0]+'</span><span style="font-weight:600">'+sorted[i][1]+'</span></div>';}var h=hd('<i class="fa-solid fa-spa"></i> 测评结果');var b='<div class="page text-center"><div style="font-size:48px;margin:20px 0">🎉</div><div style="font-size:22px;font-weight:700;color:var(--green);margin-bottom:8px">'+r.result_type+'</div><div style="font-size:13px;color:var(--text2);margin-bottom:20px;line-height:1.6">'+(tips[r.result_type]||'')+'</div><div class="card"><div class="card-title">各项得分</div>'+slist+'</div><button class="btn btn-primary btn-block mt-4" onclick="navigate(\'home\')">回到首页</button></div>';document.getElementById('app').innerHTML=h+b;}

// ==================== 食疗药膳 ====================
var _cachedRecipes=null;
async function renderRecipes(cat){var h=hd('<i class="fa-solid fa-utensils"></i> 食疗药膳','home');var b='<div class="page"><div id="r-content" class="loading"><div class="spinner"></div></div></div>';document.getElementById('app').innerHTML=h+b;
try{if(!_cachedRecipes)_cachedRecipes=await api('/recipes');var cats=[];for(var i=0;i<_cachedRecipes.length;i++){if(cats.indexOf(_cachedRecipes[i].category)===-1)cats.push(_cachedRecipes[i].category);}var list=cat?_cachedRecipes.filter(function(r){return r.category===cat;}):_cachedRecipes;var html='<div class="category-filters"><button class="'+(cat?'':'active')+'" onclick="renderRecipes()">全部</button>';for(var i=0;i<cats.length;i++){var c2=cats[i];html+='<button class="'+(cat===c2?'active':'')+'" onclick="renderRecipes(\''+c2+'\')">'+c2+'</button>';}html+='</div>';for(var i=0;i<list.length;i++){var r=list[i];var cons=r.suitable_constitution||'';var tags='<span class="recipe-tag">'+r.category+'</span>';var ca=cons.split(',');for(var j=0;j<ca.length;j++){if(ca[j].trim())tags+='<span class="recipe-tag" style="background:#E3F2FD;color:#1565C0">'+ca[j].trim()+'</span>';}html+='<div class="recipe-card" style="cursor:pointer" onclick="navigate(\'recipe-detail\','+JSON.stringify({recipe:r}).replace(/"/g,'&quot;')+')"><img class="recipe-img" src="/api/recipes/'+r.id+'/image" alt="'+r.name+'" onerror="this.style.background=\'linear-gradient(135deg,#8B7355,#4A7C59)\';this.alt=\'🍲\'"><div class="recipe-name">'+r.name+'</div><div class="recipe-meta">'+tags+'</div><div style="font-size:13px;color:var(--text2)">'+esc(r.benefits)+'</div></div>';}document.getElementById('r-content').innerHTML=html;}catch(e){document.getElementById('r-content').innerHTML='<div style="padding:40px;text-align:center;color:var(--red)">加载失败</div>';}}
function renderRecipeDetail(){var r=state.pageParams.recipe;var tags='<span class="pill pill-green">'+r.category+'</span>';var cons=(r.suitable_constitution||'').split(',');for(var i=0;i<cons.length;i++){if(cons[i].trim())tags+='<span class="pill pill-orange">'+cons[i].trim()+'</span>';}var seas=(r.suitable_season||'').split(',');for(var i=0;i<seas.length;i++){if(seas[i].trim())tags+='<span class="pill pill-blue">'+seas[i].trim()+'</span>';}var h=hd(r.name,'recipes');var b='<div class="page"><div class="card"><div class="recipe-meta">'+tags+'</div><div class="recipe-detail"><h4><i class="fa-solid fa-bowl-food"></i> 食材</h4><p style="font-size:13px;line-height:1.6">'+esc(r.ingredients||'').replace(/\n/g,'<br>')+'</p><h4><i class="fa-solid fa-list-ol"></i> 做法</h4><p style="font-size:13px;line-height:1.6;white-space:pre-line">'+esc(r.steps||'')+'</p><h4><i class="fa-solid fa-heart-pulse"></i> 功效</h4><p style="font-size:13px;color:var(--green-dark)">'+esc(r.benefits||'')+'</p></div></div></div>';document.getElementById('app').innerHTML=h+b;}

// ==================== 节气养生 ====================
async function renderSolar(){var h=hd('<i class="fa-solid fa-sun"></i> 节气养生','home');var b='<div class="page" id="solar-content"><div class="loading"><div class="spinner"></div></div></div>';document.getElementById('app').innerHTML=h+b;
try{var results=await Promise.all([api('/solar-terms/current'),api('/solar-terms')]);var cur=results[0];var all=results[1];window._ST=all;var others=[];for(var i=0;i<all.length;i++){if(all[i].name!==cur.name)others.push(all[i]);}var html='<div class="term-banner"><div class="term-name">'+cur.name+'</div><div class="term-desc">'+cur.date_mmdd+' · '+cur.description+'</div></div><div class="card"><div class="card-title"><i class="fa-solid fa-mug-saucer"></i> 养生建议</div><p style="font-size:13px;line-height:1.6">'+esc(cur.wellness_tips||'')+'</p></div><div class="card"><div class="card-title"><i class="fa-solid fa-leaf"></i> 推荐食材</div><p style="font-size:13px;line-height:1.6">'+esc(cur.food_recommendations||'')+'</p></div><div class="card"><div class="card-title"><i class="fa-solid fa-person-running"></i> 运动建议</div><p style="font-size:13px;line-height:1.6">'+esc(cur.exercise_advice||'')+'</p></div><div class="card-title mt-4">二十四节气</div>';for(var i=0;i<others.length;i++){var t=others[i];html+='<div class="card flex-between" style="cursor:pointer" onclick="showTerm(\''+t.name+'\')"><span style="font-weight:500">'+t.name+'</span><span style="font-size:12px;color:var(--text2)">'+t.date_mmdd+'</span></div>';}document.getElementById('solar-content').innerHTML=html;}catch(e){document.getElementById('solar-content').innerHTML='<div style="padding:40px;text-align:center;color:var(--red)">加载失败</div>';}}
function showTerm(n){var all=window._ST;var t=null;for(var i=0;i<all.length;i++){if(all[i].name===n){t=all[i];break;}}if(!t)return;var h=hd(t.name,'solar');var b='<div class="page"><div class="term-banner"><div class="term-name">'+t.name+'</div><div class="term-desc">'+t.date_mmdd+'</div></div><div class="card"><div class="card-title"><i class="fa-solid fa-circle-info"></i> 节气介绍</div><p style="font-size:13px;line-height:1.6">'+esc(t.description||'')+'</p></div><div class="card"><div class="card-title">🍵 养生建议</div><p style="font-size:13px;line-height:1.6">'+esc(t.wellness_tips||'')+'</p></div><div class="card"><div class="card-title">🥬 推荐食材</div><p style="font-size:13px;line-height:1.6">'+esc(t.food_recommendations||'')+'</p></div><div class="card"><div class="card-title">🧘 运动建议</div><p style="font-size:13px;line-height:1.6">'+esc(t.exercise_advice||'')+'</p></div></div>';document.getElementById('app').innerHTML=h+b;}

// ==================== 养生文章 ====================
async function renderArticles(cat){var h=hd('📖 养生知识','home');document.getElementById('app').innerHTML=h+'<div class="page" id="a-content"><div class="loading"><div class="spinner"></div></div></div>';
try{var url=cat?'/articles?category='+encodeURIComponent(cat):'/articles';var data=await api(url);var list=data.items||[];var cats=['中医养生','运动养生','节气养生'];var html='<div class="category-filters"><button class="'+(cat?'':'active')+'" onclick="renderArticles()">全部</button>';for(var i=0;i<cats.length;i++){var c2=cats[i];html+='<button class="'+(cat===c2?'active':'')+'" onclick="renderArticles(\''+c2+'\')">'+c2+'</button>';}html+='</div>';if(list.length){for(var i=0;i<list.length;i++){var a=list[i];html+='<div class="article-card" onclick="navigate(\'article-detail\',{id:'+a.id+'})"><div class="article-title">'+esc(a.title)+'</div><div class="article-summary">'+esc(a.summary||'')+'</div><div class="article-meta">'+esc(a.category||'')+' · '+esc(a.author||'')+' · 👁 '+(a.view_count||0)+'</div></div>';}}else{html+='<div style="padding:40px;text-align:center;color:var(--text2)">暂无文章</div>';}document.getElementById('a-content').innerHTML=html;}catch(e){document.getElementById('a-content').innerHTML='<div style="padding:40px;text-align:center;color:var(--red)">加载失败</div>';}}
async function renderArticleDetail(){document.getElementById('app').innerHTML='<div class="loading"><div class="spinner"></div><p>加载中...</p></div>';try{var a=await api('/articles/'+state.pageParams.id);var tags=(a.tags||'').split(',');var thtml='<span class="pill pill-green">'+esc(a.category||'')+'</span>';for(var i=0;i<tags.length;i++){if(tags[i].trim())thtml+='<span class="pill pill-blue">'+tags[i].trim()+'</span>';}var h=hd(a.title,'articles');var b='<div class="page"><div class="card"><div style="font-size:12px;color:var(--text2);margin-bottom:8px">'+thtml+'</div><p style="font-size:13px;line-height:1.8;white-space:pre-line">'+esc(a.content||'')+'</p><div class="article-meta mt-4">作者：'+esc(a.author||'')+' · '+(a.created_at||'').slice(0,10)+' · 👁 '+a.view_count+'</div></div></div>';document.getElementById('app').innerHTML=h+b;}catch(e){toast(e.message,'error');navigate('articles');}}

// ==================== 个人中心 ====================
function renderProfile(){var u=state.user;var h='<div class="header"><h1><i class="fa-solid fa-user"></i> 个人中心</h1></div>';var avatar=u.nickname?esc(u.nickname[0]):'👤';var ct=u.constitution_type?'<div class="profile-constitution">'+u.constitution_type+'</div>':'<div style="margin-top:4px;font-size:12px;color:var(--text2)">尚未测评体质</div>';var genders={'male':'男','female':'女'};var gtxt=genders[u.gender]||'-';var b='<div class="page"><div class="profile-header"><div class="profile-avatar">'+avatar+'</div><div class="profile-name">'+esc(u.nickname||u.username)+'</div>'+ct+'</div><div class="card"><div class="card-title">基本信息</div><div class="flex-between mt-2"><span style="color:var(--text2)">用户名</span><span>'+esc(u.username)+'</span></div><div class="flex-between mt-2"><span style="color:var(--text2)">昵称</span><span>'+esc(u.nickname||'-')+'</span></div><div class="flex-between mt-2"><span style="color:var(--text2)">性别</span><span>'+gtxt+'</span></div><div class="flex-between mt-2"><span style="color:var(--text2)">出生年份</span><span>'+(u.birth_year||'-')+'</span></div><div class="flex-between mt-2"><span style="color:var(--text2)">身高</span><span>'+(u.height_cm||'-')+' cm</span></div><div class="flex-between mt-2"><span style="color:var(--text2)">体重</span><span>'+(u.weight_kg||'-')+' kg</span></div><button class="btn btn-outline btn-block mt-4" onclick="navigate(\'profile-edit\')">编辑资料</button></div><div class="card" onclick="navigate(\'constitution\')" style="cursor:pointer"><div class="flex-between"><div class="card-title">🧘 体质测评</div><span style="color:var(--green)">→</span></div><div class="card-subtitle">'+(u.constitution_type?'当前：'+u.constitution_type:'尚未测评，点击开始')+'</div></div><div class="card" onclick="navigate(\'articles\')" style="cursor:pointer"><div class="flex-between"><div class="card-title">📖 养生知识</div><span style="color:var(--green)">→</span></div><div class="card-subtitle">查看文章和养生建议</div></div><div class="card" onclick="navigate(\'provider-apply\')" style="cursor:pointer;border:1px dashed var(--green)"><div class="flex-between"><div class="card-title">🏥 服务商入驻</div><span style="color:var(--green)">→</span></div><div class="card-subtitle">营养师/中医师申请入驻平台</div></div><div class="card" onclick="navigate(\'health-archive\')" style="cursor:pointer"><div class="flex-between"><div class="card-title">📋 健康档案</div><span style="color:var(--green)">→</span></div><div class="card-subtitle">体质历程 · 问诊记录 · 健康趋势</div></div><button class="btn btn-block mt-4" style="background:#FFEBEE;color:var(--red);border:none;padding:12px;border-radius:8px;font-size:14px" onclick="handleLogout()">退出登录</button></div>';document.getElementById('app').innerHTML=h+b;}
function renderProfileEdit(){var u=state.user;var h=hd('编辑资料','profile');var genderOpts=['','不显示','male','男','female','女'];var b='<div class="page"><div class="card"><div class="form-group"><label>昵称</label><input id="p-nick" class="form-input" value="'+esc(u.nickname||'')+'" /></div><div class="form-group"><label>性别</label><select id="p-gender" class="form-select"><option value="">不显示</option><option value="male"'+(u.gender==='male'?' selected':'')+'>男</option><option value="female"'+(u.gender==='female'?' selected':'')+'>女</option></select></div><div class="form-row"><div class="form-group"><label>出生年份</label><input id="p-year" class="form-input" type="number" value="'+(u.birth_year||'')+'" placeholder="1990" /></div><div class="form-group"><label>身高 (cm)</label><input id="p-height" class="form-input" type="number" value="'+(u.height_cm||'')+'" placeholder="170" /></div></div><div class="form-group"><label>体重 (kg)</label><input id="p-weight" class="form-input" type="number" value="'+(u.weight_kg||'')+'" placeholder="65" /></div><button class="btn btn-primary btn-block" onclick="saveProfile()">💾 保存</button></div></div>';document.getElementById('app').innerHTML=h+b;}
async function saveProfile(){try{var data={nickname:document.getElementById('p-nick').value,gender:document.getElementById('p-gender').value,birth_year:parseInt(document.getElementById('p-year').value)||null,height_cm:parseInt(document.getElementById('p-height').value)||null,weight_kg:parseInt(document.getElementById('p-weight').value)||null};var u=await api('/auth/me',{method:'PUT',body:JSON.stringify(data)});state.user=u;toast('已保存！');navigate('profile');}catch(e){toast(e.message,'error');}}

// ==================== 在线中医问诊 ====================
async function renderTCM(){updateThemeIcon();
  var h='<div class="header"><h1><i class="fa-solid fa-hospital"></i> 在线中医问诊</h1><p>三甲中医院医生在线，图文/视频问诊</p></div>';
  var b='<div class="page"><div class="loading"><div class="spinner"></div><p>加载医生列表...</p></div></div>';
  document.getElementById('app').innerHTML=h+b;
  try{
    var doctors=await api('/tcm/doctors');
    var html='<div style="padding:8px 16px 4px"><p style="font-size:13px;color:var(--text2);margin:0">选择医生开始问诊</p></div>'+
      '<div style="padding:0 16px">';
    for(var di=0;di<doctors.length;di++){
      var d=doctors[di];
      var stars='';for(var si=0;si<5;si++){stars+=si<Math.round(d.rating)?'★':'☆';}
      html+='<div class="card tcm-doctor" data-id="'+d.id+'" onclick="startConsult('+d.id+',\''+d.name.replace(/'/g,'')+'\',\''+d.title.replace(/'/g,'')+'\','+d.price_online+')" style="cursor:pointer;margin-bottom:10px">'+
        '<div style="display:flex;gap:12px;align-items:start">'+
        '<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,var(--green),#2d8a4e);display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;font-weight:bold;flex-shrink:0">'+d.name[0]+'</div>'+
        '<div style="flex:1"><div style="font-weight:600;font-size:15px">'+esc(d.name)+' <span style="font-size:12px;color:var(--green)">'+esc(d.title)+'</span></div>'+
        '<div style="font-size:12px;color:var(--text2);margin:2px 0">'+esc(d.hospital)+'</div>'+
        '<div style="font-size:12px;color:var(--text2)">擅长: '+esc(d.specialty)+'</div>'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">'+
        '<span style="color:#f5a623;font-size:12px">'+stars+' <span style="color:var(--text2)">'+d.rating+'分 · '+d.consultation_count+'次咨询</span></span>'+
        '<span style="font-size:14px;font-weight:600;color:var(--green)">¥'+d.price_online+'起</span></div></div></div></div>';
    }
    html+='</div>';
    var pageDiv=document.querySelector('.page');
    if(pageDiv)pageDiv.innerHTML=html;
  }catch(e){toast(e.message,'error');}
}

// 开始问诊
window.startConsult=async function(docId,docName,docTitle,docPrice){
  if(!state.user){toast('请先登录','error');setTimeout(function(){navigate('login');},1500);return;}
  var popup=document.getElementById('popup')||(function(){var e=document.createElement('div');e.id='popup';e.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center';document.body.appendChild(e);return e;})();
  popup.innerHTML='<div style="background:var(--card);padding:24px;border-radius:16px;width:90%;max-width:340px;box-shadow:0 8px 32px rgba(0,0,0,0.2)">'+
    '<h3 style="margin:0 0 16px">问诊挂号</h3>'+
    '<div style="font-size:13px;color:var(--text2);margin-bottom:12px">医生：'+esc(docName)+' '+esc(docTitle)+'<br>费用：¥'+(docPrice||'99')+'（图文咨询）</div>'+
    '<textarea id="symptom-input" rows="4" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:14px;box-sizing:border-box;background:var(--bg);color:var(--text);resize:none" placeholder="请描述你的主要症状或想咨询的问题..."></textarea>'+
    '<div style="display:flex;gap:8px;margin-top:16px">'+
    '<button onclick="document.getElementById(\'popup\').remove()" class="btn btn-sm btn-outline" style="flex:1">取消</button>'+
    '<button onclick="submitConsult('+docId+')" class="btn btn-sm" style="flex:1;background:var(--green);color:#fff;border:none;padding:10px;border-radius:8px">提交挂号</button>'+
    '</div></div>';
  popup.style.display='flex';
};

// 提交问诊
window.submitConsult=async function(docId){
  var symptom=document.getElementById('symptom-input').value.trim();
  if(!symptom){toast('请描述你的症状','error');return;}
  var popup=document.getElementById('popup');
  if(popup)popup.remove();
  try{
    var res=await api('/tcm/consultations',{method:'POST',body:JSON.stringify({doctor_id:docId,symptoms:symptom,type:'text'})});
    if(res&&res.id){
      toast('挂号成功！等待医生接诊');
      navigate('consulting',{id:res.id,doctor_id:docId});
    }else{toast('挂号失败，请重试','error');}
  }catch(e){toast(e.message,'error');}
};

// 问诊聊天页面
async function renderConsulting(){updateThemeIcon();
  var id=state.pageParams.id;
  var docId=state.pageParams.doctor_id;
  if(!id){renderTCM();return;}
  var h='<div class="header"><h1><i class="fa-solid fa-comment-medical"></i> 问诊中</h1><p>与医生在线交流</p></div>';
  var b='<div class="page" style="display:flex;flex-direction:column;height:calc(100vh - 140px)">'+
    '<div id="msg-area" style="flex:1;overflow-y:auto;padding:12px 16px"></div>'+
    '<div style="display:flex;gap:8px;padding:10px 16px;border-top:1px solid var(--border);background:var(--card)">'+
    '<input id="msg-input" style="flex:1;padding:10px 14px;border:1px solid var(--border);border-radius:20px;font-size:14px;background:var(--bg);color:var(--text)" placeholder="输入消息..." onkeydown="if(event.key==\'Enter\')sendMsg()">'+
    '<button onclick="sendMsg()" class="btn btn-sm" style="background:var(--green);color:#fff;border:none;border-radius:50%;width:40px;height:40px;flex-shrink:0"><i class="fa-solid fa-paper-plane"></i></button>'+
    '</div></div>';
  document.getElementById('app').innerHTML=h+b;
  window._consultId=id;
  pollMessages();
}

// 发送消息
window.sendMsg=async function(){
  var input=document.getElementById('msg-input');
  var text=input.value.trim();
  if(!text)return;
  input.value='';
  try{
    await api('/tcm/messages',{method:'POST',body:JSON.stringify({consultation_id:window._consultId,content:text})});
    var area=document.getElementById('msg-area');
    area.innerHTML+='<div style="text-align:right;margin:6px 0"><span style="background:var(--green);color:#fff;padding:8px 14px;border-radius:12px 12px 4px 12px;display:inline-block;max-width:75%;font-size:14px;line-height:1.5">'+esc(text)+'</span></div>';
    area.scrollTop=area.scrollHeight;
  }catch(e){toast(e.message,'error');}
};

// 轮询消息
async function pollMessages(){
  if(!window._consultId)return;
  try{
    var msgs=await api('/tcm/messages/'+window._consultId);
    var area=document.getElementById('msg-area');
    if(area&&msgs&&msgs.length){
      var html='';
      var gotPrescription=false;
      for(var mi=0;mi<msgs.length;mi++){
        var m=msgs[mi];
        if(m.msg_type==='system'){
          html+='<div style="text-align:center;margin:8px 0;font-size:12px;color:var(--text2)">'+esc(m.content)+'</div>';
          if(m.content&&m.content.indexOf('处方')>=0)gotPrescription=true;
        }else if(m.sender_type==='user'){
          html+='<div style="text-align:right;margin:6px 0"><span style="background:var(--green);color:#fff;padding:8px 14px;border-radius:12px 12px 4px 12px;display:inline-block;max-width:75%;font-size:14px;line-height:1.5">'+esc(m.content)+'</span></div>';
        }else if(m.sender_type==='doctor'){
          html+='<div style="text-align:left;margin:6px 0"><span style="background:var(--card);padding:8px 14px;border-radius:12px 12px 12px 4px;display:inline-block;max-width:75%;font-size:14px;line-height:1.5;border:1px solid var(--border)">'+esc(m.content)+'</span></div>';
        }
      }
      if(area.innerHTML!==html){area.innerHTML=html;area.scrollTop=area.scrollHeight;}
      if(gotPrescription){
        if(!document.getElementById('prescription-btn')){
          area.innerHTML+='<div style="text-align:center;margin:12px 0"><button id="prescription-btn" onclick="showPrescription('+window._consultId+')" class="btn btn-sm" style="background:var(--green);color:#fff;border:none;padding:8px 20px;border-radius:8px">📋 查看处方</button></div>';
        }
      }
    }
  }catch(e){}
  setTimeout(pollMessages,3000);
}

// 查看处方
window.showPrescription=async function(cid){
  try{
    var pres=await api('/tcm/prescriptions/'+cid);
    if(!pres||!pres.id){toast('暂无处方','error');return;}
    var herbs=[];
    try{herbs=JSON.parse(pres.prescription_text);}catch(e){herbs=pres.prescription_text||[];}
    var herbHtml='';
    if(Array.isArray(herbs)){
      herbHtml='<table style="width:100%;border-collapse:collapse;margin:10px 0">';
      herbHtml+='<tr style="background:var(--green);color:#fff"><th style="padding:6px 8px;text-align:left">药材</th><th style="padding:6px 8px;text-align:left">用量</th><th style="padding:6px 8px;text-align:left">说明</th></tr>';
      for(var h=0;h<herbs.length;h++){
        var herb=herbs[h];
        herbHtml+='<tr style="border-bottom:1px solid var(--border)"><td style="padding:6px 8px;font-weight:500">'+esc(herb.name||'')+'</td><td style="padding:6px 8px">'+esc(herb.dosage||'')+'</td><td style="padding:6px 8px;font-size:13px;color:var(--text2)">'+esc(herb.note||'')+'</td></tr>';
      }
      herbHtml+='</table>';
    }
    var popup=document.getElementById('popup')||(function(){var e=document.createElement('div');e.id='popup';e.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center';document.body.appendChild(e);return e;})();
    popup.innerHTML='<div style="background:var(--card);padding:24px;border-radius:16px;width:92%;max-width:380px;max-height:85vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.2)">'+
      '<h3 style="margin:0 0 8px;color:var(--green)">📋 中医处方</h3>'+
      '<div style="font-size:14px;margin-bottom:12px"><strong>诊断：</strong>'+esc(pres.diagnosis||'')+'</div>'+
      '<div style="font-size:14px;font-weight:500;margin-bottom:4px">处方药材：</div>'+
      herbHtml+
      '<div style="font-size:13px;color:var(--text2);margin-top:8px"><strong>煎服：</strong>'+esc(pres.decoction_method||'')+'</div>'+
      '<div style="font-size:13px;color:var(--text2);margin-top:4px"><strong>用法：</strong>'+esc(pres.dosage||'')+'</div>'+
      '<div style="font-size:13px;color:var(--text2);margin-top:4px"><strong>注意：</strong>'+esc(pres.precautions||'')+'</div>'+
      '<div style="font-size:13px;color:var(--text2);margin-top:4px"><strong>建议：</strong>服用'+pres.days+'天</div>'+
      '<button onclick="document.getElementById(\'popup\').remove()" class="btn btn-sm" style="width:100%;margin-top:16px;background:var(--green);color:#fff;border:none;padding:10px;border-radius:8px">关闭</button></div>';
    popup.style.display='flex';
  }catch(e){toast(e.message,'error');}
};
