const API=window.location.origin+'/api';
let state={user:null,token:localStorage.getItem('token'),page:'home',pageParams:{}};
function toast(m,t){if(!t)t='success';var e=document.getElementById('toast');if(!e){e=document.createElement('div');e.id='toast';e.className='toast';document.body.appendChild(e);}e.textContent=m;e.className='toast toast-'+t+' show';clearTimeout(e._timer);e._timer=setTimeout(function(){e.classList.remove('show');},2500);}
async function api(p,o){if(!o)o={};if(p.startsWith('/api/'))p=p.substring(4);var h={'Content-Type':'application/json'};if(state.token)h['Authorization']='Bearer '+state.token;try{var r=await fetch(API+p,{...o,headers:h});if(r.status===401&&!p.startsWith('/auth/')&&!o.noRedirect){state.token=null;localStorage.removeItem('token');state.user=null;navigate('login');throw Error('Unauthorized');}var d=await r.json();if(!r.ok)throw Error(d.detail||'Error');return d;}catch(e){if(o.silent)return null;throw e;}}
function navigate(p,params){if(!params)params={};state.page=p;state.pageParams=params;window.scrollTo(0,0);if(typeof updateTabBar==='function')updateTabBar();render();}
function render(){console.log('[render] called, page=', state.page, 'user=', !!state.user, 'token=', !!state.token);var guestPages=['shop','shop-product','shop-cart','recipes','recipe-detail','solar','articles','article-detail','tea'];var needAuth=state.page&&!guestPages.includes(state.page);if(!state.user&&state.token){api('/auth/me').then(function(u){state.user=u;render();}).catch(function(){state.token=null;localStorage.removeItem('token');if(needAuth){renderLogin();}else{render();}});document.getElementById('app').innerHTML='<div class="loading"><div class="spinner"></div><p>加载中...</p></div>';return;}if(!state.user&&needAuth){renderLogin();return;}var ps={home:renderHome,diary:renderDiary,tea:renderTea,shop:renderShop,'shop-product':renderShopProduct,'shop-cart':renderShopCart,'diary-edit':renderDiaryEdit,constitution:renderConstitution,'constitution-assess':renderConstitutionAssess,'constitution-result':renderConstitutionResult,recipes:renderRecipes,'recipe-detail':renderRecipeDetail,solar:renderSolar,articles:renderArticles,'article-detail':renderArticleDetail,profile:renderProfile,'profile-edit':renderProfileEdit,tcm:renderTCM,consulting:renderConsulting,doctors:renderDoctors,'doctor-detail':renderDoctorDetail,consultation:renderConsultation,'my-consultations':renderMyConsultations,nutritionists:renderNutritionists,'nutritionist-detail':renderNutritionistDetail,'nutritionist-booking':renderNutritionistBooking,'my-nutritionist-bookings':renderMyNutritionistBookings,'provider-apply':renderProviderApply,'provider-application':renderProviderApplication,'provider-my-applications':renderProviderMyApplications,'ai-constitution':renderAIConstitution,'smart-shop':renderSmartShop,'diet-plan':renderDietPlan,'seasonal-calendar':renderSeasonalCalendar,'daily-tasks':renderDailyTasks,'health-archive':renderHealthArchive,'admin-dashboard':renderAdminDashboard,'admin-providers':renderAdminProviders,'admin-provider-detail':renderAdminProviderDetail,'admin-users':renderAdminUsers,'admin-products':renderAdminProducts,'admin-articles':renderAdminArticles,'about':renderAbout,'contact':renderContact};var fn=ps[state.page];if(fn)fn();else renderHome();}
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
function drawChart(cn,data){if(!cn||!data||data.length<2)return;var W=cn.width;var H=cn.height;var ctx=cn.getContext('2d');var pl=32;var pr=12;var pt=10;var pb=20;var cw=W-pl-pr;var ch=H-pt-pb;var n=data.length;var colors=['#FF9800','#2196F3','#4CAF50','#9C27B0'];var labels=['心情','睡眠','运动','健康分'];var series=[[],[],[],[]];for(var i=0;i<n;i++){var d=data[i];series[0].push((d.mood_score||0)/10*100);series[1].push(Math.min(100,(d.sleep_hours||0)/9*100));series[2].push(Math.min(100,(d.exercise_minutes||0)/60*100));series[3].push(calcScore(d));}for(var g=0;g<=4;g++){var y=pt+ch*g/4;ctx.strokeStyle='#eee';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pl,y);ctx.lineTo(W-pr,y);ctx.stroke();ctx.fillStyle='#999';ctx.font='9px sans-serif';ctx.textAlign='right';ctx.fillText(Math.round(100*(1-g/4)),pl-4,y+3);}for(var i=0;i<n;i++){ctx.fillStyle='#999';ctx.font='9px sans-serif';ctx.textAlign='center';ctx.fillText((data[i].record_date||'').slice(5,10),pl+cw*i/(n-1),H-4);}for(var si=0;si<4;si++){var vs=series[si];ctx.strokeStyle=colors[si];ctx.lineWidth=1.5;ctx.beginPath();for(var i=0;i<vs.length;i++){var x=pl+cw*i/(n-1);var y=pt+ch*(1-vs[i]/100);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();for(var i=0;i<vs.length;i++){var x=pl+cw*i/(n-1);var y=pt+ch*(1-vs[i]/100);ctx.fillStyle=colors[si];ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fill();}}for(var si=0;si<4;si++){ctx.fillStyle=colors[si];ctx.fillRect(pl+si*60,4,8,8);ctx.fillStyle='#666';ctx.font='9px sans-serif';ctx.textAlign='left';ctx.fillText(labels[si],pl+si*60+10,11);}}
initTheme();
function updateTabBar() {
  var tabs = document.querySelectorAll('.tab-item');
  for (var i = 0; i < tabs.length; i++) { tabs[i].classList.remove('active'); }
  var page = state.page || 'home';
  var activeTab = document.querySelector('.tab-item[data-page=\"' + page + '\"]');
  if (activeTab) activeTab.classList.add('active');
  if (page === 'shop-product' || page === 'shop-cart') {
    var shopTab = document.querySelector('.tab-item[data-page=\"shop\"]');
    if (shopTab) shopTab.classList.add('active');
  }
}
window.addEventListener('load', updateTabBar);
function updateThemeIcon(){var ni=document.getElementById("nti");if(ni){var t=document.documentElement.getAttribute("data-theme");ni.innerHTML=t==="dark"?"\u2600\ufe0f":"\ud83c\udf19";}}

function renderLogin(){showSkeleton();var _=this;setTimeout(function(){var du=window.location.search.includes('demo');var h='<div class="auth-form"><h2><i class="fa-solid fa-leaf"></i> 体质养生</h2><div id="auth-error" class="auth-error"></div><div class="form-group"><input id="login-user" class="form-input" placeholder="用户名" value="'+(du?'demo':'')+'" /></div><div class="form-group"><input id="login-pass" class="form-input" type="password" placeholder="密码" value="'+(du?'123456':'')+'" /></div><button class="btn btn-primary btn-block btn-lg" onclick="handleLogin()">登录</button><div class="auth-links">还没有账号？<a href="#" onclick="renderRegister();return false">立即注册</a></div></div>';document.getElementById("app").innerHTML=h;document.getElementById("login-pass").addEventListener("keydown",function(e){if(e.key==="Enter")handleLogin();});if(du){setTimeout(function(){handleLogin();},500);}var skipBtn=document.createElement('button');skipBtn.className='btn btn-outline btn-block';skipBtn.style.marginTop='12px';skipBtn.textContent='跳过登录，先看看';skipBtn.onclick=function(){navigate('shop');};document.querySelector('.auth-form').appendChild(skipBtn);},50);}
function renderRegister(){showSkeleton();var _=this;setTimeout(function(){var h='<div class="auth-form"><h2><i class="fa-solid fa-user-plus"></i> 注册账号</h2><div id="auth-error" class="auth-error"></div><div class="form-group"><input id="reg-user" class="form-input" placeholder="用户名" /></div><div class="form-group"><input id="reg-pass" class="form-input" type="password" placeholder="密码" /></div><div class="form-group"><input id="reg-nick" class="form-input" placeholder="昵称（选填）" /></div><button class="btn btn-primary btn-block btn-lg" onclick="handleRegister()">注册</button><div class="auth-links">已有账号？<a href="#" onclick="renderLogin();return false">去登录</a></div></div>';document.getElementById('app').innerHTML=h;},50);}
async function handleLogin(){var el=document.getElementById('auth-error');try{var u=document.getElementById('login-user').value;var p=document.getElementById('login-pass').value;if(!u||!p){el.style.display='block';el.textContent='请填写用户名和密码';return;}el.style.display='none';var d=await api('/auth/login',{method:'POST',body:JSON.stringify({username:u,password:p})});state.token=d.access_token;state.user=d.user;localStorage.setItem('token',d.access_token);toast('欢迎回来！');navigate('home');}catch(e){el.style.display='block';el.textContent=e.message;}}
async function handleRegister(){var el=document.getElementById('auth-error');try{var u=document.getElementById('reg-user').value;var p=document.getElementById('reg-pass').value;var n=document.getElementById('reg-nick').value||u;if(!u||!p){el.style.display='block';el.textContent='请填写用户名和密码';return;}el.style.display='none';var d=await api('/auth/register',{method:'POST',body:JSON.stringify({username:u,password:p,nickname:n})});state.token=d.access_token;state.user=d.user;localStorage.setItem('token',d.access_token);toast('注册成功！');navigate('home');}catch(e){el.style.display='block';el.textContent=e.message;}}
function handleLogout(){state.token=null;state.user=null;localStorage.removeItem('token');navigate('login');}

async function renderHome(){updateThemeIcon();var isGuest=!state.user;var nick=isGuest?'游客':esc(state.user.nickname||state.user.username);
var hd='<div class="header"><div style="display:flex;justify-content:space-between;align-items:center"><h1><i class="fa-solid fa-leaf"></i> 体质养生</h1><div style="display:flex;align-items:center;gap:8px"><button class="theme-toggle" onclick="toggleTheme()" style="background:none;border:none;color:#fff;font-size:20px;padding:4px"><i class="fa-solid fa-moon"></i></button>'+(isGuest?'<button class="btn btn-sm btn-outline" style="color:#fff;border-color:rgba(255,255,255,0.5)" onclick="navigate(\'login\')">登录</button>':'')+'</div></div><p>你好，'+nick+' 🌟</p></div>';
var body='<div class="page" style="padding-top:12px">'+
'<div class="health-score"><div class="big-num" id="score-num">--</div><div class="label">今日健康评分</div></div>'+
'<div class="card"><div class="flex-between"><div class="card-title"><i class="fa-solid fa-clipboard-list"></i> 今日健康</div><button class="btn btn-sm btn-outline" id="btn-td">记录</button></div><div id="td-content" class="mt-2" style="font-size:13px;color:var(--text2)">加载中...</div></div>'+
'<div class="card"><div class="card-title"><i class="fa-solid fa-chart-line"></i> 近7天趋势</div><canvas id="chart-canvas" style="width:100%;height:140px"></canvas></div>'+
'<div class="quick-grid">'+
'<div class="quick-card" onclick="navigate(\'ai-constitution\')"><div class="icon">🔍</div><div class="label">AI辨体</div></div>'+
'<div class="quick-card" onclick="navigate(\'diary-edit\')"><div class="icon">✍️</div><div class="label">健康日记</div></div>'+
'<div class="quick-card" onclick="navigate(\'daily-tasks\')"><div class="icon">✅</div><div class="label">每日打卡</div></div>'+
'<div class="quick-card" onclick="navigate(\'doctors\')"><div class="icon">👨‍⚕️</div><div class="label">医生上线</div></div>'+
'<div class="quick-card" onclick="navigate(\'nutritionists\')"><div class="icon">🍎</div><div class="label">营养师上门</div></div>'+
'<div class="quick-card" onclick="navigate(\'smart-shop\')"><div class="icon">🛒</div><div class="label">智能推荐</div></div>'+
'<div class="quick-card" onclick="navigate(\'diet-plan\')"><div class="icon">🥗</div><div class="label">食疗方案</div></div>'+
'<div class="quick-card" onclick="navigate(\'seasonal-calendar\')"><div class="icon">📅</div><div class="label">节气日历</div></div>'+
'<div class="quick-card" onclick="navigate(\'recipes\')"><div class="icon">🍲</div><div class="label">食疗药膳</div></div>'+
'<div class="quick-card" onclick="navigate(\'solar\')"><div class="icon">🌤️</div><div class="label">节气养生</div></div>'+
'</div>'+
'<div class="card" onclick="navigate(\'articles\')" style="cursor:pointer"><div class="flex-between"><div class="card-title"><i class="fa-solid fa-book-open"></i> 养生知识</div><span style="color:var(--green)">→</span></div><div class="card-subtitle">查看'+esc(state.user.constitution_type||'体质相关')+'养生文章</div></div>'+'<div class="card" onclick="navigate(\'my-consultations\')" style="cursor:pointer"><div class="flex-between"><div class="card-title">🏥 我的问诊</div><span style="color:var(--green)">→</span></div><div class="card-subtitle">查看问诊记录和咨询</div></div>'+'<div class="card" onclick="navigate(\'my-nutritionist-bookings\')" style="cursor:pointer"><div class="flex-between"><div class="card-title">📅 我的预约</div><span style="color:var(--green)">→</span></div><div class="card-subtitle">查看营养师预约记录</div></div>'+
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

async function renderDiary(){var h=hd('<i class="fa-solid fa-pen-to-square"></i> 健康日记','home');var b='<div class="page"><button class="btn btn-primary btn-block mb-4" onclick="navigate(\'diary-edit\')"><i class="fa-solid fa-pencil"></i> 记录今天</button><div id="diary-list" class="loading"><div class="spinner"></div></div></div>';document.getElementById('app').innerHTML=h+b;
try{var list=await api('/diary');state._diaryList=list;var c=document.getElementById('diary-list');if(!list.length){c.innerHTML='<div style="padding:40px;text-align:center;color:var(--text2)">还没有记录～<br>开始记录你的健康吧！</div>';return;}var html='';for(var i=0;i<list.length;i++){var d=list[i];html+='<div class="card" style="cursor:pointer" data-diary-id=\''+d.id+'\' onclick="openDiary(\''+d.id+'\')"><div class="flex-between"><span class="diary-date">'+d.record_date+'</span><span style="font-size:12px;color:var(--text2)">'+(d.exercise_minutes||0)+'min · '+mood(d.mood_score)+'</span></div><div class="diary-summary">睡眠 '+(d.sleep_hours||'-')+'h · 饮食 '+(d.meal_count||0)+'餐 · 饮水 '+(d.water_glasses||0)+'杯</div></div>';}c.innerHTML=html;}catch(e){document.getElementById('diary-list').innerHTML='<div style="padding:40px;text-align:center;color:var(--red)">加载失败</div>';}}
function renderDiaryEdit(){var d=state.pageParams.diary;var e=!!d;var dv=d?d.record_date:today();var moodBtns='';var emojis='😢😢😢😐😐😊😊😄😄😄';for(var i=0;i<10;i++){var n=i+1;moodBtns+='<button type="button" data-mood="'+n+'" class="'+(d&&d.mood_score===n?'selected':'')+'" onclick="setMood('+n+')">'+emojis[i]+'</button>';}var h=hd(e?'编辑日记':'新增日记','diary');var body='<div class="page"><div class="card"><div class="form-group"><label>日期</label><input id="d-date" class="form-input" type="date" value="'+dv+'" /></div><div class="form-row"><div class="form-group"><label>睡眠 (小时)</label><input id="d-sleep" class="form-input" type="number" step="0.5" value="'+(d?d.sleep_hours||'':'')+'" placeholder="7" /></div><div class="form-group"><label>运动 (分钟)</label><input id="d-exercise" class="form-input" type="number" value="'+(d?d.exercise_minutes||'':'')+'" placeholder="30" /></div></div><div class="form-group"><label>运动类型</label><input id="d-extype" class="form-input" value="'+esc(d?d.exercise_type:'')+'" placeholder="散步/跑步/瑜伽" /></div><div class="form-row"><div class="form-group"><label>用餐 (餐)</label><input id="d-meals" class="form-input" type="number" value="'+(d?d.meal_count||'':'')+'" placeholder="3" /></div><div class="form-group"><label>饮水 (杯)</label><input id="d-water" class="form-input" type="number" value="'+(d?d.water_glasses||'':'')+'" placeholder="8" /></div></div><div class="form-group"><label>饮食备注</label><input id="d-diet" class="form-input" value="'+esc(d?d.diet_note:'')+'" placeholder="吃了什么？" /></div><div class="form-group"><label>心情</label><div class="mood-emojis" id="mood-picker">'+moodBtns+'</div></div><div class="form-group"><label>备注</label><textarea id="d-note" class="form-textarea">'+esc(d?d.note:'')+'</textarea></div><button class="btn btn-primary btn-block" onclick="saveDiary('+(e?d.id:'null')+')"><i class="fa-solid fa-floppy-disk"></i> 保存</button>'+(e?'<button class="btn btn-block mt-2" style="background:#FFEBEE;color:var(--red);border:none;padding:10px;border-radius:8px" onclick="deleteDiary('+d.id+')"><i class="fa-solid fa-trash-can"></i> 删除</button>':'')+'</div></div>';document.getElementById('app').innerHTML=h+body;window._mood=d?d.mood_score:null;}
window.setMood=function(n){window._mood=n;var btns=document.querySelectorAll('#mood-picker button');for(var i=0;i<btns.length;i++){btns[i].classList.toggle('selected',parseInt(btns[i].dataset.mood)===n);}};
window.openDiary=function(id){var diary=state._diaryList&&state._diaryList[function(){for(var i=0;i<state._diaryList.length;i++){if(state._diaryList[i].id==id)return i;}return -1;}()];if(diary)navigate('diary-edit',{diary:diary});else toast('记录未找到','error');};
async function saveDiary(id){var data={record_date:document.getElementById('d-date').value,sleep_hours:parseFloat(document.getElementById('d-sleep').value)||null,exercise_minutes:parseInt(document.getElementById('d-exercise').value)||null,exercise_type:document.getElementById('d-extype').value,meal_count:parseInt(document.getElementById('d-meals').value)||null,water_glasses:parseInt(document.getElementById('d-water').value)||null,diet_note:document.getElementById('d-diet').value,mood_score:window._mood||null,note:document.getElementById('d-note').value};try{if(id)await api('/diary/'+id,{method:'PUT',body:JSON.stringify(data)});else await api('/diary',{method:'POST',body:JSON.stringify(data)});toast(id?'已更新！':'已记录！');navigate('diary');}catch(e){toast(e.message,'error');}}
async function deleteDiary(id){if(!confirm('确定删除？'))return;try{await api('/diary/'+id,{method:'DELETE'});toast('已删除');navigate('diary');}catch(e){toast(e.message,'error');}}

async function renderConstitution(){var h=hd('<i class="fa-solid fa-spa"></i> 体质测评');var body='<div class="page"><div class="card"><div class="card-title">中医九种体质</div><div class="card-subtitle">平和质·气虚质·阳虚质·阴虚质·痰湿质·湿热质·血瘀质·气郁质·特禀质</div><p style="font-size:13px;line-height:1.6">通过45道题目判断你的体质类型。</p><button class="btn btn-primary btn-block mt-4 btn-lg" onclick="navigate(\'constitution-assess\')">开始测评</button></div><div class="card-title">历史记录</div><div id="c-history"></div></div>';document.getElementById('app').innerHTML=h+body;
try{var records=await api('/constitution/records');var c=document.getElementById('c-history');if(!records.length){c.innerHTML='<div style="padding:20px;text-align:center;color:var(--text2)">暂无记录</div>';return;}var html='';for(var i=0;i<records.length;i++){var r=records[i];html+='<div class="card flex-between"><span style="font-weight:600">'+r.result_type+'</span><span style="font-size:12px;color:var(--text2)">'+(r.created_at?r.created_at.slice(0,10):'')+'</span></div>';}c.innerHTML=html;}catch(e){}}
async function renderConstitutionAssess(){document.getElementById('app').innerHTML='<div class="loading"><div class="spinner"></div><p>加载题目...</p></div>';try{var qs=await api('/constitution/questions');window._conAns={};var html='<div class="page"><div class="card"><div class="card-title">请根据近一年体验回答</div><div class="card-subtitle">没有(1)→很少(2)→有时(3)→经常(4)→总是(5)</div></div><div class="card">';for(var i=0;i<qs.length;i++){var q=qs[i];html+='<div class="question-item"><div class="q-text">'+(i+1)+'. '+q.question_text+'</div><div class="score-options">';var labels='没有,很少,有时,经常,总是'.split(',');for(var j=0;j<5;j++){var s=j+1;html+='<button type="button" onclick="selAns('+q.id+','+s+',this)">'+labels[j]+'</button>';}html+='</div></div>';}html+='</div><button class="btn btn-primary btn-block btn-lg" onclick="subAssess()">提交测评</button></div>';document.getElementById('app').innerHTML=hd('🧘 体质测评')+html;}catch(e){toast(e.message,'error');}}
window.selAns=function(qid,score,btn){window._conAns[qid]=score;var bs=btn.parentElement.querySelectorAll('button');for(var i=0;i<bs.length;i++)bs[i].classList.remove('selected');btn.classList.add('selected');};
async function subAssess(){var items=document.querySelectorAll('.question-item');if(Object.keys(window._conAns).length<items.length){toast('还有题未答','error');return;}try{var r=await api('/constitution/assess',{method:'POST',body:JSON.stringify({answers:window._conAns})});state.user.constitution_type=r.result_type;navigate('constitution-result',r);}catch(e){toast(e.message,'error');}}
function renderConstitutionResult(){var r=state.pageParams;var tips={'平和质':'恭喜！最健康。保持规律作息、均衡饮食、适量运动。','气虚质':'多吃补气食物：黄芪、山药、红枣。避免过度劳累。','阳虚质':'注意保暖，多吃温补食物：羊肉、生姜。多晒太阳。','阴虚质':'多吃滋阴食物：银耳、百合、梨。避免熬夜。','痰湿质':'健脾祛湿：薏米、赤小豆、冬瓜。加强运动。','湿热质':'清热利湿：绿豆、苦瓜、薏米。忌辛辣油腻。','血瘀质':'活血化瘀：山楂、黑木耳、玫瑰花茶。适量运动。','气郁质':'疏肝理气：玫瑰花茶、柑橘。多社交冥想。','特禀质':'增强免疫力，避免过敏原。规律作息。'};var scores=r.scores||{};var sorted=[];for(var k in scores)sorted.push([k,scores[k]]);sorted.sort(function(a,b){return b[1]-a[1];});var slist='';for(var i=0;i<sorted.length;i++){slist+='<div class="flex-between mt-2"><span>'+sorted[i][0]+'</span><span style="font-weight:600">'+sorted[i][1]+'</span></div>';}var h=hd('<i class="fa-solid fa-spa"></i> 测评结果');var b='<div class="page text-center"><div style="font-size:48px;margin:20px 0">🎉</div><div style="font-size:22px;font-weight:700;color:var(--green);margin-bottom:8px">'+r.result_type+'</div><div style="font-size:13px;color:var(--text2);margin-bottom:20px;line-height:1.6">'+(tips[r.result_type]||'')+'</div><div class="card"><div class="card-title">各项得分</div>'+slist+'</div><button class="btn btn-primary btn-block mt-4" onclick="navigate(\'home\')">回到首页</button></div>';document.getElementById('app').innerHTML=h+b;}

var _cachedRecipes=null;
async function renderRecipes(cat){var h=hd('<i class="fa-solid fa-utensils"></i> 食疗药膳','home');var b='<div class="page"><div id="r-content" class="loading"><div class="spinner"></div></div></div>';document.getElementById('app').innerHTML=h+b;
try{if(!_cachedRecipes)_cachedRecipes=await api('/recipes');if(!_cachedRecipes)_cachedRecipes=[];var cats=[];for(var i=0;i<_cachedRecipes.length;i++){if(cats.indexOf(_cachedRecipes[i].category)===-1)cats.push(_cachedRecipes[i].category);}var list=cat?_cachedRecipes.filter(function(r){return r.category===cat;}):_cachedRecipes;var html='<div class="category-filters"><button class="'+(cat?'':'active')+'" onclick="renderRecipes()">全部</button>';for(var i=0;i<cats.length;i++){var c2=cats[i];html+='<button class="'+(cat===c2?'active':'')+'" onclick="renderRecipes(\''+c2+'\')">'+c2+'</button>';}html+='</div>';for(var i=0;i<list.length;i++){var r=list[i];var cons=r.suitable_constitution||'';var tags='<span class="recipe-tag">'+r.category+'</span>';var ca=cons.split(',');for(var j=0;j<ca.length;j++){if(ca[j].trim())tags+='<span class="recipe-tag" style="background:#E3F2FD;color:#1565C0">'+ca[j].trim()+'</span>';}html+='<div class="recipe-card" style="cursor:pointer" onclick="navigate(\'recipe-detail\','+JSON.stringify({recipe:r})+')"><img class="recipe-img" src="/api/recipes/' + r.id + '/image" alt="' + r.name + '"><div class="recipe-name">'+r.name+'</div><div class="recipe-meta">'+tags+'</div><div style="font-size:13px;color:var(--text2)">'+esc(r.benefits)+'</div></div>';}document.getElementById('r-content').innerHTML=html;}catch(e){document.getElementById('r-content').innerHTML='<div style="padding:40px;text-align:center;color:var(--red)">加载失败</div>';}}
function renderRecipeDetail(){var r=state.pageParams.recipe;var tags='<span class="pill pill-green">'+r.category+'</span>';var cons=(r.suitable_constitution||'').split(',');for(var i=0;i<cons.length;i++){if(cons[i].trim())tags+='<span class="pill pill-orange">'+cons[i].trim()+'</span>';}var seas=(r.suitable_season||'').split(',');for(var i=0;i<seas.length;i++){if(seas[i].trim())tags+='<span class="pill pill-blue">'+seas[i].trim()+'</span>';}var h=hd(r.name,'recipes');var b='<div class="page"><div class="card"><div class="recipe-meta">'+tags+'</div><div class="recipe-detail"><h4><i class="fa-solid fa-bowl-food"></i> 食材</h4><p style="font-size:13px;line-height:1.6">'+esc(r.ingredients||'').replace(/\\n/g,'<br>')+'</p><h4><i class="fa-solid fa-list-ol"></i> 做法</h4><p style="font-size:13px;line-height:1.6;white-space:pre-line">'+esc(r.steps||'')+'</p><h4><i class="fa-solid fa-heart-pulse"></i> 功效</h4><p style="font-size:13px;color:var(--green-dark)">'+esc(r.benefits||'')+'</p></div></div></div>';document.getElementById('app').innerHTML=h+b;}

async function renderSolar(){var h=hd('<i class="fa-solid fa-sun"></i> 节气养生','home');var b='<div class="page" id="solar-content"><div class="loading"><div class="spinner"></div></div></div>';document.getElementById('app').innerHTML=h+b;
try{var results=await Promise.all([api('/solar-terms/current'),api('/solar-terms')]);var cur=results[0];var all=results[1];window._ST=all;var others=[];for(var i=0;i<all.length;i++){if(all[i].name!==cur.name)others.push(all[i]);}var html='<div class="term-banner"><div class="term-name">'+cur.name+'</div><div class="term-desc">'+cur.date_mmdd+' · '+cur.description+'</div></div><div class="card"><div class="card-title"><i class="fa-solid fa-mug-saucer"></i> 养生建议</div><p style="font-size:13px;line-height:1.6">'+esc(cur.wellness_tips||'')+'</p></div><div class="card"><div class="card-title"><i class="fa-solid fa-leaf"></i> 推荐食材</div><p style="font-size:13px;line-height:1.6">'+esc(cur.food_recommendations||'')+'</p></div><div class="card"><div class="card-title"><i class="fa-solid fa-person-running"></i> 运动建议</div><p style="font-size:13px;line-height:1.6">'+esc(cur.exercise_advice||'')+'</p></div><div class="card-title mt-4">二十四节气</div>';for(var i=0;i<others.length;i++){var t=others[i];html+='<div class="card flex-between" style="cursor:pointer" onclick="showTerm(\''+t.name+'\')"><span style="font-weight:500">'+t.name+'</span><span style="font-size:12px;color:var(--text2)">'+t.date_mmdd+'</span></div>';}document.getElementById('solar-content').innerHTML=html;}catch(e){document.getElementById('solar-content').innerHTML='<div style="padding:40px;text-align:center;color:var(--red)">加载失败</div>';}}
function showTerm(n){var all=window._ST;var t=null;for(var i=0;i<all.length;i++){if(all[i].name===n){t=all[i];break;}}if(!t)return;var h=hd(t.name,'solar');var b='<div class="page"><div class="term-banner"><div class="term-name">'+t.name+'</div><div class="term-desc">'+t.date_mmdd+'</div></div><div class="card"><div class="card-title"><i class="fa-solid fa-circle-info"></i> 节气介绍</div><p style="font-size:13px;line-height:1.6">'+esc(t.description||'')+'</p></div><div class="card"><div class="card-title">🍵 养生建议</div><p style="font-size:13px;line-height:1.6">'+esc(t.wellness_tips||'')+'</p></div><div class="card"><div class="card-title">🥬 推荐食材</div><p style="font-size:13px;line-height:1.6">'+esc(t.food_recommendations||'')+'</p></div><div class="card"><div class="card-title">🧘 运动建议</div><p style="font-size:13px;line-height:1.6">'+esc(t.exercise_advice||'')+'</p></div></div>';document.getElementById('app').innerHTML=h+b;}

async function renderArticles(cat){var h=hd('📖 养生知识','home');document.getElementById('app').innerHTML=h+'<div class="page" id="a-content"><div class="loading"><div class="spinner"></div></div></div>';
try{var url=cat?'/articles?category='+encodeURIComponent(cat):'/articles';var data=await api(url);var list=data.items||[];var cats=['中医养生','运动养生','节气养生'];var html='<div class="category-filters"><button class="'+(cat?'':'active')+'" onclick="renderArticles()">全部</button>';for(var i=0;i<cats.length;i++){var c2=cats[i];html+='<button class="'+(cat===c2?'active':'')+'" onclick="renderArticles(\''+c2+'\')">'+c2+'</button>';}html+='</div>';if(list.length){for(var i=0;i<list.length;i++){var a=list[i];html+='<div class="article-card" onclick="navigate(\'article-detail\',{id:'+a.id+'})"><div class="article-title">'+esc(a.title)+'</div><div class="article-summary">'+esc(a.summary||'')+'</div><div class="article-meta">'+esc(a.category||'')+' · '+esc(a.author||'')+' · 👁 '+(a.view_count||0)+'</div></div>';}}else{html+='<div style="padding:40px;text-align:center;color:var(--text2)">暂无文章</div>';}document.getElementById('a-content').innerHTML=html;}catch(e){document.getElementById('a-content').innerHTML='<div style="padding:40px;text-align:center;color:var(--red)">加载失败</div>';}}
async function renderArticleDetail(){document.getElementById('app').innerHTML='<div class="loading"><div class="spinner"></div><p>加载中...</p></div>';try{var a=await api('/articles/'+state.pageParams.id);var tags=(a.tags||'').split(',');var thtml='<span class="pill pill-green">'+esc(a.category||'')+'</span>';for(var i=0;i<tags.length;i++){if(tags[i].trim())thtml+='<span class="pill pill-blue">'+tags[i].trim()+'</span>';}var h=hd(a.title,'articles');var b='<div class="page"><div class="card"><div style="font-size:12px;color:var(--text2);margin-bottom:8px">'+thtml+'</div><p style="font-size:13px;line-height:1.8;white-space:pre-line">'+esc(a.content||'')+'</p><div class="article-meta mt-4">作者：'+esc(a.author||'')+' · '+(a.created_at||'').slice(0,10)+' · 👁 '+a.view_count+'</div></div></div>';document.getElementById('app').innerHTML=h+b;}catch(e){toast(e.message,'error');navigate('articles');}}

function renderProfile(){var u=state.user;var h='<div class="header"><h1><i class="fa-solid fa-user"></i> 个人中心</h1></div>';var avatar=u.nickname?esc(u.nickname[0]):'👤';var ct=u.constitution_type?'<div class="profile-constitution">'+u.constitution_type+'</div>':'<div style="margin-top:4px;font-size:12px;color:var(--text2)">尚未测评体质</div>';var genders={'male':'男','female':'女'};var gtxt=genders[u.gender]||'-';var b='<div class="page"><div class="profile-header"><div class="profile-avatar">'+avatar+'</div><div class="profile-name">'+esc(u.nickname||u.username)+'</div>'+ct+'</div><div class="card"><div class="card-title">基本信息</div><div class="flex-between mt-2"><span style="color:var(--text2)">用户名</span><span>'+esc(u.username)+'</span></div><div class="flex-between mt-2"><span style="color:var(--text2)">昵称</span><span>'+esc(u.nickname||'-')+'</span></div><div class="flex-between mt-2"><span style="color:var(--text2)">性别</span><span>'+gtxt+'</span></div><div class="flex-between mt-2"><span style="color:var(--text2)">出生年份</span><span>'+(u.birth_year||'-')+'</span></div><div class="flex-between mt-2"><span style="color:var(--text2)">身高</span><span>'+(u.height_cm||'-')+' cm</span></div><div class="flex-between mt-2"><span style="color:var(--text2)">体重</span><span>'+(u.weight_kg||'-')+' kg</span></div><button class="btn btn-outline btn-block mt-4" onclick="navigate(\'profile-edit\')">编辑资料</button></div><div class="card" onclick="navigate(\'constitution\')" style="cursor:pointer"><div class="flex-between"><div class="card-title">🧘 体质测评</div><span style="color:var(--green)">→</span></div><div class="card-subtitle">'+(u.constitution_type?'当前：'+u.constitution_type:'尚未测评，点击开始')+'</div></div><div class="card" onclick="navigate(\'articles\')" style="cursor:pointer"><div class="flex-between"><div class="card-title">📖 养生知识</div><span style="color:var(--green)">→</span></div><div class="card-subtitle">查看文章和养生建议</div></div><div class="card" onclick="navigate(\'provider-apply\')" style="cursor:pointer;border:1px dashed var(--green)"><div class="flex-between"><div class="card-title">🏥 服务商入驻</div><span style="color:var(--green)">→</span></div><div class="card-subtitle">营养师/中医师申请入驻平台</div></div><div class="card" onclick="navigate(\'health-archive\')" style="cursor:pointer"><div class="flex-between"><div class="card-title">📋 健康档案</div><span style="color:var(--green)">→</span></div><div class="card-subtitle">体质历程 · 问诊记录 · 健康趋势</div></div><div class="card" onclick="navigate('about')" style="cursor:pointer"><div class="flex-between"><div class="card-title">ℹ️ 关于我们</div><span style="color:var(--green)">→</span></div><div class="card-subtitle">平台简介 · 联系方式 · 用户协议</div></div><div class="card" onclick="navigate('contact')" style="cursor:pointer"><div class="flex-between"><div class="card-title">📞 联系我们</div><span style="color:var(--green)">→</span></div><div class="card-subtitle">客服热线 400-888-8888</div></div>+(u.role==='admin'||u.role==='super_admin'?'<div class="card" onclick="navigate(\'admin-dashboard\')" style="cursor:pointer;border:2px solid #D4A760;background:linear-gradient(135deg, rgba(212,167,96,0.1), transparent)"><div class="flex-between"><div class="card-title" style="color:#D4A760">⚙️ 管理后台</div><span style="color:#D4A760">→</span></div><div class="card-subtitle">数据概览 · 服务商审核 · 内容管理</div></div>':'')+ '<button class="btn btn-block mt-4" style="background:#FFEBEE;color:var(--red);border:none;padding:12px;border-radius:8px;font-size:14px" onclick="handleLogout()">退出登录</button></div>';document.getElementById('app').innerHTML=h+b;}
function renderProfileEdit(){var u=state.user;var h=hd('编辑资料','profile');var genderOpts=['','不显示','male','男','female','女'];var b='<div class="page"><div class="card"><div class="form-group"><label>昵称</label><input id="p-nick" class="form-input" value="'+esc(u.nickname||'')+'" /></div><div class="form-group"><label>性别</label><select id="p-gender" class="form-select"><option value="">不显示</option><option value="male"'+(u.gender==='male'?' selected':'')+'>男</option><option value="female"'+(u.gender==='female'?' selected':'')+'>女</option></select></div><div class="form-row"><div class="form-group"><label>出生年份</label><input id="p-year" class="form-input" type="number" value="'+(u.birth_year||'')+'" placeholder="1990" /></div><div class="form-group"><label>身高 (cm)</label><input id="p-height" class="form-input" type="number" value="'+(u.height_cm||'')+'" placeholder="170" /></div></div><div class="form-group"><label>体重 (kg)</label><input id="p-weight" class="form-input" type="number" value="'+(u.weight_kg||'')+'" placeholder="65" /></div><button class="btn btn-primary btn-block" onclick="saveProfile()">💾 保存</button></div></div>';document.getElementById('app').innerHTML=h+b;}
async function saveProfile(){try{var data={nickname:document.getElementById('p-nick').value,gender:document.getElementById('p-gender').value,birth_year:parseInt(document.getElementById('p-year').value)||null,height_cm:parseInt(document.getElementById('p-height').value)||null,weight_kg:parseInt(document.getElementById('p-weight').value)||null};var u=await api('/auth/me',{method:'PUT',body:JSON.stringify(data)});state.user=u;toast('已保存！');navigate('profile');}catch(e){toast(e.message,'error');}}

// ── 在线中医问诊 ──
// POST helper for TCM module (does not override original api function)
function tcmPost(path, body) {
  var opts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
  if(state.token) opts.headers['Authorization'] = 'Bearer ' + state.token;
  return fetch(API + path, opts).then(function(r) {
    if(r.status===401){state.token=null;localStorage.removeItem('token');state.user=null;navigate('login');throw Error('Unauthorized');}
    return r.json().then(function(d){if(!r.ok)throw Error(d.detail||'Error');return d;});
  });
}

async function renderTCM(){updateThemeIcon();
  var h='<div class="header"><h1><i class="fa-solid fa-hospital"></i> 在线中医问诊</h1><p>三甲中医院医生在线，图文/视频问诊</p></div>';
  var b='<div class="page"><div class="loading"><div class="spinner"></div><p>加载医生列表...</p></div></div>';
  document.getElementById('app').innerHTML=h+b;
  try{
    var doctors=await api('/api/tcm/doctors');
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
    b=document.querySelector('.page');
    if(b)b.innerHTML=html;
  }catch(e){toast(e.message,'error');}
}

// 开始问诊
window.startConsult=async function(docId,docName,docTitle,docPrice){
  // 显示症状输入弹窗（带内联医生信息，无需额外fetch）
  var popup=document.getElementById('popup')||(function(){var e=document.createElement('div');e.id='popup';e.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center';document.body.appendChild(e);return e;})();
  popup.innerHTML='<div style="background:var(--card);padding:24px;border-radius:16px;width:90%;max-width:340px;box-shadow:0 8px 32px rgba(0,0,0,0.2)">'+
    '<h3 style="margin:0 0 16px">问诊挂号</h3>'+
    '<div style="font-size:13px;color:var(--text2);margin-bottom:12px">医生：'+esc(docName)+' '+esc(docTitle)+'<br>费用：¥'+(docPrice||'99')+'（图文咨询）</div>'+
    '<textarea id="symptom-input" rows="4" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:14px;box-sizing:border-box;background:var(--bg);color:var(--text);resize:none" placeholder="请描述你的主要症状或想咨询的问题..."></textarea>'+
    '<div style="display:flex;gap:8px;margin-top:16px">'+
    '<button onclick="document.getElementById(\'popup\').remove()" class="btn btn-sm btn-outline" style="flex:1">取消</button>'+
    '<button onclick="submitConsult('+docId+')" class="btn btn-sm" style="flex:1;background:var(--green);color:#fff;border:none;padding:10px;border-radius:8px">提交挂号</button></div></div>';
  popup.style.display='flex';
};

// 提交问诊
window.submitConsult=async function(docId){
  var symptom=document.getElementById('symptom-input').value.trim();
  if(!symptom){toast('请描述你的症状','error');return;}
  var popup=document.getElementById('popup');
  if(popup)popup.remove();
  try{
    var h={'Content-Type':'application/json'};
    if(state.token)h['Authorization']='Bearer '+state.token;
    var res=await fetch(API+'/tcm/consultations',{method:'POST',headers:h,body:JSON.stringify({doctor_id:docId,symptoms:symptom,type:'text'})});
    var data=await res.json();
    if(!res.ok)throw Error(data.detail||'挂号失败');
    if(data&&data.id){
      toast('挂号成功！等待医生接诊');
      navigate('consulting',{id:data.id,doctor_id:docId});
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
  
  // Poll messages
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
    var h={'Content-Type':'application/json'};
    if(state.token)h['Authorization']='Bearer '+state.token;
    await fetch(API+'/tcm/messages',{method:'POST',headers:h,body:JSON.stringify({consultation_id:window._consultId,content:text})});
    // Immediately show user message
    var area=document.getElementById('msg-area');
    area.innerHTML+='<div style="text-align:right;margin:6px 0"><span style="background:var(--green);color:#fff;padding:8px 14px;border-radius:12px 12px 4px 12px;display:inline-block;max-width:75%;font-size:14px;line-height:1.5">'+esc(text)+'</span></div>';
    area.scrollTop=area.scrollHeight;
  }catch(e){toast(e.message,'error');}
};

// 轮询消息
async function pollMessages(){
  if(!window._consultId)return;
  try{
    var msgs=await api('/api/tcm/messages/'+window._consultId);
    var area=document.getElementById('msg-area');
    if(area&&msgs&&msgs.length){
      var html='';
      var gotPrescription=false;
      for(var mi=0;mi<msgs.length;mi++){
        var m=msgs[mi];
        if(m.msg_type==='system'){
          html+='<div style="text-align:center;margin:8px 0;font-size:12px;color:var(--text2)">'+esc(m.content)+'</div>';
          if(m.content.indexOf('处方')>=0)gotPrescription=true;
        }else if(m.sender_type==='user'){
          html+='<div style="text-align:right;margin:6px 0"><span style="background:var(--green);color:#fff;padding:8px 14px;border-radius:12px 12px 4px 12px;display:inline-block;max-width:75%;font-size:14px;line-height:1.5">'+esc(m.content)+'</span></div>';
        }else if(m.sender_type==='doctor'){
          html+='<div style="text-align:left;margin:6px 0"><span style="background:var(--card);padding:8px 14px;border-radius:12px 12px 12px 4px;display:inline-block;max-width:75%;font-size:14px;line-height:1.5;border:1px solid var(--border)">'+esc(m.content)+'</span></div>';
        }
      }
      if(area.innerHTML!==html){area.innerHTML=html;area.scrollTop=area.scrollHeight;}
      if(gotPrescription){area.innerHTML+='<div style="text-align:center;margin:12px 0"><button onclick="showPrescription('+window._consultId+')" class="btn btn-sm" style="background:var(--green);color:#fff;border:none;padding:8px 20px;border-radius:8px">📋 查看处方</button></div>';}
    }
  }catch(e){}
  setTimeout(pollMessages,3000);
}

// 查看处方
window.showPrescription=async function(cid){
  try{
    var pres=await api('/api/tcm/prescriptions/'+cid);
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


/*
茶养前端渲染函数
通过 build_tea_app.js 注入到 app.js
*/

// 全局变量
var teaData = {};

// ═══════════════════════════════════════════════════
// 茶养首页（第一屏：今日茶养卡片）
// ═══════════════════════════════════════════════════
/*
茶养前端渲染函数
通过 build_tea_app.js 注入到 app.js
*/

// 全局变量
var teaData = {};

// ═══════════════════════════════════════════════════
// 茶养首页（第一屏：今日茶养卡片）
// ═══════════════════════════════════════════════════
// ################################################################
// tea_frontend.js - 茶养模块前端渲染函数 (修复版)
// 注意：所有 HTML onclick 中的字符串参数必须用 &apos; 或 encodeURIComponent
// ################################################################

// ═══════════════════════════════════════════════════
// 茶养首页
// ═══════════════════════════════════════════════════
// ═══════════════════════════════════════════════════
// 商城模块 - 淘宝风格布局 v2.0
// ═══════════════════════════════════════════════════

// 全局商城状态
var shopState = {
  category: null,
  sortBy: 'default',
  searchTerm: '',
  bannerIndex: 0
};

// 商城首页


// 轮播切换
function switchBanner(index) {
  var slides = document.querySelectorAll('.banner-slide');
  var dots = document.querySelectorAll('.banner-dots .dot');
  
  for (var i = 0; i < slides.length; i++) {
    slides[i].classList.toggle('active', i === index);
    dots[i].classList.toggle('active', i === index);
  }
  
  shopState.bannerIndex = index;
}

// 自动轮播
var bannerTimer = null;
function startBannerRotation() {
  if (bannerTimer) clearInterval(bannerTimer);
  
  bannerTimer = setInterval(function() {
    var nextIndex = (shopState.bannerIndex + 1) % 3;
    switchBanner(nextIndex);
  }, 4000);
}

// 搜索商品
function searchProducts() {
  var input = document.getElementById('shop-search-input');
  if (input) {
    shopState.searchTerm = input.value.trim();
    renderShop(shopState.category);
  }
}

// 分类筛选
function filterByCategory(cat) {
  shopState.category = cat;
  shopState.searchTerm = '';
  var input = document.getElementById('shop-search-input');
  if (input) input.value = '';
  renderShop(cat);
}

// 显示全部商品
function showAllProducts() {
  shopState.category = null;
  shopState.searchTerm = '';
  shopState.sortBy = 'default';
  var input = document.getElementById('shop-search-input');
  if (input) input.value = '';
  renderShop();
}

// 排序弹窗
function showSortPopup() {
  var popup = document.getElementById('popup') || (function() {
    var e = document.createElement('div');
    e.id = 'popup';
    e.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:flex-end;justify-content:center';
    document.body.appendChild(e);
    return e;
  })();
  
  var sortOptions = [
    { value: 'default', label: '综合排序', icon: '🔄' },
    { value: 'sales', label: '销量优先', icon: '🔥' },
    { value: 'price-asc', label: '价格从低到高', icon: '💰' },
    { value: 'price-desc', label: '价格从高到低', icon: '💎' }
  ];
  
  var html = '<div class="sort-popup">' +
    '<div class="sort-popup-header">' +
    '<span>排序方式</span>' +
    '<button onclick="closePopup()" style="background:none;border:none;font-size:20px;color:var(--text2);cursor:pointer">✕</button>' +
    '</div>' +
    '<div class="sort-options">';
  
  for (var i = 0; i < sortOptions.length; i++) {
    var opt = sortOptions[i];
    html += '<div class="sort-option ' + (shopState.sortBy === opt.value ? 'active' : '') + '" onclick="applySort(\'' + opt.value + '\')">' +
      '<span class="sort-icon">' + opt.icon + '</span>' +
      '<span class="sort-label">' + opt.label + '</span>' +
      (shopState.sortBy === opt.value ? '<span class="sort-check">✓</span>' : '') +
      '</div>';
  }
  
  html += '</div></div>';
  
  popup.innerHTML = html;
  popup.style.display = 'flex';
}

// 应用排序
function applySort(sortBy) {
  shopState.sortBy = sortBy;
  closePopup();
  renderShop(shopState.category);
}

// 关闭弹窗
function closePopup() {
  var popup = document.getElementById('popup');
  if (popup) popup.remove();
}


function openPrd(id){api('/api/shop/products/'+id).then(function(p){navigate('shop-product',{product:p});}).catch(function(e){toast(e.message,'error');});}
function switchBannerNext() {
  var nextIndex = (shopState.bannerIndex + 1) % 3;
  switchBanner(nextIndex);
}
function closePopup() {
  var popup = document.getElementById('sort-popup-overlay');
  if (popup) popup.remove();
}
function applySort(sortBy) {
  shopState.sortBy = sortBy;
  closePopup();
  renderShop(shopState.category);
}
function showSortPopup() {
  var e = document.getElementById('sort-popup-overlay');
  if (!e) {
    e = document.createElement('div');
    e.id = 'sort-popup-overlay';
    e.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:flex-end;justify-content:center';
    e.onclick = function(ev) { if (ev.target === e) closePopup(); };
    document.body.appendChild(e);
  }
  var opts = [{v:'default',l:'综合排序',i:'🔄'},{v:'sales',l:'销量优先',i:'🔥'},{v:'price-asc',l:'价格从低到高',i:'💰'},{v:'price-desc',l:'价格从高到低',i:'💎'}];
  var h = '<div class="sort-popup"><div class="sort-popup-header"><span>排序方式</span><button onclick="closePopup()" style="background:none;border:none;font-size:20px;color:var(--text2);cursor:pointer">✕</button></div><div class="sort-options">';
  for (var i = 0; i < opts.length; i++) {
    h += '<div class="sort-option ' + (shopState.sortBy === opts[i].v ? 'active' : '') + '" onclick="applySort(\'' + opts[i].v + '\')"><span class="sort-icon">' + opts[i].i + '</span><span class="sort-label">' + opts[i].l + '</span>' + (shopState.sortBy === opts[i].v ? '<span class="sort-check">✓</span>' : '') + '</div>';
  }
  h += '</div></div>';
  e.innerHTML = h;
}
function setupFlashTimer() {
  var timerEl = document.getElementById('flash-timer');
  if (!timerEl) return;
  var seconds = 7200;
  setInterval(function() {
    seconds--;
    if (seconds <= 0) seconds = 7200;
    var h = Math.floor(seconds/3600);
    var m = Math.floor((seconds%3600)/60);
    var s = seconds%60;
    timerEl.textContent = '距结束 ' + (h<10?'0':'') + h + ':' + (m<10?'0':'') + m + ':' + (s<10?'0':'') + s;
  }, 1000);
}

async function renderShop(cat) {
  updateThemeIcon();
  
  // 更新状态
  if (cat) shopState.category = cat;
  if (!cat) shopState.category = null;
  
  var h = '<div class="shop-header">' +
    '<div class="shop-search-bar">' +
    '<i class="fa-solid fa-search"></i>' +
    '<input type="text" id="shop-search-input" placeholder="搜索养生好物..." onkeyup="if(event.key===\'Enter\')searchProducts()">' +
    '<button onclick="searchProducts()" style="background:none;border:none;color:var(--green);font-size:16px;padding:4px 8px;cursor:pointer">搜索</button>' +
    '</div></div>';
  
  document.getElementById('app').innerHTML = h + '<div class="page shop-page" id="shop-page"><div class="loading"><div class="spinner"></div><p>加载中...</p></div></div>';
  
  try {
    var prods = await api('/api/shop/products', {silent:true});
    var cats = await api('/api/shop/categories', {silent:true});
    if (!prods || !cats) throw Error('network-error');
    var cartItems = [];
    try { cartItems = await api('/api/shop/cart', {silent:true}); } catch(e) {}
    var cartCount = cartItems ? cartItems.reduce(function(s, i) { return s + i.quantity; }, 0) : 0;
    var filtered = prods || [];
    if (shopState.category) { filtered = filtered.filter(function(p) { return p.category === shopState.category; }); }
    if (shopState.searchTerm) { var st = shopState.searchTerm.toLowerCase(); filtered = filtered.filter(function(p) { return p.name.toLowerCase().indexOf(st) >= 0 || (p.description||'').toLowerCase().indexOf(st) >= 0; }); }
    var html = '';
    
    // ===== 轮播广告位（升级视觉） =====
    html += '<div class="shop-banner" id="shop-banner">' +
      '<div class="banner-slides">' +
      '<div class="banner-slide active" style="background:linear-gradient(135deg,#ff6b35,#f7931e)">' +
      '<div class="banner-content"><div class="banner-title">🍵 春季养生季</div><div class="banner-subtitle">精选茶饮满99减20</div><div class="banner-btn">立即抢购</div></div>' +
      '</div>' +
      '<div class="banner-slide" style="background:linear-gradient(135deg,#e91e63,#ff5722)">' +
      '<div class="banner-content"><div class="banner-title">🥗 食疗药膳</div><div class="banner-subtitle">体质调理好帮手 · 正品保证</div><div class="banner-btn">查看详情</div></div>' +
      '</div>' +
      '<div class="banner-slide" style="background:linear-gradient(135deg,#9c27b0,#673ab7)">' +
      '<div class="banner-content"><div class="banner-title">🌿 中药材专区</div><div class="banner-subtitle">道地药材 · 品质保证 · 买贵必赔</div><div class="banner-btn">进入专区</div></div>' +
      '</div>' +
      '</div>' +
      '<div class="banner-dots">' +
      '<span class="dot active" onclick="switchBanner(0)"></span>' +
      '<span class="dot" onclick="switchBanner(1)"></span>' +
      '<span class="dot" onclick="switchBanner(2)"></span>' +
      '</div></div>';
    
    // ===== 金刚区 =====
    html += '<div class="shop-shortcuts">' +
      '<div class="shortcut-item" onclick="filterByCategory(\'茶饮\')">' +
      '<div class="shortcut-icon" style="background:linear-gradient(135deg,#4CAF50,#66BB6A)">🍵</div>' +
      '<div class="shortcut-label">茶饮</div></div>' +
      '<div class="shortcut-item" onclick="filterByCategory(\'药材\')">' +
      '<div class="shortcut-icon" style="background:linear-gradient(135deg,#9C27B0,#BA68C8)">🌿</div>' +
      '<div class="shortcut-label">药材</div></div>' +
      '<div class="shortcut-item" onclick="filterByCategory(\'食材\')">' +
      '<div class="shortcut-icon" style="background:linear-gradient(135deg,#FF9800,#FFB74D)">🥜</div>' +
      '<div class="shortcut-label">食材</div></div>' +
      '<div class="shortcut-item" onclick="filterByCategory(\'器具\')">' +
      '<div class="shortcut-icon" style="background:linear-gradient(135deg,#2196F3,#64B5F6)">🏺</div>' +
      '<div class="shortcut-label">器具</div></div>' +
      '<div class="shortcut-item" onclick="filterByCategory(null)">' +
      '<div class="shortcut-icon" style="background:linear-gradient(135deg,#F44336,#EF5350)">🔥</div>' +
      '<div class="shortcut-label">热销</div></div>' +
      '<div class="shortcut-item" onclick="showAllProducts()">' +
      '<div class="shortcut-icon" style="background:linear-gradient(135deg,#607D8B,#90A4AE)">📦</div>' +
      '<div class="shortcut-label">全部</div></div>' +
      '</div>';
    
    // ===== 限时秒杀 =====
    var flashSale = prods.filter(function(p) { return p.original_price && p.original_price > p.price; }).slice(0, 6);
    if (flashSale.length > 0) {
      html += '<div class="flash-sale-section">' +
        '<div class="section-header">' +
        '<div class="section-title">' +
        '<span class="flash-icon">⚡</span> 限时秒杀' +
        '<span class="flash-timer" id="flash-timer">距结束 02:00:00</span>' +
        '</div>' +
        '<div class="section-more" onclick="filterByCategory(null)">更多 ›</div>' +
        '</div>' +
        '<div class="flash-sale-scroll">';
      for (var fi = 0; fi < flashSale.length; fi++) {
        var fp = flashSale[fi];
        var disc = Math.round((1 - fp.price / fp.original_price) * 100);
        html += '<div class="flash-sale-item" onclick="openPrd(' + fp.id + ')">' +
          '<div class="flash-img" style="background:linear-gradient(135deg,var(--green),var(--green2))"><span style="font-size:32px">🍵</span></div>' +
          '<div class="flash-price">¥' + fp.price + '</div>' +
          '<div class="flash-original">¥' + fp.original_price + '</div>' +
          '<div class="flash-progress"><div class="flash-progress-bar" style="width:' + (30 + fi * 10) + '%"></div></div>' +
          '<div class="flash-sold">已抢' + (30 + fi * 10) + '%</div>' +
          '</div>';
      }
      html += '</div></div>';
    }
    
    // ===== 分类导航条 =====
    html += '<div class="shop-category-bar">' +
      '<div class="category-scroll">' +
      '<span class="category-tag ' + (!shopState.category || shopState.category === '全部' ? 'active' : '') + '" onclick="filterByCategory(null)">全部</span>';
    for (var ci = 0; ci < cats.length; ci++) {
      var cc = cats[ci];
      if (cc && cc !== '全部') {
        html += '<span class="category-tag ' + (shopState.category === cc ? 'active' : '') + '" onclick="filterByCategory(\'' + cc + '\')">' + esc(cc) + '</span>';
      }
    }
    html += '</div>' +
      '<div class="sort-btn" onclick="showSortPopup()">' +
      '<i class="fa-solid fa-filter"></i> 筛选' +
      '</div></div>';
    
    // ===== 商品网格 =====
    html += '<div class="shop-products">';
    var shown = filtered.slice(0, 20);
    for (var i = 0; i < shown.length; i++) {
      var p = shown[i];
      var discount = p.original_price && p.original_price > p.price ? Math.round((1 - p.price / p.original_price) * 100) : 0;
      var emj = { '食材': '🍯', '茶饮': '🍵', '厨具': '🏺', '药材': '🌿' }[p.category] || '📦';
      html += '<div class="product-card" onclick="openPrd(' + p.id + ')">' +
        '<div class="product-img" style="background:linear-gradient(135deg,var(--green),var(--green2))"><span style="font-size:40px">' + emj + '</span></div>' +
        '<div class="product-info">' +
        '<div class="product-name">' + esc(p.name) + '</div>' +
        '<div class="product-desc">' + esc(p.description || '') + '</div>' +
        '<div class="product-price-row">' +
        '<span class="product-price">¥' + p.price + '</span>';
      if (discount > 0) html += '<span class="product-tag tag-sale">省' + discount + '%</span>';
      html += '</div><div class="product-meta">';
      if (p.sales_count) html += '<span>销量 ' + p.sales_count + '</span>';
      html += '<span>' + esc(p.category) + '</span></div></div></div>';
    }
    html += '</div></div>';
    
    document.getElementById('shop-page').innerHTML = html;
    
    if (shown.length === 0) {
      document.getElementById('shop-page').innerHTML = '<div style="padding:80px 20px;text-align:center;color:var(--text2)">' +
        '<div style="font-size:64px;margin-bottom:16px">📦</div><div style="font-size:15px">暂无商品</div></div>';
    }
    
    // 轮播自动播放
    window._shopBannerTimer = setInterval(switchBannerNext, 4000);
    setupFlashTimer();
  } catch(e) {
    console.error('renderShop error:', e);
    document.getElementById('shop-page').innerHTML = '<div style="padding:80px 20px;text-align:center;color:var(--text2)">' +
      '<div style="font-size:64px;margin-bottom:16px">⚠️</div><div style="font-size:15px">商城加载失败</div>' +
      '<button onclick="renderShop()" class="btn btn-primary" style="margin-top:12px;padding:10px 30px;border-radius:10px">重试</button></div>';
  }
}

function renderShopProduct() {
  updateThemeIcon();
  var p = state.pageParams.product;
  if (!p || !p.id) { navigate('shop'); return; }
  var tags = '';
  if (p.category) tags += '<span class="pill pill-green">' + esc(p.category) + '</span> ';
  if (p.suitable_constitution) {
    var cons = p.suitable_constitution.split(',');
    for (var i = 0; i < cons.length; i++) { if (cons[i].trim()) tags += '<span class="pill pill-orange">' + cons[i].trim() + '</span> '; }
  }
  var h = hd(p.name, 'shop');
  var b = '<div class="page">' +
    '<div class="card">' +
    '<div style="text-align:center;padding:24px 0">' +
    '<div style="width:200px;height:200px;margin:0 auto;border-radius:16px;background:linear-gradient(135deg,#e8f5e9,#c8e6c9);display:flex;align-items:center;justify-content:center;font-size:80px">🛍️</div>' +
    '</div>' +
    '<div style="text-align:center;margin-top:12px">' + tags + '</div>' +
    '<h3 style="text-align:center;margin:12px 0 4px;font-size:20px">' + esc(p.name) + '</h3>' +
    (p.original_price && p.original_price > p.price ?
      '<div style="text-align:center"><span style="color:#999;text-decoration:line-through;font-size:13px">¥' + (p.original_price/100).toFixed(2) + '</span> <span style="color:var(--red);font-size:22px;font-weight:700">¥' + (p.price/100).toFixed(2) + '</span></div>' :
      '<div style="text-align:center;color:var(--red);font-size:22px;font-weight:700">¥' + (p.price/100).toFixed(2) + '</div>') +
    (p.description ? '<p style="font-size:14px;color:var(--text2);line-height:1.6;margin-top:8px">' + esc(p.description) + '</p>' : '') +
    (p.benefits ? '<div style="margin-top:12px;padding:12px;background:#f5f5f5;border-radius:10px"><div style="font-size:13px;color:var(--green-dark);font-weight:600">✨ 功效</div><div style="font-size:13px;line-height:1.6;margin-top:4px">' + esc(p.benefits) + '</div></div>' : '') +
    (p.ingredients ? '<div style="margin-top:8px;padding:12px;background:#f5f5f5;border-radius:10px"><div style="font-size:13px;color:var(--green-dark);font-weight:600">📦 成分</div><div style="font-size:13px;line-height:1.6;margin-top:4px">' + esc(p.ingredients).replace(/\n/g,'<br>') + '</div></div>' : '') +
    '</div>' +
    '<div style="display:flex;gap:10px;margin-top:16px">' +
    '<button class="btn btn-primary btn-block" style="flex:1" onclick="addToCart(' + p.id + ')"><i class="fa-solid fa-cart-plus"></i> 加入购物车</button>' +
    '<button class="btn btn-outline" style="flex:1" onclick="navigate(\'shop\')">返回商城</button>' +
    '</div></div>';
  document.getElementById('app').innerHTML = h + b;
}


async function renderShopCart(){updateThemeIcon();try{var items=await api('/api/shop/cart');var h=hd('购物车');if(!items||!items.length){document.getElementById('app').innerHTML=h+'<div class="page"><div style="padding:80px 20px;text-align:center"><div style="font-size:64px;margin-bottom:16px">🛒</div><div style="font-size:16px;color:var(--text2)">购物车是空的</div><button onclick="navigate(\'shop\')" class="btn btn-primary mt-4" style="padding:10px 30px;border-radius:10px">去逛逛</button></div></div>';return;}var colors=['#4CAF50','#FF9800','#2196F3','#9C27B0','#F44336','#00BCD4','#FF5722','#607D8B','#795548','#8BC34A'];var emojis=['🍵','🌿','🍯','🥜','🍄','🥬','🍊','🍚','🫘','🌾','🍠','🥦','🍇','🥛','🧊','🍳','🥟','🍜','🥗','🧁'];var html='<div class="page" style="padding-bottom:100px">';var total=0;for(var i=0;i<items.length;i++){var it=items[i];var subtotal=it.price*it.quantity;total+=subtotal;var bg=colors[it.product_id%colors.length];var emoji=emojis[it.product_id%emojis.length];html+='<div class="card" style="display:flex;gap:12px;padding:12px;border-radius:12px;margin-bottom:8px">'+
  '<div style="width:72px;height:72px;border-radius:10px;background:linear-gradient(135deg,'+bg+',rgba(0,0,0,0.1));display:flex;align-items:center;justify-content:center;font-size:32px;flex-shrink:0">'+emoji+'</div>'+
  '<div style="flex:1;display:flex;flex-direction:column;justify-content:space-between">'+
  '<div><div style="font-size:14px;font-weight:600">'+esc(it.name)+'</div><div style="font-size:12px;color:var(--text2);margin-top:2px">'+esc(it.category||'')+'</div></div>'+
  '<div style="display:flex;justify-content:space-between;align-items:center">'+
  '<span style="font-size:16px;font-weight:700;color:var(--green)">¥'+it.price+'</span>'+
  '<div style="display:flex;align-items:center;gap:0;border:1px solid var(--border);border-radius:6px;overflow:hidden">'+
  '<button onclick="updateCartQty('+it.id+','+it.product_id+','+(it.quantity-1)+')" style="width:30px;height:30px;border:none;background:var(--bg);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text)">−</button>'+
  '<span style="width:36px;text-align:center;font-size:14px;font-weight:600;border-left:1px solid var(--border);border-right:1px solid var(--border)">'+it.quantity+'</span>'+
  '<button onclick="updateCartQty('+it.id+','+it.product_id+','+(it.quantity+1)+')" style="width:30px;height:30px;border:none;background:var(--bg);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text)">+</button></div></div></div>'+
  '<button onclick="delFromCart('+it.id+')" style="position:absolute;top:8px;right:8px;background:none;border:none;font-size:16px;color:#999;cursor:pointer">✕</button></div>';
}html+='</div>';// 底部结算栏
html+='<div style="position:fixed;bottom:58px;left:0;right:0;background:var(--card);padding:10px 16px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--border);z-index:10">'+
  '<div><span style="font-size:12px;color:var(--text2)">合计</span><span style="font-size:22px;font-weight:700;color:var(--green);margin-left:6px">¥'+total.toFixed(1)+'</span></div>'+
  '<button class="btn" style="padding:10px 28px;border-radius:10px;font-size:15px;background:linear-gradient(135deg,var(--green),#2d8a4e);color:#fff;border:none;cursor:pointer" onclick="goCheckout()">去结算</button></div>';
document.getElementById('app').innerHTML=h+html;}catch(e){document.getElementById('app').innerHTML=hd('购物车')+'<div class="page"><div style="padding:40px">加载失败</div></div>';}}
function updateCartQty(cartId,prodId,qty){if(qty<=0){delFromCart(cartId);return;}api('/api/shop/cart/update',{method:'POST',body:JSON.stringify({id:cartId,quantity:qty})}).then(function(){renderShopCart();}).catch(function(e){toast(e.message,'error');});}
function delFromCart(id){api('/api/shop/cart/remove',{method:'POST',body:JSON.stringify({id:id})}).then(function(){renderShopCart();}).catch(function(e){toast(e.message,'error');});}
function goCheckout(){var h=hd('确认订单');var b='<div class="page" style="padding-bottom:20px">'+
  '<div class="card" style="border-radius:12px">'+
  '<div style="font-size:14px;font-weight:600;color:var(--green);margin-bottom:12px">📍 收货信息</div>'+
  '<div class="form-group" style="margin-bottom:10px"><label style="font-size:13px;color:var(--text2);display:block;margin-bottom:4px">收货人</label><input id="ch-name" class="form-input" placeholder="请输入姓名" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;font-size:14px;background:var(--bg);color:var(--text);box-sizing:border-box"></div>'+
  '<div class="form-group" style="margin-bottom:10px"><label style="font-size:13px;color:var(--text2);display:block;margin-bottom:4px">手机号</label><input id="ch-phone" class="form-input" type="tel" placeholder="请输入手机号" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;font-size:14px;background:var(--bg);color:var(--text);box-sizing:border-box"></div>'+
  '<div class="form-group" style="margin-bottom:10px"><label style="font-size:13px;color:var(--text2);display:block;margin-bottom:4px">收货地址</label><textarea id="ch-addr" class="form-textarea" placeholder="请输入详细地址" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;font-size:14px;background:var(--bg);color:var(--text);box-sizing:border-box;resize:none;height:60px"></textarea></div>'+
  '<div class="form-group"><label style="font-size:13px;color:var(--text2);display:block;margin-bottom:4px">备注</label><input id="ch-remark" class="form-input" placeholder="选填 如：请放门卫处" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;font-size:14px;background:var(--bg);color:var(--text);box-sizing:border-box"></div></div>'+
  '<button class="btn btn-primary btn-block btn-lg" onclick="submitOrder()" style="width:100%;padding:14px;border-radius:12px;font-size:16px;background:linear-gradient(135deg,var(--green),#2d8a4e);color:#fff;border:none;cursor:pointer">确认下单</button></div>';
document.getElementById('app').innerHTML=h+b;}
async function submitOrder(){try{var name=document.getElementById('ch-name').value;var phone=document.getElementById('ch-phone').value;var addr=document.getElementById('ch-addr').value;if(!name||!phone||!addr){toast('请填写完整信息','error');return;}var items=await api('/api/shop/cart');if(!items||!items.length){toast('购物车为空','error');return;}await api('/api/shop/orders/create',{method:'POST',body:JSON.stringify({items:items.map(function(x){return{product_id:x.product_id,quantity:x.quantity};}),consignee:name,phone:phone,address:addr,remark:document.getElementById('ch-remark').value||''})});for(var i=0;i<items.length;i++){await api('/api/shop/cart/remove',{method:'POST',body:JSON.stringify({id:items[i].id})});}toast('下单成功！');navigate('shop');}catch(e){toast(e.message,'error');}}
async function addToCart(p){try{await api('/api/shop/cart/add',{method:'POST',body:JSON.stringify({product_id:p,quantity:1})});toast('已加入购物车');}catch(e){toast(e.message,'error');}}
// ################################################################
// tea_frontend.js - 茶养模块前端渲染函数 (修复版)
// 注意：所有 HTML onclick 中的字符串参数必须用 &apos; 或 encodeURIComponent
// ################################################################

// ═══════════════════════════════════════════════════
// 茶养首页
// ═══════════════════════════════════════════════════
function startBrew(teaId, teaName, temp, minutes) {
  var h = hd('\u2615 \u51B2\u6CE1\u4E2D', 'tea');
  var b = '<div class="page tea-brew-page">' +
    '<div style="font-size:72px;margin-bottom:16px">\uD83C\uDF75</div>' +
    '<div class="tea-brew-name">' + esc(teaName) + '</div>' +
    '<div class="tea-brew-temp">\u6C34\u6E29 ' + temp + '\u00B0C \u00B7 \u6D78\u6CE1 ' + minutes + ' \u5206\u949F</div>' +
    '<div class="tea-brew-timer" id="brew-timer">' + minutes + ':00</div>' +
    '<div class="tea-brew-progress"><div class="tea-brew-bar" id="brew-bar" style="width:0%"></div></div>' +
    '<div class="tea-brew-status" id="brew-status">\u51C6\u5907\u5F00\u59CB...</div>' +
    '<button class="btn btn-primary btn-lg" onclick="startBrewTimer(' + minutes + ')" id="brew-start-btn">\u5F00\u59CB\u8BA1\u65F6</button>' +
    '</div>';
  document.getElementById('app').innerHTML = h + b;
}
function startBrewTimer(minutes) {
  var totalSeconds = minutes * 60;
  var elapsed = 0;
  var btn = document.getElementById('brew-start-btn');
  if (btn) btn.style.display = 'none';
  document.getElementById('brew-status').textContent = '\u51B2\u6CE1\u4E2D...';
  window._brewInterval = setInterval(function() {
    elapsed++;
    var remaining = totalSeconds - elapsed;
    var m = Math.floor(remaining / 60);
    var s = remaining % 60;
    document.getElementById('brew-timer').textContent = (m<10?'0':'') + m + ':' + (s<10?'0':'') + s;
    document.getElementById('brew-bar').style.width = (elapsed / totalSeconds * 100) + '%';
    if (remaining <= 0) {
      clearInterval(window._brewInterval);
      document.getElementById('brew-status').innerHTML = '\uD83C\uDF89 \u8336\u5DF2\u6CE1\u597D\uFF01<br><button class="btn btn-primary mt-4" onclick="navigate(\'tea\')">\u8FD4\u56DE\u8336\u517B</button>';
      try { api('/api/tea/record', {method:'POST',body:JSON.stringify({tea_id:0,score:5})}); } catch(e) {}
    }
  }, 1000);
}

async function renderTea() {
  console.log('[renderTea] start');
  updateThemeIcon();
  var isGuest = !state.user;
  var h = '<div class="header"><h1><i class="fa-solid fa-leaf"></i> 茶养</h1><p>体质茶饮 · 每日养身</p></div>';
  document.getElementById("app").innerHTML = h + '<div class="page" id="tea-page"><div class="loading"><div class="spinner"></div></div></div>';
  try {
    console.log('[renderTea] try block entered');
    var data;
    try { data = await api("/api/tea/today"); } catch(e) { data = { constitution: "未测评", user: { nickname: "茶友" }, teas: [], season: "" }; }
    var con = data.constitution || "未测评";
    var conColors = { 气虚质: "#FF9800", 阳虚质: "#2196F3", 阴虚质: "#E91E63", 痰湿质: "#795548", 湿热质: "#F44336", 血瘀质: "#9C27B0", 气郁质: "#607D8B", 特禀质: "#00BCD4", 平和质: "#4CAF50" };
    var conColor = conColors[con] || "#999";
    var tea = data.teas && data.teas.length > 0 ? data.teas[0] : null;
    var html = "";

    // 第一屏：今日茶养卡片
    html += '<div class="tea-banner" style="background:linear-gradient(135deg,#2E7D32,' + conColor + '80)">';
    html += '<div class="tea-banner-top"><span>' + esc(data.user.nickname || "茶友") + '</span><span class="tea-con-badge" style="background:' + conColor + '">' + con + '</span></div>';
    if (tea) {
      var brewOnclick = "startBrew(" + tea.id + "," + JSON.stringify(tea.name) + "," + tea.temperature + "," + tea.steep_minutes + ")";
      html += '<div class="tea-recommend">';
      html += '<div class="tea-big-icon">🍵</div>';
      html += '<div class="tea-rec-name">' + esc(tea.name) + '</div>';
      html += '<div class="tea-rec-reason">' + esc(tea.benefits || "") + '</div>';
      html += '<div class="tea-rec-params">水温' + tea.temperature + "°C · 浸泡" + tea.steep_minutes + "分钟 · 每日" + tea.daily_cups + "杯</div>";
      html += '<button class="tea-brew-btn" onclick="' + brewOnclick + '">☕ 开始冲泡</button>';
      html += "</div>";
    } else {
      html += "<div class=tea-recommend><div style=font-size:40px;margin-bottom:8px>🍵</div><div style=font-size:14px;color:rgba(255,255,255,0.9)>先进行体质测评获取专属茶单</div><button class=tea-brew-btn onclick=navigate(&apos;constitution&apos;)>去测评</button></div>";
    }
    html += '<div class="tea-banner-footer">基于节气·' + (data.season || "") + " · 体质综合推荐</div>";
    html += "</div>";

    // 第二屏：十二时辰
    html += '<div class="tea-section"><div class="tea-section-title"><i class="fa-solid fa-clock"></i> 十二时辰饮茶</div><div class="tea-time-scroll" id="tea-time-scroll">';
    var timeRules = await api("/api/tea/time-rules", {silent:true});
    var hourNow = new Date().getHours();
    if (!timeRules) timeRules = []; for (var i = 0; i < timeRules.length; i++) {
      var tr = timeRules[i];
      var isActive = hourNow >= tr.start_hour && hourNow < tr.end_hour;
      var isPast = hourNow > tr.end_hour;
      html += '<div class="tea-time-item' + (isActive ? " active" : "") + (isPast ? " done" : "") + '" onclick="showTimeRule(' + tr.id + ')">';
      html += '<div class="tea-time-icon">' + (tr.icon || "🫖") + "</div>";
      html += '<div class="tea-time-label">' + esc(tr.label) + "</div>";
      html += '<div class="tea-time-hour">' + tr.start_hour + "-" + tr.end_hour + "点</div>";
      html += '<div class="tea-time-status">' + (isPast ? "✅" : isActive ? "⏳" : "⏳") + "</div></div>";
    }
    html += "</div></div>";

    // 第三屏：节气
    var seasonal = await api("/api/tea/seasonal", {silent:true});
    if (seasonal && seasonal.current_term) {
      var ct = seasonal.current_term;
      html += '<div class="tea-section"><div class="tea-section-title"><i class="fa-solid fa-cloud-sun"></i> 节气养生</div>';
      html += '<div class="tea-season-card" onclick="navigate(&apos;solar&apos;)">';
      html += '<div class="tea-season-name">' + esc(ct.name) + "</div>";
      html += '<div class="tea-season-desc">' + esc(ct.description) + "</div>";
      html += '<div class="tea-season-tip">' + esc(ct.wellness_tips || "") + "</div>";
      html += '<div class="tea-season-food">推荐食材：' + esc(ct.food_recommendations || "") + "</div></div>";
      if (seasonal.teas && seasonal.teas.length > 0) {
        html += '<div class="tea-season-teas"><div style="font-size:12px;color:var(--text2);margin-bottom:6px">节气茶饮推荐</div>';
        for (var si = 0; si < seasonal.teas.length; si++) {
          html += '<div class="tea-mini-item" onclick="alert(&apos;' + esc(seasonal.teas[si].name) + "&apos;)\">" + esc(seasonal.teas[si].name) + "</div>";
        }
        html += "</div>";
      }
      html += "</div>";
    }

    // 第四屏：茶养数据
    var recordsData;
    try { recordsData = await api("/api/tea/records?days=30"); } catch(e) { recordsData = { stats: { total: 0, days: 0, avg_score: 0 }, continuous_days: 0 }; }
    var stats = recordsData.stats || { total: 0, days: 0, avg_score: 0 };
    var cDays = recordsData.continuous_days || 0;
    if (isGuest) {
      html += '<div class="tea-section"><div class="tea-section-title"><i class="fa-solid fa-chart-simple"></i> 我的茶养</div>';
      html += '<div style="padding:30px;text-align:center;color:var(--text2)"><div style="font-size:40px;margin-bottom:10px">🔒</div><div>登录后查看茶养数据</div><button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="navigate(\'login\')">去登录</button></div></div>';
    } else {
    html += '<div class="tea-section"><div class="tea-section-title"><i class="fa-solid fa-chart-simple"></i> 我的茶养</div>';
    html += '<div class="tea-stats-row">';
    html += '<div class="tea-stat-card"><div class="tea-stat-num">' + (stats.total || 0) + '</div><div class="tea-stat-label">总杯数</div></div>';
    html += '<div class="tea-stat-card"><div class="tea-stat-num">' + (stats.days || 0) + '</div><div class="tea-stat-label">打卡天数</div></div>';
    html += '<div class="tea-stat-card"><div class="tea-stat-num">' + cDays + '</div><div class="tea-stat-label">连续天数</div></div>';
    html += '<div class="tea-stat-card"><div class="tea-stat-num">' + (stats.avg_score ? stats.avg_score.toFixed(1) : "-") + '</div><div class="tea-stat-label">平均评分</div></div></div>';
    html += await renderBadges();
    html += "</div>";
    }

    // 第五屏：养生知识
    var dailyTip = await api("/api/tea/daily-tip", {silent:true});
    html += '<div class="tea-section"><div class="tea-section-title"><i class="fa-solid fa-book"></i> 养生知识</div>';
    html += '<div class="tea-knowledge-grid">';
    html += '<div class="tea-kn-item" onclick="alert(&apos;即将上线&apos;)"><span class="tea-kn-icon">👅</span><span>舌诊自测</span></div>';
    html += '<div class="tea-kn-item" onclick="alert(&apos;即将上线&apos;)"><span class="tea-kn-icon">💆</span><span>穴位按摩</span></div>';
    html += '<div class="tea-kn-item" onclick="showTeaWiki()"><span class="tea-kn-icon">📚</span><span>茶疗百科</span></div>';
    html += '<div class="tea-kn-item" onclick="navigate(&apos;recipes&apos;)"><span class="tea-kn-icon">🥗</span><span>食疗药膳</span></div></div>';
    if (dailyTip) {
      html += '<div class="tea-daily-tip" onclick="alert(&apos;' + esc(dailyTip.content) + "&apos;)\">";
      html += '<div class="tea-tip-tag">每日一读</div>';
      html += '<div class="tea-tip-title">' + esc(dailyTip.title) + "</div>";
      html += '<div class="tea-tip-category">' + esc(dailyTip.category) + "</div></div>";
    }
    html += "</div>";

    document.getElementById("tea-page").innerHTML = html;

  } catch (e) {
    console.error('[renderTea] error:', e.message, e.stack);
    document.getElementById("tea-page").innerHTML = '<div style="padding:40px;text-align:center;color:var(--red)">加载失败: ' + esc(e.message) + '<br><button class="btn btn-sm btn-outline mt-2" onclick="renderTea()">重试</button></div>';
  }
}

async function renderBadges() {
  var html = '';
  if (!state.user) return html;
  try {
    var badges = await api('/api/tea/badges');
    if (!badges || !badges.length) return '';
    html += '<div class="tea-section"><div class="tea-section-title"><i class="fa-solid fa-award"></i> 我的徽章</div><div style="display:flex;flex-wrap:wrap;gap:8px">';
    for (var i = 0; i < badges.length; i++) {
      var b = badges[i];
      html += '<div style="background:var(--card);border-radius:12px;padding:10px 14px;display:flex;align-items:center;gap:8px;font-size:13px">';
      html += '<span style="font-size:20px">' + (b.icon || '🏅') + '</span>';
      html += '<span>' + esc(b.name || '') + '</span>';
      html += '</div>';
    }
    html += '</div></div>';
  } catch (e) {}
  return html;
}

// 缺失函数补全
function showTimeRule(id) {
  alert('时辰饮茶规则详情 ID: ' + id + '\n\n不同时辰饮用不同的茶，顺应人体生物节律。\n晨起宜饮温阳茶，午后宜饮清热茶，晚间宜饮安神茶。');
}

window.setMood = function(n) {
  window._mood = n;
  var btns = document.querySelectorAll('#mood-picker button');
  for (var i = 0; i < btns.length; i++) {
    btns[i].classList.toggle('selected', parseInt(btns[i].dataset.mood) === n);
  }
};

window.showTeaWiki = function() {
  var wikis = [
    {name:'绿茶',icon:'🍃',desc:'不发酵茶，性寒，清热解毒，富含茶多酚。适宜湿热质。'},
    {name:'红茶',icon:'☕',desc:'全发酵茶，性温，温胃散寒。适宜阳虚质、气虚质。'},
    {name:'乌龙茶',icon:'🍵',desc:'半发酵茶，性平，消脂解腻。适宜痰湿质。'},
    {name:'普洱茶',icon:'🫖',desc:'后发酵茶，性温，消食化滞。适宜痰湿质、气郁质。'},
    {name:'白茶',icon:'🌸',desc:'微发酵茶，性凉，清热降火。适宜阴虚质、湿热质。'},
    {name:'花茶',icon:'🌹',desc:'花+茶拼配，理气解郁。适宜气郁质。'},
    {name:'黄茶',icon:'🌾',desc:'轻发酵茶，性微寒，健脾润肺。适宜脾胃虚弱者。'},
    {name:'黑茶',icon:'🫘',desc:'后发酵茶，性温，消脂去腻。适宜痰湿质。'}
  ];
  var h = '<div class="header"><h1><i class="fa-solid fa-book"></i> 茶疗百科</h1></div>';
  var html = '<div class="page">';
  for (var i = 0; i < wikis.length; i++) {
    var w = wikis[i];
    html += '<div class="card" style="display:flex;gap:12px;align-items:center">' +
      '<div style="font-size:36px;flex-shrink:0">' + w.icon + '</div>' +
      '<div><div style="font-weight:600;font-size:15px">' + w.name + '</div>' +
      '<div style="font-size:12px;color:var(--text2);margin-top:4px;line-height:1.5">' + w.desc + '</div></div></div>';
  }
  html += '</div>';
  document.getElementById('app').innerHTML = h + html;
};

window.startBrew = async function(teaId, teaName, temp, steep) {
  var popup = document.getElementById('tea-brew-popup') || (function() {
    var e = document.createElement('div');
    e.id = 'tea-brew-popup';
    e.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9998;display:none;align-items:center;justify-content:center';
    document.body.appendChild(e);
    return e;
  })();
  popup.innerHTML = '<div style="background:var(--card);padding:32px 24px;border-radius:20px;width:88%;max-width:320px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.3)">' +
    '<div style="font-size:56px;margin-bottom:12px">☕</div>' +
    '<div style="font-size:18px;font-weight:600;margin-bottom:8px">' + esc(teaName) + '</div>' +
    '<div style="font-size:13px;color:var(--text2);margin-bottom:16px">水温 ' + temp + '°C · 浸泡 ' + steep + ' 分钟</div>' +
    '<div id="tea-timer-display" style="font-size:36px;font-weight:700;color:var(--green);margin-bottom:16px">00:00</div>' +
    '<div style="font-size:12px;color:var(--text2);margin-bottom:20px" id="tea-timer-tip">冲泡计时中...</div>' +
    '<button onclick="document.getElementById(\'tea-brew-popup\').style.display=\'none\';if(window._teaTimer)clearInterval(window._teaTimer);" class="btn btn-sm btn-outline" style="padding:10px 24px">关闭</button>' +
    '<button onclick="finishBrew(' + teaId + ')" class="btn btn-sm" style="margin-left:10px;background:var(--green);color:#fff;border:none;padding:10px 24px;border-radius:8px">打卡完成</button></div>';
  popup.style.display = 'flex';
  var elapsed = 0;
  if (window._teaTimer) clearInterval(window._teaTimer);
  window._teaTimer = setInterval(function() {
    elapsed++;
    var mins = Math.floor(elapsed / 60);
    var secs = elapsed % 60;
    var disp = document.getElementById('tea-timer-display');
    var tip = document.getElementById('tea-timer-tip');
    if (disp) disp.textContent = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
    if (tip && elapsed >= steep * 60) tip.textContent = '⏰ 可以品饮啦！';
  }, 1000);
};

window.finishBrew = async function(teaId) {
  if (window._teaTimer) { clearInterval(window._teaTimer); window._teaTimer = null; }
  var popup = document.getElementById('tea-brew-popup');
  if (popup) popup.style.display = 'none';
  try {
    await api('/api/tea/brew', { method: 'POST', body: JSON.stringify({ tea_id: teaId }) });
    toast('打卡成功！🍵');
  } catch(e) { toast(e.message, 'error'); }
};

window.showTimeRule = async function(id) {
  try {
    var rule = await api('/api/tea/time-rules/' + id);
    var popup = document.getElementById('popup') || (function() {
      var e = document.createElement('div');
      e.id = 'popup';
      e.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center';
      document.body.appendChild(e);
      return e;
    })();
    popup.innerHTML = '<div style="background:var(--card);padding:24px;border-radius:16px;width:90%;max-width:340px;box-shadow:0 8px 32px rgba(0,0,0,0.2)">' +
      '<h3 style="margin:0 0 12px">' + esc(rule.label || '') + ' 饮茶指南</h3>' +
      '<div style="font-size:13px;line-height:1.8;color:var(--text2);margin-bottom:12px">' + esc(rule.description || '') + '</div>' +
      '<div style="font-size:14px;font-weight:600;color:var(--green);margin-bottom:4px">推荐茶类</div>' +
      '<div style="font-size:13px;margin-bottom:12px">' + esc(rule.recommended_tea_type || '') + '</div>' +
      '<div style="font-size:14px;font-weight:600;color:var(--green);margin-bottom:4px">适宜时辰</div>' +
      '<div style="font-size:13px;margin-bottom:12px">' + rule.start_hour + ':00 - ' + rule.end_hour + ':00</div>' +
      '<button onclick="document.getElementById(\'popup\').remove()" class="btn btn-sm btn-block" style="background:var(--green);color:#fff;border:none;padding:10px;border-radius:8px">关闭</button></div>';
    popup.style.display = 'flex';
  } catch(e) { toast(e.message, 'error'); }
};

window.showTeaWiki = function() {
  var popup = document.getElementById('popup') || (function() {
    var e = document.createElement('div');
    e.id = 'popup';
    e.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center';
    document.body.appendChild(e);
    return e;
  })();
  popup.innerHTML = '<div style="background:var(--card);padding:24px;border-radius:16px;width:92%;max-width:380px;max-height:80vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.2)">' +
    '<h3 style="margin:0 0 12px">📚 茶疗百科</h3>' +
    '<div style="font-size:13px;line-height:1.8;color:var(--text2)">' +
    '<p><strong style="color:var(--green)">绿茶</strong>：清热解毒、降脂减肥。适合湿热质、平和质。</p>' +
    '<p><strong style="color:var(--green)">红茶</strong>：暖胃驱寒、温补阳气。适合阳虚质、气虚质。</p>' +
    '<p><strong style="color:var(--green)">乌龙茶</strong>：消食解腻、减肥降脂。适合痰湿质、血瘀质。</p>' +
    '<p><strong style="color:var(--green)">普洱茶</strong>：降脂护胃、促进代谢。适合痰湿质、湿热质。</p>' +
    '<p><strong style="color:var(--green)">白茶</strong>：清热润肺、消炎降火。适合阴虚质。</p>' +
    '<p><strong style="color:var(--green)">花草茶</strong>：疏肝解郁、养颜安神。适合气郁质。</p></div>' +
    '<button onclick="document.getElementById(\'popup\').remove()" class="btn btn-sm" style="width:100%;margin-top:16px;background:var(--green);color:#fff;border:none;padding:10px;border-radius:8px">关闭</button></div>';
  popup.style.display = 'flex';
};


// ========== 医生上线模块（前端）==========

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
    var doctors = await api('/api/tcm/doctors');
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
  if (!doctors) doctors = []; var filtered = doctors.filter(function(d) {
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
      stars += j < Math.round(d.rating || 0) ? '*' : ' ';
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

// 2. 医生详情页 + 预约
async function renderDoctorDetail() {
  var doctorId = state.pageParams.doctorId;
  if (!doctorId) { navigate('doctors'); return; }
  updateThemeIcon();
  var h = '<div class="header"><h1><i class="fa-solid fa-user-doctor"></i> 医生详情</h1><div style="margin-top:4px;font-size:13px;opacity:0.8;cursor:pointer" onclick="navigate(\'doctors\')">← 返回列表</div></div>';
  document.getElementById('app').innerHTML = h + '<div class="page" id="doctor-detail-page"><div class="loading"><div class="spinner"></div><p>加载中...</p></div></div>';

  try {
    var doctor = await api('/api/tcm/doctors/' + doctorId);
    window._currentDoctor = doctor;
    var stars = '';
    for (var i = 0; i < 5; i++) {
      stars += i < Math.round(doctor.rating || 0) ? '*' : ' ';
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

// 开始问诊（弹窗填写症状）
window.startConsult = async function(doctorId, doctorName, doctorTitle, price) {
  if (!state.user) {
    toast('请先登录', 'error');
    setTimeout(function() { navigate('login'); }, 1500);
    return;
  }

  var popup = document.getElementById('popup') || (function() {
    var e = document.createElement('div');
    e.id = 'popup';
    e.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center';
    document.body.appendChild(e);
    return e;
  })();

  popup.innerHTML = '<div style="background:var(--card);padding:24px;border-radius:16px;width:90%;max-width:340px;box-shadow:0 8px 32px rgba(0,0,0,0.2)">' +
    '<h3 style="margin:0 0 16px">问诊挂号</h3>' +
    '<div style="font-size:13px;color:var(--text2);margin-bottom:12px">医生：' + esc(doctorName) + ' ' + esc(doctorTitle) + '<br>费用：¥' + (price || 0) + '（图文咨询）</div>' +
    '<textarea id="symptom-input" rows="4" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:14px;box-sizing:border-box;background:var(--bg);color:var(--text);resize:none" placeholder="请描述你的主要症状或想咨询的问题..."></textarea>' +
    '<div style="display:flex;gap:8px;margin-top:16px">' +
    '<button onclick="document.getElementById(\'popup\').remove()" class="btn btn-sm btn-outline" style="flex:1">取消</button>' +
    '<button onclick="submitConsult(' + doctorId + ')" class="btn btn-sm" style="flex:1;background:var(--green);color:#fff;border:none;padding:10px;border-radius:8px">提交挂号</button>' +
    '</div></div>';
  popup.style.display = 'flex';
};

// 提交问诊
window.submitConsult = async function(doctorId) {
  var symptom = document.getElementById('symptom-input').value.trim();
  if (!symptom) { toast('请描述你的症状', 'error'); return; }
  var popup = document.getElementById('popup');
  if (popup) popup.remove();
  try {
    var res = await api('/api/tcm/consultations', {
      method: 'POST',
      body: JSON.stringify({ doctor_id: doctorId, symptoms: symptom, type: 'text' })
    });
    if (res && res.id) {
      toast('挂号成功！等待医生接诊');
      navigate('consultation', { consultId: res.id, doctor_id: doctorId });
    } else { toast('挂号失败，请重试', 'error'); }
  } catch(e) { toast(e.message, 'error'); }
};

// 3. 问诊聊天页面
async function renderConsultation() {
  updateThemeIcon();
  var consultId = state.pageParams.consultId;
  var doctorId = state.pageParams.doctor_id;
  if (!consultId) { renderDoctors(); return; }

  var h = '<div class="header"><h1><i class="fa-solid fa-comment-medical"></i> 问诊中</h1></div>';
  var b = '<div class="page" style="display:flex;flex-direction:column;height:calc(100vh - 140px)">' +
    '<div id="msg-area" style="flex:1;overflow-y:auto;padding:12px 16px"></div>' +
    '<div style="display:flex;gap:8px;padding:10px 16px;border-top:1px solid var(--border);background:var(--card)">' +
    '<input id="msg-input" style="flex:1;padding:10px 14px;border:1px solid var(--border);border-radius:20px;font-size:14px;background:var(--bg);color:var(--text)" placeholder="输入消息..." onkeydown="if(event.key==\'Enter\')sendConsultMessage()">' +
    '<button onclick="sendConsultMessage()" class="btn btn-sm" style="background:var(--green);color:#fff;border:none;border-radius:50%;width:40px;height:40px;flex-shrink:0"><i class="fa-solid fa-paper-plane"></i></button>' +
    '</div></div>';
  document.getElementById('app').innerHTML = h + b;

  window._consultId = consultId;
  loadMessages();
  startMessagePolling();
}

async function loadMessages() {
  if (!window._consultId) return;
  try {
    var msgs = await api('/api/tcm/messages/' + window._consultId);
    var area = document.getElementById('msg-area');
    if (area && msgs && msgs.length) {
      var html = '';
      var gotPrescription = false;
      for (var i = 0; i < msgs.length; i++) {
        var m = msgs[i];
        if (m.msg_type === 'system') {
          html += '<div style="text-align:center;margin:8px 0;font-size:12px;color:var(--text2)">' + esc(m.content || '') + '</div>';
          if (m.content && m.content.indexOf('处方') >= 0) gotPrescription = true;
        } else if (m.sender_type === 'user') {
          html += '<div style="text-align:right;margin:6px 0"><span style="background:var(--green);color:#fff;padding:8px 14px;border-radius:12px 12px 4px 12px;display:inline-block;max-width:75%;font-size:14px;line-height:1.5">' + esc(m.content || '') + '</span></div>';
        } else if (m.sender_type === 'doctor') {
          html += '<div style="text-align:left;margin:6px 0"><span style="background:var(--card);padding:8px 14px;border-radius:12px 12px 12px 4px;display:inline-block;max-width:75%;font-size:14px;line-height:1.5;border:1px solid var(--border)">' + esc(m.content || '') + '</span></div>';
        }
      }
      if (area.innerHTML !== html) { area.innerHTML = html; area.scrollTop = area.scrollHeight; }
      if (gotPrescription) {
        area.innerHTML += '<div style="text-align:center;margin:12px 0"><button onclick="showPrescription(' + window._consultId + ')" class="btn btn-sm" style="background:var(--green);color:#fff;border:none;padding:8px 20px;border-radius:8px">查看处方</button></div>';
      }
    }
  } catch(e) { console.error('加载消息失败', e); }
}

window.sendConsultMessage = async function() {
  var input = document.getElementById('msg-input');
  var content = input.value.trim();
  if (!content || !window._consultId) return;
  input.value = '';
  try {
    await api('/api/tcm/messages', {
      method: 'POST',
      body: JSON.stringify({ consultation_id: window._consultId, content: content })
    });
    await loadMessages();
  } catch(e) { toast(e.message, 'error'); }
};

function startMessagePolling() {
  if (window._msgTimer) clearInterval(window._msgTimer);
  window._msgTimer = setInterval(function() {
    if (window._consultId) { loadMessages(); } else { clearInterval(window._msgTimer); }
  }, 3000);
}

window.showPrescription = async function(cid) {
  try {
    var pres = await api('/api/tcm/prescriptions/' + cid);
    if (!pres || !pres.id) { toast('暂无处方', 'error'); return; }
    var popup = document.getElementById('popup') || (function() {
      var e = document.createElement('div');
      e.id = 'popup';
      e.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center';
      document.body.appendChild(e);
      return e;
    })();
    var herbs = [];
    try { herbs = JSON.parse(pres.prescription_text); } catch(e) { herbs = []; }
    var herbHtml = '';
    if (Array.isArray(herbs)) {
      herbHtml = '<table style="width:100%;border-collapse:collapse;margin:10px 0"><tr><th style="border:1px solid var(--border);padding:6px">药材</th><th style="border:1px solid var(--border);padding:6px">剂量</th></tr>';
      for (var i = 0; i < herbs.length; i++) {
        herbHtml += '<tr><td style="border:1px solid var(--border);padding:6px">' + esc(herbs[i].name || '') + '</td><td style="border:1px solid var(--border);padding:6px">' + esc(herbs[i].dosage || '') + '</td></tr>';
      }
      herbHtml += '</table>';
    }
    popup.innerHTML = '<div style="background:var(--card);padding:24px;border-radius:16px;width:90%;max-width:400px;max-height:80vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.2)">' +
      '<h3 style="margin:0 0 12px">电子处方</h3>' +
      '<div style="font-size:13px;color:var(--text2);margin-bottom:8px">医生：' + esc(pres.doctor_name || '') + '<br>日期：' + (pres.created_at || '').slice(0, 10) + '</div>' +
      herbHtml +
      '<div style="font-size:13px;line-height:1.6;margin-top:8px">' + esc(pres.notes || '') + '</div>' +
      '<button onclick="document.getElementById(\'popup\').remove()" class="btn btn-sm btn-block mt-2" style="background:var(--green);color:#fff;border:none;padding:10px;border-radius:8px">关闭</button></div>';
    popup.style.display = 'flex';
  } catch(e) { toast(e.message, 'error'); }
};

// 4. 我的问诊列表
async function renderMyConsultations() {
  if (!state.user) {
    toast('请先登录', 'error');
    setTimeout(function() { navigate('login'); }, 1500);
    return;
  }
  updateThemeIcon();
  var h = '<div class="header"><h1><i class="fa-solid fa-clock-rotate-left"></i> 我的问诊</h1></div>';
  var b = '<div class="page" id="consultations-list"><div class="loading"><div class="spinner"></div><p>加载中...</p></div></div>';
  document.getElementById('app').innerHTML = h + b;

  try {
    var consultations = await api('/api/tcm/consultations');
    var html = '';
    if (!consultations || !consultations.length) {
      html = '<div style="padding:60px 20px;text-align:center;color:var(--text2)"><div style="font-size:48px;margin-bottom:12px"></div><div>暂无问诊记录</div><button onclick="navigate(\'doctors\')" class="btn btn-primary mt-4">去找医生</button></div>';
    } else {
      var statusMap = { pending: '待接诊', active: '进行中', completed: '已完成', cancelled: '已取消' };
      var typeMap = { text: '图文咨询', video: '视频问诊' };
      for (var i = 0; i < consultations.length; i++) {
        var c = consultations[i];
        var statusClass = c.status === 'active' ? 'status-active' : c.status === 'completed' ? 'status-completed' : 'status-pending';
        html += '<div class="card" style="cursor:pointer;margin-bottom:10px" onclick="navigate(\'consultation\',{consultId:' + c.id + ',doctor_id:' + (c.doctor_id || 0) + '})">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
          '<span style="font-weight:600;font-size:15px">' + esc(c.doctor_name || '医生') + '</span>' +
          '<span class="' + statusClass + '" style="font-size:12px;padding:3px 8px;border-radius:6px">' + (statusMap[c.status] || c.status) + '</span>' +
          '</div>' +
          '<div style="font-size:13px;color:var(--text2);margin-bottom:4px">' + (typeMap[c.type] || c.type) + '</div>' +
          '<div style="font-size:12px;color:var(--text2)">' + (c.created_at || '').slice(0, 16).replace('T', ' ') + '</div>' +
          '</div>';
      }
    }
    document.getElementById('consultations-list').innerHTML = html;
  } catch(e) {
    document.getElementById('consultations-list').innerHTML = '<div style="padding:40px;text-align:center;color:var(--red)">加载失败<br><button class="btn btn-sm btn-outline mt-2" onclick="renderMyConsultations()">重试</button></div>';
  }
}


// ========== 营养师上门模块（前端）==========

// 5. 营养师列表页
async function renderNutritionists(filter) {
  updateThemeIcon();
  var isGuest = !state.user;
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
    var nutritionists = await api('/api/nutritionists');
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
      stars += j < Math.round(n.rating || 0) ? '*' : ' ';
    }
    html += '<div class="card" style="cursor:pointer;margin-bottom:10px" onclick="navigate(\'nutritionist-detail\',' + JSON.stringify({ id: n.id }) + ')">' +
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

// 6. 营养师详情页 + 预约
async function renderNutritionistDetail() {
  var nutritionistId = state.pageParams.id;
  if (!nutritionistId) { navigate('nutritionists'); return; }
  updateThemeIcon();
  var h = '<div class="header"><h1><i class="fa-solid fa-apple-whole"></i> 营养师详情</h1><div style="margin-top:4px;font-size:13px;opacity:0.8;cursor:pointer" onclick="navigate(\'nutritionists\')">← 返回列表</div></div>';
  document.getElementById('app').innerHTML = h + '<div class="page" id="nutritionist-detail-page"><div class="loading"><div class="spinner"></div><p>加载中...</p></div></div>';

  try {
    var nutritionist = await api('/api/nutritionists/' + nutritionistId);
    window._currentNutritionist = nutritionist;
    var stars = '';
    for (var i = 0; i < 5; i++) {
      stars += i < Math.round(nutritionist.rating || 0) ? '*' : ' ';
    }

    var services = nutritionist.services || [];
    var servicesHtml = '';
    for (var j = 0; j < services.length; j++) {
      var s = services[j];
      servicesHtml += '<div class="card" style="margin-bottom:8px">' +
        '<div style="font-weight:600;font-size:15px">' + esc(s.title || '') + ' <span style="font-size:12px;color:var(--text2)">' + (s.service_type === 'online' ? '线上咨询' : '上门服务') + '</span></div>' +
        '<div style="font-size:13px;color:var(--text2);margin:4px 0">' + esc(s.description || '') + '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">' +
        '<span style="font-size:13px;color:var(--text2)">时长: ' + (s.duration_minutes || 0) + '分钟</span>' +
        '<span style="font-size:16px;font-weight:700;color:var(--green)">¥' + (s.price || 0) + '</span></div>' +
        '<button onclick="bookNutritionist(' + nutritionist.id + ',' + s.id + ',\'' + esc(s.service_type || '') + '\',' + (s.price || 0) + ')" class="btn btn-primary btn-block mt-2" style="border-radius:8px">预约此服务</button>' +
        '</div>';
    }

    var html = '<div class="page" id="nutritionist-detail-page" style="padding-bottom:100px">' +
      '<div class="card" style="text-align:center;padding:20px">' +
      '<div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--green),#2d8a4e);display:flex;align-items:center;justify-content:center;color:#fff;font-size:36px;font-weight:bold;margin:0 auto 12px">' + esc(nutritionist.name ? nutritionist.name[0] : '?') + '</div>' +
      '<div style="font-size:20px;font-weight:700;margin-bottom:4px">' + esc(nutritionist.name || '') + '</div>' +
      '<div style="font-size:14px;color:var(--green);margin-bottom:8px">' + esc(nutritionist.title || '') + ' · ' + esc(nutritionist.hospital || '') + '</div>' +
      '<div style="font-size:13px;color:var(--text2);margin-bottom:4px">擅长: ' + esc(nutritionist.specialty || '') + '</div>' +
      '<div style="font-size:13px;color:var(--text2);margin-bottom:8px">' + esc(nutritionist.introduction || '') + '</div>' +
      '<div style="display:flex;justify-content:center;gap:16px;font-size:13px;color:var(--text2)">' +
      '<span>' + stars + ' ' + (nutritionist.rating || 0) + '分</span>' +
      '<span>' + (nutritionist.service_count || 0) + '次服务</span>' +
      '</div></div>' +
      '<div class="card-title" style="padding:0 16px">服务项目</div>' +
      '<div style="padding:0 16px">' + (servicesHtml || '<div style="padding:20px;text-align:center;color:var(--text2)">暂无服务项目</div>') + '</div>' +
      '</div>';

    document.getElementById('nutritionist-detail-page').outerHTML = html;
  } catch(e) {
    document.getElementById('nutritionist-detail-page').innerHTML = '<div style="padding:40px;text-align:center;color:var(--red)">加载失败<br><button class="btn btn-sm btn-outline mt-2" onclick="renderNutritionistDetail()">重试</button></div>';
  }
}

window.bookNutritionist = async function(nutritionistId, serviceId, serviceType, price) {
  if (!state.user) {
    toast('请先登录', 'error');
    setTimeout(function() { navigate('login'); }, 1500);
    return;
  }

  var popup = document.getElementById('popup') || (function() {
    var e = document.createElement('div');
    e.id = 'popup';
    e.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center';
    document.body.appendChild(e);
    return e;
  })();

  var isVisit = serviceType === 'visit';
  popup.innerHTML = '<div style="background:var(--card);padding:24px;border-radius:16px;width:90%;max-width:360px;box-shadow:0 8px 32px rgba(0,0,0,0.2)">' +
    '<h3 style="margin:0 0 16px">确认预约</h3>' +
    '<div style="font-size:13px;color:var(--text2);margin-bottom:12px">服务类型：' + (isVisit ? '上门服务' : '线上咨询') + '<br>费用：¥' + price + '</div>' +
    '<div style="font-size:13px;margin-bottom:8px">预约日期</div>' +
    '<input id="booking-date" type="date" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:14px;box-sizing:border-box;margin-bottom:12px">' +
    '<div style="font-size:13px;margin-bottom:8px">预约时间</div>' +
    '<input id="booking-time" type="time" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:14px;box-sizing:border-box;margin-bottom:12px">' +
    (isVisit ? '<div style="font-size:13px;margin-bottom:8px">上门地址</div><input id="booking-address" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:14px;box-sizing:border-box;margin-bottom:12px" placeholder="请输入详细地址"></input>' : '') +
    '<div style="font-size:13px;margin-bottom:8px">联系电话</div>' +
    '<input id="booking-phone" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:14px;box-sizing:border-box;margin-bottom:12px" placeholder="请输入联系电话"></input>' +
    '<div style="font-size:13px;margin-bottom:8px">备注（可选）</div>' +
    '<textarea id="booking-note" rows="2" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:14px;box-sizing:border-box;margin-bottom:16px;resize:none" placeholder="描述你的营养需求或问题..."></textarea>' +
    '<div style="display:flex;gap:8px">' +
    '<button onclick="document.getElementById(\'popup\').remove()" class="btn btn-sm btn-outline" style="flex:1">取消</button>' +
    '<button onclick="submitBooking(' + nutritionistId + ',' + serviceId + ',\'' + serviceType + '\')" class="btn btn-sm" style="flex:1;background:var(--green);color:#fff;border:none;padding:10px;border-radius:8px">确认预约</button>' +
    '</div></div>';
  popup.style.display = 'flex';
};

window.submitBooking = async function(nutritionistId, serviceId, serviceType) {
  var date = document.getElementById('booking-date').value;
  var time = document.getElementById('booking-time').value;
  var address = document.getElementById('booking-address') ? document.getElementById('booking-address').value : '';
  var phone = document.getElementById('booking-phone').value;
  var note = document.getElementById('booking-note').value;

  if (!date || !time) { toast('请选择预约日期和时间', 'error'); return; }
  if (serviceType === 'visit' && !address) { toast('上门服务需填写地址', 'error'); return; }
  if (!phone) { toast('请填写联系电话', 'error'); return; }

  var popup = document.getElementById('popup');
  if (popup) popup.remove();

  try {
    var res = await api('/api/nutritionist/bookings', {
      method: 'POST',
      body: JSON.stringify({
        nutritionist_id: nutritionistId,
        service_id: serviceId,
        service_type: serviceType,
        service_date: date,
        service_time: time,
        address: address,
        contact_phone: phone,
        user_note: note
      })
    });
    if (res && res.booking && res.booking.id) {
      toast('预约成功！等待营养师确认');
      navigate('nutritionist-booking', { bookingId: res.booking.id });
    } else { toast('预约失败，请重试', 'error'); }
  } catch(e) { toast(e.message, 'error'); }
};

// 7. 预约详情页
async function renderNutritionistBooking() {
  var bookingId = state.pageParams.bookingId;
  if (!bookingId) { navigate('my-nutritionist-bookings'); return; }
  updateThemeIcon();
  var h = '<div class="header"><h1><i class="fa-solid fa-calendar-check"></i> 预约详情</h1></div>';
  var b = '<div class="page" id="booking-detail"><div class="loading"><div class="spinner"></div><p>加载中...</p></div></div>';
  document.getElementById('app').innerHTML = h + b;

  try {
    var booking = await api('/api/nutritionist/bookings/' + bookingId);
    var statusMap = { pending: '待确认', confirmed: '已确认', completed: '已完成', cancelled: '已取消' };
    var typeMap = { online: '线上咨询', visit: '上门服务' };
    var html = '<div class="page" id="booking-detail" style="padding-bottom:80px">' +
      '<div class="card">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
      '<span style="font-weight:600;font-size:16px">' + esc(booking.nutritionist_name || '营养师') + '</span>' +
      '<span style="font-size:12px;padding:4px 10px;border-radius:6px;background:var(--green);color:#fff">' + (statusMap[booking.status] || booking.status) + '</span>' +
      '</div>' +
      '<div style="font-size:13px;color:var(--text2);margin-bottom:4px">服务类型：' + (typeMap[booking.service_type] || booking.service_type) + '</div>' +
      (booking.service_date ? '<div style="font-size:13px;color:var(--text2);margin-bottom:4px">预约日期：' + esc(booking.service_date) + ' ' + esc(booking.service_time || '') + '</div>' : '') +
      (booking.address ? '<div style="font-size:13px;color:var(--text2);margin-bottom:4px">上门地址：' + esc(booking.address) + '</div>' : '') +
      (booking.contact_phone ? '<div style="font-size:13px;color:var(--text2);margin-bottom:4px">联系电话：' + esc(booking.contact_phone) + '</div>' : '') +
      (booking.user_note ? '<div style="font-size:13px;color:var(--text2);margin-bottom:4px">备注：' + esc(booking.user_note) + '</div>' : '') +
      '<div style="font-size:14px;font-weight:600;color:var(--green);margin-top:8px">费用：¥' + (booking.price || 0) + '</div>' +
      '</div>' +
      (booking.status === 'pending' ? '<button onclick="cancelBooking(' + bookingId + ')" class="btn btn-block mt-4" style="background:#FFEBEE;color:var(--red);border:none;padding:12px;border-radius:8px;font-size:14px">取消预约</button>' : '') +
      (booking.status === 'completed' ? '<button onclick="showReviewForm(' + bookingId + ')" class="btn btn-primary btn-block mt-4">评价此次服务</button>' : '') +
      '</div>';
    document.getElementById('booking-detail').outerHTML = html;
  } catch(e) {
    document.getElementById('booking-detail').innerHTML = '<div style="padding:40px;text-align:center;color:var(--red)">加载失败<br><button class="btn btn-sm btn-outline mt-2" onclick="renderNutritionistBooking()">重试</button></div>';
  }
}

window.cancelBooking = async function(bookingId) {
  if (!confirm('确定取消预约？')) return;
  try {
    await api('/api/nutritionist/bookings/' + bookingId + '/cancel', { method: 'POST' });
    toast('预约已取消');
    navigate('my-nutritionist-bookings');
  } catch(e) { toast(e.message, 'error'); }
};

window.showReviewForm = function(bookingId) {
  var popup = document.getElementById('popup') || (function() {
    var e = document.createElement('div');
    e.id = 'popup';
    e.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center';
    document.body.appendChild(e);
    return e;
  })();
  popup.innerHTML = '<div style="background:var(--card);padding:24px;border-radius:16px;width:90%;max-width:360px;box-shadow:0 8px 32px rgba(0,0,0,0.2)">' +
    '<h3 style="margin:0 0 16px">评价此次服务</h3>' +
    '<div style="margin-bottom:16px">评分：' +
    '<span onclick="setReviewRating(1)" style="cursor:pointer;font-size:20px" id="star-1">*</span>' +
    '<span onclick="setReviewRating(2)" style="cursor:pointer;font-size:20px" id="star-2">*</span>' +
    '<span onclick="setReviewRating(3)" style="cursor:pointer;font-size:20px" id="star-3">*</span>' +
    '<span onclick="setReviewRating(4)" style="cursor:pointer;font-size:20px" id="star-4">*</span>' +
    '<span onclick="setReviewRating(5)" style="cursor:pointer;font-size:20px" id="star-5">*</span>' +
    '</div>' +
    '<textarea id="review-text" rows="3" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:14px;box-sizing:border-box;margin-bottom:16px;resize:none" placeholder="分享你的服务体验..."></textarea>' +
    '<div style="display:flex;gap:8px">' +
    '<button onclick="document.getElementById(\'popup\').remove()" class="btn btn-sm btn-outline" style="flex:1">取消</button>' +
    '<button onclick="submitReview(' + bookingId + ')" class="btn btn-sm" style="flex:1;background:var(--green);color:#fff;border:none;padding:10px;border-radius:8px">提交评价</button>' +
    '</div></div>';
  popup.style.display = 'flex';
  window._reviewRating = 5;
  for (var i = 1; i <= 5; i++) {
    document.getElementById('star-' + i).textContent = '*';
  }
};

window.setReviewRating = function(rating) {
  window._reviewRating = rating;
  for (var i = 1; i <= 5; i++) {
    document.getElementById('star-' + i).textContent = i <= rating ? '*' : ' ';
  }
};

window.submitReview = async function(bookingId) {
  var rating = window._reviewRating || 5;
  var review = document.getElementById('review-text').value.trim();
  var popup = document.getElementById('popup');
  if (popup) popup.remove();
  try {
    await api('/api/nutritionist/bookings/' + bookingId + '/review', {
      method: 'POST',
      body: JSON.stringify({ rating: rating, review: review })
    });
    toast('评价成功！');
    navigate('nutritionist-booking', { bookingId: bookingId });
  } catch(e) { toast(e.message, 'error'); }
};

// 8. 我的预约列表
async function renderMyNutritionistBookings() {
  if (!state.user) {
    toast('请先登录', 'error');
    setTimeout(function() { navigate('login'); }, 1500);
    return;
  }
  updateThemeIcon();
  var h = '<div class="header"><h1><i class="fa-solid fa-list-check"></i> 我的预约</h1></div>';
  var b = '<div class="page" id="my-bookings-list"><div class="loading"><div class="spinner"></div><p>加载中...</p></div></div>';
  document.getElementById('app').innerHTML = h + b;

  try {
    var bookings = await api('/api/nutritionist/bookings/my');
    var html = '';
    if (!bookings || !bookings.length) {
      html = '<div style="padding:60px 20px;text-align:center;color:var(--text2)"><div style="font-size:48px;margin-bottom:12px"></div><div>暂无预约记录</div><button onclick="navigate(\'nutritionists\')" class="btn btn-primary mt-4">去找营养师</button></div>';
    } else {
      var statusMap = { pending: '待确认', confirmed: '已确认', completed: '已完成', cancelled: '已取消' };
      var typeMap = { online: '线上咨询', visit: '上门服务' };
      for (var i = 0; i < bookings.length; i++) {
        var bk = bookings[i];
        html += '<div class="card" style="cursor:pointer;margin-bottom:10px" onclick="navigate(\'nutritionist-booking\',' + JSON.stringify({ bookingId: bk.id }) + ')">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
          '<span style="font-weight:600;font-size:15px">' + esc(bk.nutritionist_name || '营养师') + '</span>' +
          '<span style="font-size:12px;padding:3px 8px;border-radius:6px;background:var(--green);color:#fff">' + (statusMap[bk.status] || bk.status) + '</span>' +
          '</div>' +
          '<div style="font-size:13px;color:var(--text2);margin-bottom:4px">' + (typeMap[bk.service_type] || bk.service_type) + '</div>' +
          (bk.service_date ? '<div style="font-size:12px;color:var(--text2)">' + esc(bk.service_date) + '</div>' : '') +
          '</div>';
      }
    }
    document.getElementById('my-bookings-list').innerHTML = html;
  } catch(e) {
    document.getElementById('my-bookings-list').innerHTML = '<div style="padding:40px;text-align:center;color:var(--red)">加载失败<br><button class="btn btn-sm btn-outline mt-2" onclick="renderMyNutritionistBookings()">重试</button></div>';
  }
}

// ========== 健康档案入口 ==========

function renderHealthArchiveEntry() {}

// ========== 服务商入驻审核模块（前端）==========

// 入驻申请入口页
function renderProviderApply() {
  updateThemeIcon();
  var h = hd('服务商入驻', 'profile');
  var b = '<div class="page" style="padding:16px">' +
    '<div style="text-align:center;padding:20px 0">' +
    '<div style="font-size:48px;margin-bottom:12px">🏥</div>' +
    '<h2 style="margin:0;color:var(--text)">欢迎入驻食术养生</h2>' +
    '<p style="color:var(--text2);font-size:14px;margin-top:8px">专业的健康服务平台，严格的审核机制</p>' +
    '</div>' +
    '<div class="card" onclick="startApplication(\'nutritionist\')" style="cursor:pointer;margin-bottom:12px">' +
    '<div style="display:flex;align-items:center;gap:12px">' +
    '<div style="width:48px;height:48px;border-radius:12px;background:#E8F5E9;display:flex;align-items:center;justify-content:center;font-size:24px">🍎</div>' +
    '<div style="flex:1">' +
    '<div style="font-weight:600;font-size:16px">营养师入驻</div>' +
    '<div style="font-size:13px;color:var(--text2)">注册营养师/健康管理师/公共营养师</div>' +
    '</div>' +
    '<span style="color:var(--text3)">›</span>' +
    '</div></div>' +
    '<div class="card" onclick="startApplication(\'tcm_doctor\')" style="cursor:pointer;margin-bottom:12px">' +
    '<div style="display:flex;align-items:center;gap:12px">' +
    '<div style="width:48px;height:48px;border-radius:12px;background:#FFF3E0;display:flex;align-items:center;justify-content:center;font-size:24px">👨‍⚕️</div>' +
    '<div style="flex:1">' +
    '<div style="font-weight:600;font-size:16px">中医师入驻</div>' +
    '<div style="font-size:13px;color:var(--text2)">执业中医师/中西医结合医师</div>' +
    '</div>' +
    '<span style="color:var(--text3)">›</span>' +
    '</div></div>' +
    '<div class="card" style="background:var(--bg2);border:1px dashed var(--border)">' +
    '<div style="font-weight:600;font-size:14px;margin-bottom:8px">📋 审核流程</div>' +
    '<div style="font-size:13px;color:var(--text2);line-height:1.8">' +
    '1️⃣ 填写信息 & 上传证件 → OCR自动识别<br>' +
    '2️⃣ 实名认证 & 人脸活体检测<br>' +
    '3️⃣ AI初审（自动校验证件真伪）<br>' +
    '4️⃣ 人工复审（平台专业审核）<br>' +
    '5️⃣ 试岗期（前3单重点评价）<br>' +
    '6️⃣ 正式认证 ✅' +
    '</div></div>' +
    '<div style="margin-top:16px;text-align:center">' +
    '<button class="btn btn-outline" onclick="navigate(\'provider-my-applications\')">查看我的申请</button>' +
    '</div></div>';
  document.getElementById('app').innerHTML = h + b;
}

function startApplication(type) {
  state._applyType = type;
  navigate('provider-application', { type: type });
}

// 入驻申请表单页
function renderProviderApplication() {
  updateThemeIcon();
  var type = state.pageParams.type || state._applyType || 'nutritionist';
  var isTCM = type === 'tcm_doctor';
  var title = isTCM ? '中医师入驻申请' : '营养师入驻申请';
  var h = hd(title, 'provider-apply');

  var b = '<div class="page" style="padding:16px">' +
    '<form id="apply-form" onsubmit="return false">' +
    // ── 基础信息 ──
    '<div class="card">' +
    '<div class="card-title" style="margin-bottom:12px">📝 基础信息</div>' +
    '<div class="form-group"><label style="font-size:13px;color:var(--text2)">姓名 *</label><input id="a-name" class="form-input" placeholder="请输入真实姓名" required></div>' +
    '<div class="form-group"><label style="font-size:13px;color:var(--text2)">联系方式 *</label><input id="a-phone" class="form-input" placeholder="手机号码" type="tel" required></div>' +
    '<div style="display:flex;gap:12px"><div class="form-group" style="flex:1"><label style="font-size:13px;color:var(--text2)">性别</label><select id="a-gender" class="form-input"><option value="">请选择</option><option value="男">男</option><option value="女">女</option></select></div>' +
    '<div class="form-group" style="flex:1"><label style="font-size:13px;color:var(--text2)">出生年份</label><input id="a-birthday" class="form-input" placeholder="如：1985" type="number"></div></div>' +
    '<div class="form-group"><label style="font-size:13px;color:var(--text2)">服务区域</label><input id="a-areas" class="form-input" placeholder="如：北京市朝阳区,海淀区（逗号分隔）"></div>' +
    '<div class="form-group"><label style="font-size:13px;color:var(--text2)">擅长领域 *</label><input id="a-specialty" class="form-input" placeholder="如：孕产妇,婴幼儿,慢病管理（逗号分隔）" required></div>' +
    '<div class="form-group"><label style="font-size:13px;color:var(--text2)">从业年限' + (!isTCM ? ' *（需≥2年）' : '') + '</label><input id="a-exp" class="form-input" type="number" placeholder="如：5" min="' + (isTCM ? '0' : '2') + '" required></div>' +
    '<div class="form-group"><label style="font-size:13px;color:var(--text2)">个人简介</label><textarea id="a-intro" class="form-input" rows="3" placeholder="介绍您的从业经历、擅长领域、服务理念等"></textarea></div>' +
    '</div>' +
    // ── 资质上传 ──
    '<div class="card">' +
    '<div class="card-title" style="margin-bottom:12px">📄 资质上传</div>';

  if (!isTCM) {
    b += '<div class="form-group"><label style="font-size:13px;color:var(--text2)">证书类型 *</label>' +
      '<select id="a-cert-type" class="form-input" required>' +
      '<option value="">请选择</option>' +
      '<option value="注册营养师RD">注册营养师RD</option>' +
      '<option value="注册营养技师DTR">注册营养技师DTR</option>' +
      '<option value="健康管理师">健康管理师</option>' +
      '<option value="公共营养师">公共营养师</option></select></div>' +
      '<div class="form-group"><label style="font-size:13px;color:var(--text2)">证书编号 *</label><input id="a-cert-num" class="form-input" placeholder="请输入证书编号" required></div>' +
      '<div class="form-group"><label style="font-size:13px;color:var(--text2)">证书照片（正面）*</label><input id="a-cert-front" class="form-input" type="file" accept="image/*" required><div id="a-cert-front-preview" style="margin-top:4px"></div></div>' +
      '<div class="form-group"><label style="font-size:13px;color:var(--text2)">证书照片（背面）</label><input id="a-cert-back" class="form-input" type="file" accept="image/*"><div id="a-cert-back-preview" style="margin-top:4px"></div></div>';
  } else {
    b += '<div class="form-group"><label style="font-size:13px;color:var(--text2)">医师资格证类型 *</label>' +
      '<select id="a-med-cert-type" class="form-input" required>' +
      '<option value="">请选择</option>' +
      '<option value="中医">中医</option>' +
      '<option value="中西医结合">中西医结合</option></select></div>' +
      '<div class="form-group"><label style="font-size:13px;color:var(--text2)">医师资格证编号 *</label><input id="a-med-cert-num" class="form-input" placeholder="请输入医师资格证编号" required></div>' +
      '<div class="form-group"><label style="font-size:13px;color:var(--text2)">执业证书编号 *</label><input id="a-practice-cert" class="form-input" placeholder="请输入执业证书编号" required></div>' +
      '<div class="form-group"><label style="font-size:13px;color:var(--text2)">执业范围 *（须含“中医”或“中西医结合”）</label><input id="a-practice-scope" class="form-input" placeholder="如：中医专业" required></div>' +
      '<div class="form-group"><label style="font-size:13px;color:var(--text2)">执业机构 *</label><input id="a-practice-org" class="form-input" placeholder="如：XX市中医院" required></div>' +
      '<div class="form-group"><label style="font-size:13px;color:var(--text2)">在职证明 *</label><input id="a-org-proof" class="form-input" type="file" accept="image/*,.pdf" required></div>' +
      '<div class="form-group"><label style="font-size:13px;color:var(--text2)">职称 *</label>' +
      '<select id="a-title-rank" class="form-input" required>' +
      '<option value="">请选择</option>' +
      '<option value="住院医师">住院医师</option>' +
      '<option value="主治医师">主治医师</option>' +
      '<option value="副主任医师">副主任医师</option>' +
      '<option value="主任医师">主任医师</option></select></div>' +
      '<div class="form-group"><label style="font-size:13px;color:var(--text2)">多点执业备案</label><select id="a-multi-site" class="form-input"><option value="0">未备案</option><option value="1">已备案</option></select></div>' +
      '<div class="form-group" id="multi-proof-group" style="display:none"><label style="font-size:13px;color:var(--text2)">备案证明</label><input id="a-multi-proof" class="form-input" type="file" accept="image/*,.pdf"></div>';
  }

  b += '<div style="border-top:1px solid var(--border);padding-top:12px;margin-top:8px">' +
    '<div class="form-group"><label style="font-size:13px;color:var(--text2)">身份证正面 *</label><input id="a-id-front" class="form-input" type="file" accept="image/*" required></div>' +
    '<div class="form-group"><label style="font-size:13px;color:var(--text2)">身份证背面 *</label><input id="a-id-back" class="form-input" type="file" accept="image/*" required></div>' +
    '</div></div>' +
    // ── 服务定价 ──
    '<div class="card">' +
    '<div class="card-title" style="margin-bottom:12px">💰 服务定价</div>' +
    '<div class="form-group"><label style="font-size:13px;color:var(--text2)">线上咨询价格（元/次）</label><input id="a-price-online" class="form-input" type="number" placeholder="99" min="1"></div>' +
    (!isTCM ?
      '<div class="form-group"><label style="font-size:13px;color:var(--text2)">上门服务价格（元/次）</label><input id="a-price-visit" class="form-input" type="number" placeholder="299" min="1"></div>' :
      '<div class="form-group"><label style="font-size:13px;color:var(--text2)">视频问诊价格（元/次）</label><input id="a-price-video" class="form-input" type="number" placeholder="199" min="1"></div>') +
    '</div>' +
    // ── 法律协议 ──
    '<div class="card">' +
    '<div class="card-title" style="margin-bottom:12px">⚖️ 法律协议</div>' +
    '<div style="font-size:13px;color:var(--text2);margin-bottom:8px">请阅读并同意以下协议：</div>' +
    '<div style="font-size:12px;color:var(--text3);background:var(--bg2);padding:10px;border-radius:8px;margin-bottom:8px;line-height:1.6">' +
    (isTCM ?
      '• 《医师多点执业协议》<br>• 《医疗责任分担协议》<br>• 《平台在线诊疗规范》<br>• 《平台服务条款与隐私政策》' :
      '• 《营养师入驻服务协议》<br>• 《上门服务行为规范》<br>• 《平台服务条款与隐私政策》') +
    '</div>' +
    '<label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer">' +
    '<input type="checkbox" id="a-agreement" style="width:18px;height:18px" required> ' +
    '<span>我已阅读并同意以上全部协议</span></label>' +
    '</div>' +
    // ── 按钮 ──
    '<div style="padding:16px 0;display:flex;gap:12px">' +
    '<button class="btn btn-outline" style="flex:1" onclick="saveApplicationDraft()">保存草稿</button>' +
    '<button class="btn btn-primary btn-lg" style="flex:2" onclick="submitApplication()">提交申请</button>' +
    '</div></form></div>';

  document.getElementById('app').innerHTML = h + b;

  // 多点备案联动
  if (isTCM) {
    var msSelect = document.getElementById('a-multi-site');
    if (msSelect) msSelect.addEventListener('change', function() {
      document.getElementById('multi-proof-group').style.display = this.value === '1' ? 'block' : 'none';
    });
  }
}

// 收集表单数据
function collectApplicationData() {
  var type = state.pageParams.type || state._applyType || 'nutritionist';
  var isTCM = type === 'tcm_doctor';
  var data = {
    provider_type: type,
    name: document.getElementById('a-name') ? document.getElementById('a-name').value : '',
    phone: document.getElementById('a-phone') ? document.getElementById('a-phone').value : '',
    gender: document.getElementById('a-gender') ? document.getElementById('a-gender').value : '',
    birthday: document.getElementById('a-birthday') ? document.getElementById('a-birthday').value : '',
    service_areas: document.getElementById('a-areas') ? document.getElementById('a-areas').value : '',
    specialty: document.getElementById('a-specialty') ? document.getElementById('a-specialty').value : '',
    experience_years: document.getElementById('a-exp') ? parseInt(document.getElementById('a-exp').value) || 0 : 0,
    introduction: document.getElementById('a-intro') ? document.getElementById('a-intro').value : '',
    price_online: document.getElementById('a-price-online') ? parseFloat(document.getElementById('a-price-online').value) || null : null,
    agreement_signed: document.getElementById('a-agreement') ? (document.getElementById('a-agreement').checked ? 1 : 0) : 0,
    agreement_version: 'v1.0'
  };

  if (!isTCM) {
    data.cert_type = document.getElementById('a-cert-type') ? document.getElementById('a-cert-type').value : '';
    data.cert_number = document.getElementById('a-cert-num') ? document.getElementById('a-cert-num').value : '';
    data.cert_photo_front = document.getElementById('a-cert-front') ? 'uploaded_cert_front_' + Date.now() : '';
    data.cert_photo_back = document.getElementById('a-cert-back') ? 'uploaded_cert_back_' + Date.now() : '';
    data.price_visit = document.getElementById('a-price-visit') ? parseFloat(document.getElementById('a-price-visit').value) || null : null;
  } else {
    data.medical_cert_type = document.getElementById('a-med-cert-type') ? document.getElementById('a-med-cert-type').value : '';
    data.medical_cert_number = document.getElementById('a-med-cert-num') ? document.getElementById('a-med-cert-num').value : '';
    data.practice_cert_number = document.getElementById('a-practice-cert') ? document.getElementById('a-practice-cert').value : '';
    data.practice_scope = document.getElementById('a-practice-scope') ? document.getElementById('a-practice-scope').value : '';
    data.practice_org = document.getElementById('a-practice-org') ? document.getElementById('a-practice-org').value : '';
    data.practice_org_proof = document.getElementById('a-org-proof') ? 'uploaded_org_proof_' + Date.now() : '';
    data.title_rank = document.getElementById('a-title-rank') ? document.getElementById('a-title-rank').value : '';
    data.multi_site_registered = document.getElementById('a-multi-site') ? parseInt(document.getElementById('a-multi-site').value) : 0;
    data.multi_site_proof = document.getElementById('a-multi-proof') ? 'uploaded_multi_proof_' + Date.now() : '';
    data.price_video = document.getElementById('a-price-video') ? parseFloat(document.getElementById('a-price-video').value) || null : null;
  }

  // 身份证
  data.id_card_front = document.getElementById('a-id-front') ? 'uploaded_id_front_' + Date.now() : '';
  data.id_card_back = document.getElementById('a-id-back') ? 'uploaded_id_back_' + Date.now() : '';

  return data;
}

// 保存草稿
async function saveApplicationDraft() {
  try {
    var data = collectApplicationData();
    var result = await api('/api/provider/applications', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    toast('草稿已保存');
    if (result.application) {
      state._currentAppId = result.application.id;
    }
  } catch(e) {
    toast(e.message, 'error');
  }
}

// 提交申请
async function submitApplication() {
  var agreement = document.getElementById('a-agreement');
  if (!agreement || !agreement.checked) {
    toast('请先同意法律协议', 'error');
    return;
  }

  try {
    var data = collectApplicationData();

    // 先创建/更新申请
    var result = await api('/api/provider/applications', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!result.application) {
      toast('创建申请失败', 'error');
      return;
    }

    // 提交审核
    var submitResult = await api('/api/provider/applications/' + result.application.id + '/submit', {
      method: 'POST'
    });

    toast(submitResult.detail || '申请已提交');
    navigate('provider-my-applications');
  } catch(e) {
    toast(e.message, 'error');
  }
}

// 我的申请列表
async function renderProviderMyApplications() {
  updateThemeIcon();
  var h = hd('我的申请', 'profile');
  var b = '<div class="page" style="padding:16px"><div id="my-apps-list" class="loading"><div class="spinner"></div><p>加载中...</p></div></div>';
  document.getElementById('app').innerHTML = h + b;

  try {
    var apps = await api('/api/provider/applications');
    var html = '';
    if (!apps || !apps.length) {
      html = '<div style="text-align:center;padding:40px;color:var(--text2)">' +
        '<div style="font-size:48px;margin-bottom:12px">📋</div>' +
        '<p>暂无申请记录</p>' +
        '<button class="btn btn-primary" style="margin-top:16px" onclick="navigate(\'provider-apply\')">立即申请</button></div>';
    } else {
      var statusMap = {
        'draft': ['📝 草稿', '#999'],
        'submitted': ['📤 已提交', '#2196F3'],
        'ai_reviewing': ['🤖 AI初审中', '#FF9800'],
        'ai_passed': ['✅ AI初审通过', '#4CAF50'],
        'ai_rejected': ['❌ AI初审驳回', '#F44336'],
        'manual_reviewing': ['👤 人工复审中', '#FF9800'],
        'interview_pending': ['🎥 待面试', '#9C27B0'],
        'interview_passed': ['✅ 面试通过', '#4CAF50'],
        'probation': ['🔄 试岗期', '#FF9800'],
        'approved': ['🎉 已认证', '#4CAF50'],
        'rejected': ['❌ 已驳回', '#F44336'],
        'frozen': ['🧊 已冻结', '#F44336'],
        'withdrawn': ['↩️ 已撤回', '#999']
      };
      if (!apps) apps = []; for (var i = 0; i < apps.length; i++) {
        var a = apps[i];
        var st = statusMap[a.status] || [a.status, '#999'];
        html += '<div class="card" style="cursor:pointer;margin-bottom:10px" onclick="viewApplication(' + a.id + ')">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
          '<span style="font-weight:600">' + esc(a.name) + '</span>' +
          '<span style="font-size:12px;padding:3px 8px;border-radius:6px;background:' + st[1] + ';color:#fff">' + st[0] + '</span>' +
          '</div>' +
          '<div style="font-size:13px;color:var(--text2)">' + (a.provider_type === 'tcm_doctor' ? '中医师' : '营养师') + ' · ' + (a.specialty || '') + '</div>' +
          '<div style="font-size:12px;color:var(--text3);margin-top:4px">申请时间：' + (a.created_at || '').substring(0, 10) + '</div>' +
          (a.reject_reason ? '<div style="font-size:12px;color:var(--red);margin-top:4px">驳回原因：' + esc(a.reject_reason) + '</div>' : '') +
          '</div>';
      }
    }
    document.getElementById('my-apps-list').innerHTML = html;
  } catch(e) {
    document.getElementById('my-apps-list').innerHTML = '<div style="padding:40px;text-align:center;color:var(--red)">加载失败</div>';
  }
}

function viewApplication(id) {
  navigate('provider-application-detail', { id: id });
}

// 申请详情页
async function renderProviderApplication() {
  updateThemeIcon();
  var id = state.pageParams.id;
  if (!id) { navigate('provider-my-applications'); return; }

  var h = hd('申请详情', 'provider-my-applications');
  var b = '<div class="page" style="padding:16px"><div id="app-detail" class="loading"><div class="spinner"></div></div></div>';
  document.getElementById('app').innerHTML = h + b;

  try {
    var app = await api('/api/provider/applications/' + id);
    var statusMap = {
      'draft': '📝 草稿', 'submitted': '📤 已提交', 'ai_reviewing': '🤖 AI初审中',
      'ai_passed': '✅ AI初审通过', 'ai_rejected': '❌ AI初审驳回', 'manual_reviewing': '👤 人工复审中',
      'interview_pending': '🎥 待面试', 'probation': '🔄 试岗期', 'approved': '🎉 已认证',
      'rejected': '❌ 已驳回', 'frozen': '🧊 已冻结', 'withdrawn': '↩️ 已撤回'
    };

    var html = '<div class="card">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
      '<span style="font-size:16px;font-weight:600">' + esc(app.name) + '</span>' +
      '<span style="font-size:13px;padding:4px 10px;border-radius:8px;background:var(--green);color:#fff">' + (statusMap[app.status] || app.status) + '</span>' +
      '</div>' +
      '<div style="font-size:13px;color:var(--text2)">' + (app.provider_type === 'tcm_doctor' ? '中医师' : '营养师') + ' · ' + (app.specialty || '') + '</div>' +
      '</div>';

    // AI审核结果
    if (app.ai_review_result) {
      html += '<div class="card"><div class="card-title" style="margin-bottom:8px">🤖 AI初审结果</div>';
      var checks = app.ai_review_result.checks || {};
      for (var key in checks) {
        if (checks.hasOwnProperty(key)) {
          var ck = checks[key];
          html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">' +
            '<span style="font-size:13px">' + ck.detail + '</span>' +
            '<span style="font-size:13px;color:' + (ck.status === 'passed' ? 'var(--green)' : 'var(--red)') + '">' + (ck.status === 'passed' ? '✅' : '❌') + '</span></div>';
        }
      }
      html += '</div>';
    }

    // 审核日志
    if (app.audit_logs && app.audit_logs.length) {
      html += '<div class="card"><div class="card-title" style="margin-bottom:8px">📋 审核进度</div>';
      for (var i = 0; i < app.audit_logs.length; i++) {
        var log = app.audit_logs[i];
        html += '<div style="padding:6px 0;border-bottom:1px solid var(--border);font-size:13px">' +
          '<div style="color:var(--text2)">' + (log.created_at || '').substring(0, 16) + '</div>' +
          '<div>' + esc(log.note || log.action) + '</div></div>';
      }
      html += '</div>';
    }

    // 操作按钮
    if (app.status === 'draft') {
      html += '<button class="btn btn-primary btn-block btn-lg" style="margin-top:12px" onclick="navigate(\'provider-application\', {type:\'' + app.provider_type + '\'})">编辑并提交</button>';
    } else if (['submitted', 'ai_reviewing', 'ai_passed', 'manual_reviewing', 'interview_pending'].indexOf(app.status) >= 0) {
      html += '<button class="btn btn-outline btn-block" style="margin-top:12px;color:var(--red)" onclick="withdrawApplication(' + app.id + ')">撤回申请</button>';
    }

    document.getElementById('app-detail').innerHTML = html;
  } catch(e) {
    document.getElementById('app-detail').innerHTML = '<div style="padding:40px;text-align:center;color:var(--red)">加载失败</div>';
  }
}

async function withdrawApplication(id) {
  if (!confirm('确定要撤回此申请吗？')) return;
  try {
    await api('/api/provider/applications/' + id + '/withdraw', { method: 'POST' });
    toast('申请已撤回');
    navigate('provider-my-applications');
  } catch(e) {
    toast(e.message, 'error');
  }
}

// ══════════════════════════════════════════
// AI智能辨体 — 多维检测页
// ══════════════════════════════════════════
async function renderAIConstitution() {
  var h = hd('🔍 AI智能辨体', 'home');
  var ct = state.user && state.user.constitution_type ? state.user.constitution_type : '';
  var ctBadge = ct ? '<span class="pill pill-green" style="margin-left:8px">' + ct + '</span>' : '<span class="pill pill-orange" style="margin-left:8px">未测评</span>';
  
  var b = '<div class="page">' +
    '<div class="card" style="text-align:center;padding:24px">' +
    '<div style="font-size:48px;margin-bottom:8px">🔬</div>' +
    '<h3 style="margin:0 0 8px">AI多维辨体</h3>' +
    '<p style="font-size:13px;color:var(--text2);margin:0 0 12px">舌象采集 + 语音问诊 + 传统问卷，三重检测精准辨体</p>' +
    '<div style="font-size:14px">当前体质：' + ctBadge + '</div>' +
    '</div>' +
    
    // 检测方式卡片
    '<div class="card" style="cursor:pointer" onclick="navigate(\'constitution-assess\')">' +
    '<div class="flex-between">' +
    '<div><div class="card-title">📋 传统问卷</div><div class="card-subtitle">45道经典题目，中医九种体质测评</div></div>' +
    '<span style="color:var(--green);font-size:20px">→</span></div></div>' +
    
    '<div class="card" style="cursor:pointer" onclick="startTongueAnalysis()">' +
    '<div class="flex-between">' +
    '<div><div class="card-title">👅 AI舌象分析</div><div class="card-subtitle">拍舌头照，AI分析舌色/舌苔/舌体/舌下络脉</div></div>' +
    '<span style="color:var(--green);font-size:20px">→</span></div></div>' +
    
    '<div class="card" style="cursor:pointer" onclick="startVoiceConsultation()">' +
    '<div class="flex-between">' +
    '<div><div class="card-title">🎙️ 语音问诊</div><div class="card-subtitle">语音描述症状，AI提取关键证候</div></div>' +
    '<span style="color:var(--green);font-size:20px">→</span></div></div>' +
    
    '<div class="card" style="cursor:pointer;border:2px solid var(--green)" onclick="startComprehensive()">' +
    '<div class="flex-between">' +
    '<div><div class="card-title">🌟 综合辨体（推荐）</div><div class="card-subtitle">融合问卷+舌象+语音，最高精度辨体</div></div>' +
    '<span style="color:var(--green);font-size:20px">→</span></div></div>' +
    
    '<div class="card" onclick="navigate(\'diet-plan\')" style="cursor:pointer">' +
    '<div class="flex-between">' +
    '<div><div class="card-title">🥗 我的食疗方案</div><div class="card-subtitle">基于体质的一键配菜和养生方案</div></div>' +
    '<span style="color:var(--green);font-size:20px">→</span></div></div>' +
    '</div>';
  
  document.getElementById('app').innerHTML = h + b;
}

// 舌象分析页
async function startTongueAnalysis() {
  var h = hd('👅 AI舌象分析', 'ai-constitution');
  var b = '<div class="page">' +
    '<div class="card">' +
    '<div class="card-title">拍摄指导</div>' +
    '<div style="font-size:13px;line-height:1.8;color:var(--text2)">' +
    '<p>✅ 自然光线下拍摄</p>' +
    '<p>✅ 伸出舌头自然放松</p>' +
    '<p>✅ 拍摄前1小时避免进食饮水</p>' +
    '<p>✅ 正面拍舌面，侧面拍舌边</p>' +
    '<p>✅ 翘起舌尖拍舌下络脉</p></div></div>' +
    
    '<div class="card">' +
    '<div class="card-title">舌象信息录入</div>' +
    '<div class="form-group"><label>舌色</label><select id="t-color" class="form-select">' +
    '<option value="淡红">淡红（正常）</option><option value="淡白">淡白</option><option value="红">红</option><option value="绛红">绛红</option><option value="紫暗">紫暗</option><option value="青紫">青紫</option>' +
    '</select></div>' +
    '<div class="form-group"><label>舌体</label><select id="t-body" class="form-select">' +
    '<option value="正常">正常</option><option value="胖大有齿痕">胖大有齿痕</option><option value="瘦薄">瘦薄</option><option value="裂纹">裂纹</option><option value="芒刺">芒刺</option>' +
    '</select></div>' +
    '<div class="form-group"><label>舌苔</label><select id="t-coat" class="form-select">' +
    '<option value="薄白">薄白（正常）</option><option value="白腻">白腻</option><option value="黄腻">黄腻</option><option value="厚腻">厚腻</option><option value="少苔/无苔">少苔/无苔</option><option value="灰黑">灰黑</option>' +
    '</select></div>' +
    '<div class="form-group"><label>舌下络脉</label><select id="t-vein" class="form-select">' +
    '<option value="正常淡紫">正常淡紫</option><option value="紫暗粗大">紫暗粗大</option><option value="怒张">怒张</option><option value="淡细">淡细</option>' +
    '</select></div>' +
    '<button class="btn btn-primary btn-block btn-lg" onclick="submitTongueAnalysis()">🔍 分析舌象</button>' +
    '</div>' +
    '<div id="tongue-result"></div>' +
    '</div>';
  document.getElementById('app').innerHTML = h + b;
}

async function submitTongueAnalysis() {
  var data = {
    tongue_color: document.getElementById('t-color').value,
    tongue_body: document.getElementById('t-body').value,
    tongue_coating: document.getElementById('t-coat').value,
    sublingual_vein: document.getElementById('t-vein').value
  };
  try {
    var result = await api('/ai/tongue-analysis', { method: 'POST', body: JSON.stringify(data) });
    window._tongueResult = result;
    var html = '<div class="card" style="margin-top:12px">' +
      '<div class="card-title">🔍 舌象分析结果</div>' +
      '<div style="font-size:13px;line-height:1.8">' +
      '<p><strong>舌色：</strong>' + result.tongue_color + ' — ' + (result.analysis.tongue_color || '') + '</p>' +
      '<p><strong>舌体：</strong>' + result.tongue_body + ' — ' + (result.analysis.tongue_body || '') + '</p>' +
      '<p><strong>舌苔：</strong>' + result.tongue_coating + ' — ' + (result.analysis.tongue_coating || '') + '</p>' +
      '<p><strong>舌下络脉：</strong>' + result.sublingual_vein + ' — ' + (result.analysis.sublingual_vein || '') + '</p>' +
      '<hr style="border-color:var(--border)">' +
      '<p><strong>🧘 推测体质：</strong><span style="color:var(--green);font-weight:700">' + result.primary_type + '</span>' + (result.secondary_type ? ' + ' + result.secondary_type : '') + '</p>' +
      '<p><strong>置信度：</strong>' + Math.round(result.confidence * 100) + '%</p>' +
      '</div></div>';
    document.getElementById('tongue-result').innerHTML = html;
  } catch(e) { toast(e.message, 'error'); }
}

// 语音问诊页
async function startVoiceConsultation() {
  var h = hd('🎙️ 语音问诊', 'ai-constitution');
  var b = '<div class="page">' +
    '<div class="card">' +
    '<div class="card-title">请描述您的症状</div>' +
    '<div class="card-subtitle">AI将从您的描述中提取关键证候，辅助辨体</div>' +
    '<div class="form-group"><textarea id="v-symptoms" class="form-textarea" rows="5" placeholder="例如：我最近总是感到乏力，手脚冰凉，容易感冒，大便不成形..."></textarea></div>' +
    '<div class="card-subtitle">💡 可参考以下引导问题：</div>' +
    '<ul style="font-size:13px;color:var(--text2);padding-left:20px;line-height:2">' +
    '<li>您最近有什么不舒服？</li>' +
    '<li>睡眠质量如何？</li>' +
    '<li>胃口怎么样？有无口干口苦？</li>' +
    '<li>情绪方面？容易焦虑吗？</li></ul>' +
    '<button class="btn btn-primary btn-block btn-lg" onclick="submitVoiceConsultation()">🔍 AI分析症状</button>' +
    '</div>' +
    '<div id="voice-result"></div></div>';
  document.getElementById('app').innerHTML = h + b;
}

async function submitVoiceConsultation() {
  var text = document.getElementById('v-symptoms').value;
  if (!text.trim()) { toast('请输入症状描述', 'error'); return; }
  try {
    var result = await api('/ai/voice-consultation', { method: 'POST', body: JSON.stringify({ text: text }) });
    window._voiceResult = result;
    var html = '<div class="card">' +
      '<div class="card-title">🔍 语音问诊分析</div>';
    if (result.matched_types.length > 0) {
      html += '<div style="font-size:13px;line-height:1.8">' +
        '<p><strong>匹配体质：</strong></p>';
      for (var i = 0; i < result.matched_types.length; i++) {
        var mt = result.matched_types[i];
        html += '<div class="pill pill-' + (i === 0 ? 'green' : 'orange') + '" style="margin:4px">' + mt + '</div>';
        if (result.keywords_found[mt]) html += '<span style="font-size:12px;color:var(--text2)"> 识别词：' + result.keywords_found[mt].join('、') + '</span>';
        html += '<br>';
      }
      html += '<p><strong>随访建议：</strong>' + (result.follow_ups[0] ? result.follow_ups[0].question : '') + '</p></div>';
    } else {
      html += '<div style="text-align:center;padding:20px;color:var(--text2)">未匹配到明确体质倾向，建议补充更多症状描述</div>';
    }
    html += '</div>';
    document.getElementById('voice-result').innerHTML = html;
  } catch(e) { toast(e.message, 'error'); }
}

// 综合辨体
async function startComprehensive() {
  var h = hd('🌟 综合辨体', 'ai-constitution');
  var b = '<div class="page">' +
    '<div class="card" style="text-align:center;padding:20px">' +
    '<div style="font-size:40px">🌟</div>' +
    '<h3>综合辨体</h3>' +
    '<p style="font-size:13px;color:var(--text2)">融合问卷 + 舌象 + 语音三重数据，AI综合判断体质</p></div>' +
    '<div class="card">' +
    '<div class="card-title">数据源状态</div>' +
    '<div style="font-size:13px;line-height:2">' +
    '<p>' + (window._conAns && Object.keys(window._conAns).length > 0 ? '✅' : '⬜') + ' 问卷数据 ' + (window._conAns && Object.keys(window._conAns).length > 0 ? '（已完成）' : '<a href="#" onclick="navigate(\'constitution-assess\');return false" style="color:var(--green)">去完成</a>') + '</p>' +
    '<p>' + (window._tongueResult ? '✅' : '⬜') + ' 舌象数据 ' + (window._tongueResult ? '（已完成）' : '<a href="#" onclick="startTongueAnalysis();return false" style="color:var(--green)">去完成</a>') + '</p>' +
    '<p>' + (window._voiceResult ? '✅' : '⬜') + ' 语音数据 ' + (window._voiceResult ? '（已完成）' : '<a href="#" onclick="startVoiceConsultation();return false" style="color:var(--green)">去完成</a>') + '</p>' +
    '</div></div>' +
    '<button class="btn btn-primary btn-block btn-lg" onclick="submitComprehensive()">🌟 开始综合辨体</button>' +
    '<div id="comp-result"></div></div>';
  document.getElementById('app').innerHTML = h + b;
}

async function submitComprehensive() {
  var data = {
    questionnaire_scores: window._conAns ? null : null, // 需要从上次测评获取
    tongue_result: window._tongueResult || null,
    voice_result: window._voiceResult || null
  };
  try {
    var result = await api('/ai/comprehensive-assessment', { method: 'POST', body: JSON.stringify(data) });
    if (result.primary_type) {
      state.user.constitution_type = result.primary_type;
    }
    var sorted = result.sorted_results || [];
    var html = '<div class="card" style="text-align:center;margin-top:12px">' +
      '<div style="font-size:48px;margin:12px 0">🎉</div>' +
      '<div style="font-size:22px;font-weight:700;color:var(--green)">' + result.primary_type + '</div>' +
      (result.secondary_type ? '<div style="font-size:14px;color:var(--text2)">兼夹：' + result.secondary_type + '</div>' : '') +
      '<div style="font-size:13px;color:var(--text2);margin-top:8px">置信度：' + Math.round(result.confidence * 100) + '%</div>' +
      '<div style="font-size:12px;color:var(--text2)">数据源：' + (result.data_sources.questionnaire ? '✅问卷 ' : '') + (result.data_sources.tongue ? '✅舌象 ' : '') + (result.data_sources.voice ? '✅语音 ' : '') + '</div>' +
      '</div>';
    if (sorted.length > 0) {
      html += '<div class="card"><div class="card-title">各项体质评分</div>';
      for (var i = 0; i < sorted.length; i++) {
        var pct = sorted.length > 1 ? Math.round(sorted[i].score / sorted[0].score * 100) : 100;
        html += '<div class="flex-between mt-2"><span>' + sorted[i].type + '</span><span style="font-weight:600">' + Math.round(sorted[i].score) + '</span></div>' +
          '<div style="background:var(--bg2);border-radius:4px;height:8px;margin:4px 0 8px"><div style="background:var(--green);border-radius:4px;height:8px;width:' + pct + '%"></div></div>';
      }
      html += '</div>';
    }
    html += '<button class="btn btn-primary btn-block" onclick="navigate(\'diet-plan\')">查看我的食疗方案</button>';
    document.getElementById('comp-result').innerHTML = html;
  } catch(e) { toast(e.message, 'error'); }
}

// ══════════════════════════════════════════
// 智能商城 — 体质适配商品排序
// ══════════════════════════════════════════
async function renderSmartShop() {
  var h = hd('🛒 智能推荐', 'home');
  document.getElementById('app').innerHTML = h + '<div class="page" id="ss-content"><div class="loading"><div class="spinner"></div><p>根据您的体质智能排序商品...</p></div></div>';
  try {
    var data = await api('/ai/smart-shop');
    var prods = await api('/api/shop/products', {silent:true});
    var ct = data.constitution_type;
    var html = '<div class="smart-shop-banner">' +
      '<div style="font-size:36px;margin-bottom:8px">🧬</div>' +
      '<div style="font-size:18px;font-weight:700;color:#fff">基于 <span style="color:#F4D03F">' + esc(ct) + '</span> 智能推荐</div>' +
      '<div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px">商品按与您体质的适配度排列</div></div>';
    var prodMap = {};
    if (prods) for (var i = 0; i < prods.length; i++) prodMap[prods[i].id] = prods[i];
    for (var i = 0; i < data.products.length; i++) {
      var item = data.products[i];
      var p = item.product || prodMap[i+1] || {};
      var scoreColor = item.fit_score >= 80 ? '#4A7C59' : item.fit_score >= 50 ? '#8B7355' : '#C73E3A';
      var scoreBg = item.fit_score >= 80 ? 'rgba(74,124,89,0.08)' : item.fit_score >= 50 ? 'rgba(139,115,85,0.08)' : 'rgba(199,62,58,0.08)';
      var emj = {'食材':'🍯','茶饮':'🍵','厨具':'🏺','药材':'🌿'}[p.category] || '📦';
      var discount = p.original_price && p.original_price > p.price ? Math.round((1-p.price/p.original_price)*100) : 0;
      html += '<div class="smart-product-card" onclick="openPrd(' + (p.id||i+1) + ')">' +
        '<div class="smart-product-img" style="background:linear-gradient(135deg,' + scoreBg + ',rgba(255,255,255,0.5))">' +
        '<span style="font-size:48px">' + emj + '</span>' +
        (discount > 0 ? '<div class="smart-badge" style="background:#C73E3A">省' + discount + '%</div>' : '') +
        '</div>' +
        '<div class="smart-product-info">' +
        '<div class="smart-product-name">' + esc(p.name || '养生好物') + '</div>' +
        '<div class="smart-product-desc">' + esc(p.description || item.reason || '') + '</div>' +
        '<div class="smart-product-bottom">' +
        '<div class="smart-product-price"><span style="font-size:18px;font-weight:700;color:#C73E3A">¥' + (p.price||0) + '</span>' +
        (p.original_price && p.original_price > p.price ? '<span style="font-size:11px;color:#999;text-decoration:line-through;margin-left:4px">¥' + p.original_price + '</span>' : '') +
        '</div>' +
        '<div class="smart-fit-score" style="background:' + scoreColor + '">' + item.tag + ' ' + item.fit_score + '%</div>' +
        '</div></div></div>';
    }
    document.getElementById('ss-content').innerHTML = html;
  } catch(e) {
    document.getElementById('ss-content').innerHTML = '<div style="padding:40px;text-align:center;color:var(--red)">加载失败<br><button class="btn btn-sm btn-outline mt-2" onclick="renderSmartShop()">重试</button></div>';
  }
}

// ══════════════════════════════════════════
// 食疗方案页
// ══════════════════════════════════════════
async function renderDietPlan() {
  var h = hd('🥗 食疗方案', 'ai-constitution');
  document.getElementById('app').innerHTML = h + '<div class="page" id="dp-content"><div class="loading"><div class="spinner"></div><p>生成个性化食疗方案...</p></div></div>';
  try {
    var plan = await api('/ai/diet-plan');
    var html = '<div class="card" style="text-align:center;padding:20px">' +
      '<div style="font-size:36px;margin-bottom:8px">🥗</div>' +
      '<h3 style="color:var(--green)">' + plan.constitution_type + ' 食疗方案</h3>' +
      '<p style="font-size:13px;color:var(--text2)">' + (plan.description || '') + '</p></div>' +
      
      '<div class="card"><div class="card-title">🧬 核心原则</div>' +
      '<p style="font-size:13px;line-height:1.8">' + (plan.core_principles || plan.diet_principles || '') + '</p></div>';
    
    // 场景推荐
    if (plan.scenarios && plan.scenarios.length > 0) {
      for (var i = 0; i < plan.scenarios.length; i++) {
        var sc = plan.scenarios[i];
        html += '<div class="card"><div class="card-title">' + (i === 0 ? '👤 ' : '👩 ') + sc.group + ' · ' + sc.focus + '</div>';
        if (sc.tips) {
          html += '<ul style="font-size:13px;line-height:2;padding-left:20px">';
          for (var j = 0; j < sc.tips.length; j++) html += '<li>' + sc.tips[j] + '</li>';
          html += '</ul>';
        }
        if (sc.food_focus) {
          html += '<div style="font-size:12px;color:var(--text2)">重点食材：' + sc.food_focus.join('、') + '</div>';
        }
        if (sc.exercise) {
          html += '<div style="font-size:12px;color:var(--text2)">推荐运动：' + sc.exercise + '</div>';
        }
        html += '</div>';
      }
    }
    
    // 宜吃忌口
    html += '<div class="card"><div class="card-title">✅ 宜吃</div><div style="font-size:13px;line-height:1.8">';
    for (var i = 0; i < (plan.recommended_foods || []).length; i++) {
      html += '<span class="pill pill-green" style="margin:2px">' + plan.recommended_foods[i] + '</span>';
    }
    html += '</div></div>';
    
    if (plan.avoid_foods && plan.avoid_foods.length > 0) {
      html += '<div class="card"><div class="card-title">❌ 忌口</div><div style="font-size:13px;line-height:1.8">';
      for (var i = 0; i < plan.avoid_foods.length; i++) {
        html += '<span class="pill" style="margin:2px;background:#FFEBEE;color:var(--red)">' + plan.avoid_foods[i] + '</span>';
      }
      html += '</div></div>';
    }
    
    // 推荐茶饮
    if (plan.recommended_tea) {
      html += '<div class="card" style="text-align:center">' +
        '<div style="font-size:28px">🍵</div>' +
        '<div style="font-weight:600">推荐茶饮：' + plan.recommended_tea + '</div></div>';
    }
    
    html += '<button class="btn btn-primary btn-block" onclick="navigate(\'smart-shop\')">🛒 查看智能推荐商品</button>';
    document.getElementById('dp-content').innerHTML = html;
  } catch(e) {
    if (e.message.indexOf('no_constitution') >= 0 || e.message.indexOf('先完成') >= 0) {
      document.getElementById('dp-content').innerHTML = '<div class="card" style="text-align:center;padding:40px">' +
        '<div style="font-size:48px">🧘</div><h3>请先完成体质测评</h3>' +
        '<p style="font-size:13px;color:var(--text2)">AI需要了解您的体质才能生成个性化食疗方案</p>' +
        '<button class="btn btn-primary" onclick="navigate(\'ai-constitution\')">去测评</button></div>';
    } else {
      document.getElementById('dp-content').innerHTML = '<div style="padding:40px;text-align:center;color:var(--red)">加载失败</div>';
    }
  }
}

// ══════════════════════════════════════════
// 节气养生日历
// ══════════════════════════════════════════
async function renderSeasonalCalendar() {
  var h = hd('📅 节气养生', 'home');
  document.getElementById('app').innerHTML = h + '<div class="page" id="sc-content"><div class="loading"><div class="spinner"></div></div></div>';
  try {
    var data = await api('/seasonal/calendar');
    var html = '<div class="card" style="text-align:center">' +
      '<div class="card-title">您的体质：' + (data.constitution || '平和质') + '</div>' +
      '<div class="card-subtitle">⚠️ 标记为高风险的节气请特别注意</div></div>';
    
    for (var i = 0; i < data.calendar.length; i++) {
      var t = data.calendar[i];
      var borderStyle = t.is_risk_for_me ? 'border-left:4px solid var(--red)' : 'border-left:4px solid var(--green)';
      html += '<div class="card" style="' + borderStyle + ';cursor:pointer" onclick="showSeasonalDetail(\'' + t.name + '\')">' +
        '<div class="flex-between">' +
        '<div><span style="font-weight:600">' + t.name + '</span>' +
        (t.is_risk_for_me ? ' <span style="color:var(--red);font-size:11px">⚠️ 高风险</span>' : '') + '</div>' +
        '<span style="font-size:12px;color:var(--text2)">' + t.date + '</span></div>' +
        (t.theme ? '<div style="font-size:12px;color:var(--green)">' + t.theme + '</div>' : '') +
        '</div>';
    }
    document.getElementById('sc-content').innerHTML = html;
  } catch(e) {
    document.getElementById('sc-content').innerHTML = '<div style="padding:40px;text-align:center;color:var(--red)">加载失败</div>';
  }
}

// ══════════════════════════════════════════
// 每日任务打卡
// ══════════════════════════════════════════
async function renderDailyTasks() {
  var h = hd('✅ 每日打卡', 'home');
  document.getElementById('app').innerHTML = h + '<div class="page" id="dt-content"><div class="loading"><div class="spinner"></div></div></div>';
  try {
    var data = await api('/seasonal/daily-tasks');
    var html = '<div class="card" style="text-align:center">' +
      '<div style="font-size:36px;margin-bottom:4px">🔥 ' + data.streak + '</div>' +
      '<div style="font-size:13px;color:var(--text2)">连续打卡天数</div>' +
      '<div style="font-size:18px;font-weight:700;color:var(--green);margin-top:8px">' + data.today_points + ' 积分</div>' +
      '<div style="font-size:12px;color:var(--text2)">今日已获 · ' + data.completed_tasks + '/' + data.total_tasks + ' 完成</div></div>';
    
    // 任务列表
    for (var i = 0; i < data.tasks.length; i++) {
      var task = data.tasks[i];
      var done = task.completed;
      var bg = done ? 'background:var(--bg2);opacity:0.7' : '';
      html += '<div class="card" style="' + bg + '">' +
        '<div class="flex-between">' +
        '<div style="flex:1">' +
        '<div style="font-weight:600">' + (task.icon || '✅') + ' ' + esc(task.title) + '</div>' +
        '<div style="font-size:12px;color:var(--text2)">' + (task.category || '') + ' · ' + task.points + '积分' +
        (task.type === 'seasonal' ? ' 🌸节气专属' : '') +
        (task.type === 'constitution_seasonal' ? ' 🎯体质专属' : '') + '</div></div>' +
        '<div>';
      if (done) {
        html += '<span style="color:var(--green)">✅ +' + task.points_earned + '</span>';
      } else {
        html += '<button class="btn btn-sm btn-primary" onclick="completeTask(\'' + task.id + '\')">打卡</button>';
      }
      html += '</div></div></div>';
    }
    
    html += '<div class="card" style="text-align:center">' +
      '<div class="card-title">积分兑换</div>' +
      '<div class="card-subtitle">当前积分可兑换以下优惠券</div>' +
      '<div style="display:flex;gap:8px;margin-top:12px;justify-content:center">' +
      '<button class="btn btn-sm btn-outline" onclick="redeemCoupon(\'discount_5\')">100分→5元券</button>' +
      '<button class="btn btn-sm btn-outline" onclick="redeemCoupon(\'discount_10\')">200分→10元券</button>' +
      '</div></div>';
    
    document.getElementById('dt-content').innerHTML = html;
  } catch(e) {
    document.getElementById('dt-content').innerHTML = '<div style="padding:40px;text-align:center;color:var(--red)">加载失败</div>';
  }
}

async function completeTask(taskId) {
  try {
    var result = await api('/seasonal/checkin', { method: 'POST', body: JSON.stringify({ task_id: taskId }) });
    toast(result.message || '打卡成功！+' + result.points_earned + '积分');
    renderDailyTasks(); // 刷新
  } catch(e) { toast(e.message, 'error'); }
}

async function redeemCoupon(type) {
  try {
    var result = await api('/seasonal/redeem-coupon', { method: 'POST', body: JSON.stringify({ type: type }) });
    toast(result.message);
  } catch(e) { toast(e.message, 'error'); }
}

// ══════════════════════════════════════════
// 健康档案
// ══════════════════════════════════════════
async function renderHealthArchive() {
  var h = hd('📋 健康档案', 'profile');
  document.getElementById('app').innerHTML = h + '<div class="page" id="ha-content"><div class="loading"><div class="spinner"></div></div></div>';
  try {
    var archive = await api('/user-profile/archive');
    var u = archive.user_info;
    var html = '<div class="card" style="text-align:center">' +
      '<div style="font-size:36px;margin-bottom:4px">📋</div>' +
      '<h3 style="margin:0">' + esc(u.name) + ' 的健康档案</h3>' +
      (u.age ? '<div style="font-size:13px;color:var(--text2)">' + u.age + '岁 · ' + (u.gender || '-') + '</div>' : '') +
      (u.constitution_type ? '<div class="pill pill-green" style="margin-top:8px">' + u.constitution_type + '</div>' : '') +
      '</div>';
    
    // 健康趋势
    var ht = archive.health_trend;
    html += '<div class="card"><div class="card-title">📊 健康趋势（近30天）</div>' +
      '<div style="font-size:13px;line-height:2">' +
      '<div class="flex-between"><span>平均睡眠</span><span>' + ht.avg_sleep + 'h</span></div>' +
      '<div class="flex-between"><span>平均运动</span><span>' + ht.avg_exercise + 'min</span></div>' +
      '<div class="flex-between"><span>平均心情</span><span>' + mood(Math.round(ht.avg_mood)) + '</span></div>' +
      '<div class="flex-between"><span>记录天数</span><span>' + ht.days_recorded + '天</span></div>' +
      '</div></div>';
    
    // 问诊记录
    var cs = archive.consultation_summary;
    html += '<div class="card"><div class="card-title">🏥 问诊记录 · ' + cs.total + '次</div>';
    if (cs.recent.length > 0) {
      for (var i = 0; i < cs.recent.length; i++) {
        html += '<div class="flex-between mt-2"><span>' + esc(cs.recent[i].doctor) + '</span><span style="font-size:12px;color:var(--text2)">' + cs.recent[i].date + '</span></div>';
      }
    } else {
      html += '<div style="font-size:13px;color:var(--text2)">暂无问诊记录</div>';
    }
    html += '</div>';
    
    document.getElementById('ha-content').innerHTML = html;
  } catch(e) {
    document.getElementById('ha-content').innerHTML = '<div style="padding:40px;text-align:center;color:var(--red)">加载失败</div>';
  }
}

// ── 关于我们 ──
function renderAbout() {
  var h = hd('关于我们','profile');
  var b = '<div class="page">';
  b += '<div style="text-align:center;padding:24px 0 16px">';
  b += '<div style="font-size:64px;margin-bottom:12px">🌿</div>';
  b += '<h2 style="color:var(--green);margin-bottom:4px">食术养生</h2>';
  b += '<div style="color:var(--text2);font-size:13px">v0.1.0 · 中医体质养生服务平台</div></div>';
  b += '<div class="card"><div class="card-title">📜 平台简介</div><div style="font-size:13px;line-height:1.7;color:var(--text2);margin-top:8px">食术养生是一款专注于中医体质养生服务的智能平台。融合中医九种体质理论，为用户提供个性化食疗方案、健康管理、在线咨询等一站式养生服务。</div></div>';
  b += '<div class="card mt-4"><div class="card-title">✨ 核心功能</div><div style="font-size:13px;line-height:1.8;margin-top:8px">🧘 <b>AI辨体</b>：基于40+题问卷精准识别体质<br>🍵 <b>食疗方案</b>：九种体质专属食疗食谱<br>🏥 <b>在线咨询</b>：中医师/营养师在线问诊<br>📅 <b>节气养生</b>：24节气个性化养生建议<br>📝 <b>健康日记</b>：每日打卡追踪健康趋势<br>🏥 <b>服务商入驻</b>：专业医护团队认证入驻</div></div>';
  b += '<div class="card mt-4"><div class="card-title">🏢 运营主体</div><div style="font-size:13px;line-height:1.8;margin-top:8px"><b>食术养生</b>（内测版）<br>服务电话：<a href="tel:400-888-8888" style="color:var(--green)">400-888-8888</a><br>工作时间：周一至周五 09:00-18:00<br>联系邮箱：service@shishu.twa</div></div>';
  b += '<div class="card mt-4"><div class="card-title">📋 用户协议</div><div style="font-size:13px;line-height:1.7;margin-top:8px;color:var(--text2)">本应用仅提供健康信息参考，不构成医疗诊断或治疗建议。如有健康问题，请咨询专业医师。本平台对用户健康状况不承担医疗责任。</div></div>';
  b += '<div class="card mt-4"><div class="card-title">🔒 隐私保护</div><div style="font-size:13px;line-height:1.7;margin-top:8px;color:var(--text2)">我们严格保护您的个人信息，遵循《个人信息保护法》相关规定。健康数据仅用于为您提供个性化服务，不会出售或共享给第三方。</div></div>';
  b += '<div style="text-align:center;padding:24px;color:var(--text2);font-size:12px">© 2026 食术养生 · 保留所有权利</div>';
  b += '<button class="btn btn-block mt-4" style="background:#eee;border:none;padding:12px;border-radius:8px;font-size:14px" onclick="navigate(\'profile\')">返回个人中心</button>';
  b += '</div>';
  document.getElementById('app').innerHTML = h + b;
}

// ── 联系我们 ──
function renderContact() {
  var h = hd('联系我们','profile');
  var b = '<div class="page">';
  b += '<div style="text-align:center;padding:24px 0 16px;font-size:64px">📞</div>';
  b += '<div class="card"><div class="card-title">📞 客服热线</div><div style="font-size:15px;font-weight:600;margin:8px 0 4px;color:var(--green)">400-888-8888</div><div style="font-size:12px;color:var(--text2)">周一至周五 09:00-18:00（节假日除外）</div></div>';
  b += '<div class="card mt-4"><div class="card-title">💬 在线咨询</div><div style="margin-top:8px">';
  b += '<button class="btn btn-primary btn-block" onclick="window.open(\'https://work.weixin.qq.com/kfid/placeholder\',\'_blank\')" style="background:var(--green);border:none">微信客服（推荐）</button>';
  b += '<button class="btn btn-outline btn-block mt-2" onclick="window.location.href=\'mailto:service@shishu.twa\'">📧 邮件联系</button></div></div>';
  b += '<div class="card mt-4"><div class="card-title">📍 公司地址</div><div style="font-size:13px;line-height:1.7;margin-top:8px">北京市朝阳区<br>望京SOHO T3 12层<br>（仅限预约拜访）</div></div>';
  b += '<div class="card mt-4"><div class="card-title">💡 常见问题</div>';
  b += '<div style="margin-top:8px;font-size:13px">';
  b += '<div style="padding:10px 0;border-bottom:1px solid #f0f0f0"><b>Q: 如何联系医师？</b><br><span style="color:var(--text2)">A: 进入「中医问诊」或「营养师上门」页面选择医师预约</span></div>';
  b += '<div style="padding:10px 0;border-bottom:1px solid #f0f0f0"><b>Q: VIP会员如何开通？</b><br><span style="color:var(--text2)">A: 在「我的」页面点击头像进入会员中心</span></div>';
  b += '<div style="padding:10px 0;border-bottom:1px solid #f0f0f0"><b>Q: APK安装失败？</b><br><span style="color:var(--text2)">A: 请在手机设置中开启「允许安装未知来源应用」</span></div>';
  b += '<div style="padding:10px 0"><b>Q: 忘记密码怎么办？</b><br><span style="color:var(--text2)">A: 联系客服重置，请提供注册手机号</span></div>';
  b += '</div></div>';
  b += '<div class="card mt-4"><div class="card-title">📢 反馈建议</div><div style="margin-top:8px">';
  b += '<div class="form-group"><textarea id="feedback-text" class="form-textarea" rows="4" placeholder="请留下您的宝贵意见...（选填）"></textarea></div>';
  b += '<button class="btn btn-primary btn-block" onclick="submitFeedback()" style="background:var(--green);border:none">提交反馈</button></div></div>';
  b += '<button class="btn btn-block mt-4" style="background:#eee;border:none;padding:12px;border-radius:8px;font-size:14px" onclick="navigate(\'profile\')">返回</button>';
  b += '</div>';
  document.getElementById('app').innerHTML = h + b;
}

function submitFeedback() {
  var text = document.getElementById('feedback-text').value.trim();
  if (!text) { toast('请输入反馈内容'); return; }
  toast('感谢您的反馈！');
  navigate('profile');
}

