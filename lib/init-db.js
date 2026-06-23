/**
 * Database Auto-Init Module for Wellness App
 * Creates fresh DB with all tables and seed data when no DB file exists.
 * Used by server.js on first deploy to Render.com.
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SECRET = process.env.WELLNESS_SECRET || 'wellness-secret-key';
function hashPw(pw) {
  return crypto.createHash('sha256').update(pw + SECRET).digest('hex');
}

/**
 * Full schema SQL — mirrors seed-db.js
 */
const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT NOT NULL UNIQUE,hashed_password TEXT NOT NULL,nickname TEXT DEFAULT '',avatar TEXT DEFAULT '',phone TEXT DEFAULT '',constitution TEXT DEFAULT '',gender TEXT DEFAULT '',birth_year INTEGER,height_cm INTEGER,weight_kg INTEGER,is_vip INTEGER DEFAULT 0,vip_expires TEXT,vip_orders INTEGER DEFAULT 0,role TEXT DEFAULT 'user',points INTEGER DEFAULT 0,created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS constitution_questions (id INTEGER PRIMARY KEY AUTOINCREMENT,question_text TEXT NOT NULL,category TEXT NOT NULL,weight REAL DEFAULT 1.0);
  CREATE TABLE IF NOT EXISTS constitution_records (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,scores TEXT NOT NULL,result_type TEXT NOT NULL,created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS health_diaries (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,record_date TEXT NOT NULL,sleep_hours REAL,exercise_minutes INTEGER,exercise_type TEXT DEFAULT '',meal_count INTEGER,water_glasses INTEGER,diet_note TEXT DEFAULT '',mood_score INTEGER,note TEXT DEFAULT '',created_at TEXT DEFAULT (datetime('now')),UNIQUE(user_id, record_date));
  CREATE TABLE IF NOT EXISTS recipes (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,category TEXT DEFAULT '',suitable_constitution TEXT DEFAULT '',suitable_season TEXT DEFAULT '',ingredients TEXT DEFAULT '',steps TEXT DEFAULT '',benefits TEXT DEFAULT '',description TEXT DEFAULT '',image TEXT DEFAULT '');
  CREATE TABLE IF NOT EXISTS solar_terms (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,date_mmdd TEXT NOT NULL,description TEXT DEFAULT '',diet_tips TEXT DEFAULT '',exercise_tips TEXT DEFAULT '',acupoint_tips TEXT DEFAULT '',wellness_tips TEXT DEFAULT '',food_recommendations TEXT DEFAULT '',exercise_advice TEXT DEFAULT '');
  CREATE TABLE IF NOT EXISTS articles (id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,category TEXT DEFAULT '',content TEXT DEFAULT '',summary TEXT DEFAULT '',tags TEXT DEFAULT '',author TEXT DEFAULT '',cover_image TEXT DEFAULT '',view_count INTEGER DEFAULT 0,is_published INTEGER DEFAULT 1,created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS shop_products (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,category TEXT DEFAULT '',price REAL DEFAULT 0,original_price REAL,description TEXT DEFAULT '',image TEXT DEFAULT '',tags TEXT DEFAULT '',stock INTEGER DEFAULT 100,sales_count INTEGER DEFAULT 0,rating REAL DEFAULT 5.0,is_active INTEGER DEFAULT 1);
  CREATE TABLE IF NOT EXISTS shop_cart (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,product_id INTEGER NOT NULL,quantity INTEGER DEFAULT 1);
  CREATE TABLE IF NOT EXISTS shop_orders (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,order_no TEXT NOT NULL,total_amount REAL DEFAULT 0,consignee TEXT DEFAULT '',phone TEXT DEFAULT '',address TEXT DEFAULT '',remark TEXT DEFAULT '',status TEXT DEFAULT 'pending',created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS shop_order_items (id INTEGER PRIMARY KEY AUTOINCREMENT,order_id INTEGER NOT NULL,product_id INTEGER NOT NULL,product_name TEXT NOT NULL,price REAL NOT NULL,quantity INTEGER DEFAULT 1);
  CREATE TABLE IF NOT EXISTS chef_services (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,title TEXT DEFAULT '',category TEXT DEFAULT '',specialty TEXT DEFAULT '',suitable_constitution TEXT DEFAULT '',price REAL DEFAULT 0,description TEXT DEFAULT '',score REAL DEFAULT 5.0,order_count INTEGER DEFAULT 0,is_active INTEGER DEFAULT 1);
  CREATE TABLE IF NOT EXISTS chef_bookings (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,chef_id INTEGER NOT NULL,service_date TEXT NOT NULL,service_time TEXT DEFAULT '',address TEXT DEFAULT '',phone TEXT DEFAULT '',note TEXT DEFAULT '',menu_requirements TEXT DEFAULT '',total_amount REAL DEFAULT 0,status TEXT DEFAULT 'pending',created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS pay_orders (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,out_trade_no TEXT NOT NULL,plan_id TEXT DEFAULT 'monthly',amount INTEGER DEFAULT 0,status TEXT DEFAULT 'pending',paid_at TEXT,created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS plan_purchases (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,plan_type TEXT NOT NULL,status TEXT DEFAULT 'active',price REAL DEFAULT 0,purchased_at TEXT,created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS points_log (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,points INTEGER NOT NULL,action TEXT DEFAULT '',note TEXT DEFAULT '',created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS checkins (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,checkin_date TEXT NOT NULL,consecutive_days INTEGER DEFAULT 1,points_earned INTEGER DEFAULT 5,created_at TEXT DEFAULT (datetime('now')),UNIQUE(user_id, checkin_date));
  CREATE TABLE IF NOT EXISTS tcm_doctors (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,title TEXT DEFAULT '',hospital TEXT DEFAULT '',specialty TEXT DEFAULT '',introduction TEXT DEFAULT '',avatar TEXT DEFAULT '',rating REAL DEFAULT 5.0,consultation_count INTEGER DEFAULT 0,price_online REAL DEFAULT 99,price_video REAL DEFAULT 199,available INTEGER DEFAULT 1,certification TEXT DEFAULT '',created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS tcm_consultations (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,doctor_id INTEGER NOT NULL,type TEXT DEFAULT 'text',status TEXT DEFAULT 'pending',symptoms TEXT DEFAULT '',constitution TEXT DEFAULT '',price REAL DEFAULT 0,doctor_notes TEXT DEFAULT '',prescription_id INTEGER,rating INTEGER,review TEXT DEFAULT '',created_at TEXT DEFAULT (datetime('now')),accepted_at TEXT,completed_at TEXT);
  CREATE TABLE IF NOT EXISTS tcm_messages (id INTEGER PRIMARY KEY AUTOINCREMENT,consultation_id INTEGER NOT NULL,sender_type TEXT NOT NULL,sender_id INTEGER,content TEXT NOT NULL,msg_type TEXT DEFAULT 'text',created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS tcm_prescriptions (id INTEGER PRIMARY KEY AUTOINCREMENT,consultation_id INTEGER NOT NULL,doctor_id INTEGER NOT NULL,user_id INTEGER NOT NULL,diagnosis TEXT DEFAULT '',prescription_text TEXT DEFAULT '',decoction_method TEXT DEFAULT '',dosage TEXT DEFAULT '',precautions TEXT DEFAULT '',days INTEGER DEFAULT 7,status TEXT DEFAULT 'active',created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS community_posts (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,content TEXT NOT NULL,images TEXT DEFAULT '',tab TEXT DEFAULT 'all',likes INTEGER DEFAULT 0,comments INTEGER DEFAULT 0,created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS tea_products (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,category TEXT DEFAULT '',constitution TEXT DEFAULT '',season TEXT DEFAULT '',benefits TEXT DEFAULT '',principle TEXT DEFAULT '',temperature INTEGER DEFAULT 85,steep_minutes REAL DEFAULT 3,daily_cups INTEGER DEFAULT 2,icon TEXT DEFAULT '🍵',is_active INTEGER DEFAULT 1);
  CREATE TABLE IF NOT EXISTS tea_records (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,tea_id INTEGER,tea_name TEXT DEFAULT '',score INTEGER,feeling TEXT DEFAULT '',completed INTEGER DEFAULT 0,time_slot TEXT DEFAULT 'other',created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS tea_time_rules (id INTEGER PRIMARY KEY AUTOINCREMENT,label TEXT NOT NULL,start_hour INTEGER NOT NULL,end_hour INTEGER NOT NULL,icon TEXT DEFAULT '🫖',description TEXT DEFAULT '',recommended_teas TEXT DEFAULT '');
  CREATE TABLE IF NOT EXISTS tea_badges (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,icon TEXT DEFAULT '🏅',description TEXT DEFAULT '',condition_type TEXT DEFAULT '',condition_value INTEGER DEFAULT 0);
  CREATE TABLE IF NOT EXISTS tea_daily_tips (id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,content TEXT DEFAULT '',category TEXT DEFAULT '',is_active INTEGER DEFAULT 1);
  CREATE TABLE IF NOT EXISTS provider_applications (id INTEGER PRIMARY KEY AUTOINCREMENT,provider_type TEXT NOT NULL,status TEXT DEFAULT 'draft',name TEXT NOT NULL,phone TEXT NOT NULL,gender TEXT,birthday TEXT,service_areas TEXT,specialty TEXT,introduction TEXT,experience_years INTEGER DEFAULT 0,avatar TEXT,cert_type TEXT,cert_number TEXT,cert_photo_front TEXT,cert_photo_back TEXT,id_card_front TEXT,id_card_back TEXT,medical_cert_type TEXT,medical_cert_number TEXT,practice_cert_number TEXT,practice_scope TEXT,practice_org TEXT,practice_org_proof TEXT,title_rank TEXT,multi_site_registered INTEGER DEFAULT 0,multi_site_proof TEXT,ocr_name TEXT,ocr_id_number TEXT,ocr_cert_info TEXT,ocr_verified INTEGER DEFAULT 0,real_name_verified INTEGER DEFAULT 0,face_verified INTEGER DEFAULT 0,face_verify_time TEXT,price_online REAL,price_visit REAL,price_video REAL,schedule TEXT,ai_review_result TEXT,ai_review_time TEXT,manual_reviewer_id INTEGER,manual_review_note TEXT,manual_review_time TEXT,interview_score REAL,interview_note TEXT,interview_time TEXT,reject_reason TEXT,probation_start TEXT,probation_end TEXT,probation_orders INTEGER DEFAULT 0,probation_avg_rating REAL DEFAULT 0,probation_passed INTEGER DEFAULT 0,agreement_signed INTEGER DEFAULT 0,agreement_signed_time TEXT,agreement_version TEXT,user_id INTEGER,provider_id INTEGER,created_at TEXT DEFAULT (datetime('now')),updated_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS provider_audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT,application_id INTEGER NOT NULL,action TEXT NOT NULL,operator_id INTEGER,operator_type TEXT DEFAULT 'system',note TEXT,extra_data TEXT,created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS service_checkins (id INTEGER PRIMARY KEY AUTOINCREMENT,booking_id INTEGER NOT NULL,provider_type TEXT NOT NULL,provider_id INTEGER NOT NULL,checkin_type TEXT NOT NULL,latitude REAL,longitude REAL,photo_url TEXT,note TEXT,created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS provider_complaints (id INTEGER PRIMARY KEY AUTOINCREMENT,provider_type TEXT NOT NULL,provider_id INTEGER NOT NULL,user_id INTEGER NOT NULL,booking_id INTEGER,complaint_type TEXT NOT NULL,description TEXT NOT NULL,status TEXT DEFAULT 'pending',severity TEXT DEFAULT 'normal',admin_note TEXT,created_at TEXT DEFAULT (datetime('now')),resolved_at TEXT);
  CREATE TABLE IF NOT EXISTS provider_education (id INTEGER PRIMARY KEY AUTOINCREMENT,provider_type TEXT NOT NULL,provider_id INTEGER NOT NULL,course_name TEXT NOT NULL,course_type TEXT NOT NULL,hours REAL NOT NULL,certificate_url TEXT,completed_at TEXT,created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS provider_renewals (id INTEGER PRIMARY KEY AUTOINCREMENT,provider_type TEXT NOT NULL,provider_id INTEGER NOT NULL,year INTEGER NOT NULL,education_hours REAL DEFAULT 0,min_education_hours REAL DEFAULT 15,complaint_count INTEGER DEFAULT 0,avg_rating REAL DEFAULT 5.0,renewal_status TEXT DEFAULT 'pending',reviewed_at TEXT,created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS nutritionists (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,title TEXT DEFAULT '营养师',hospital TEXT,specialty TEXT,introduction TEXT,avatar TEXT,rating REAL DEFAULT 5.0,service_count INTEGER DEFAULT 0,price_online REAL DEFAULT 99,price_visit REAL DEFAULT 299,available INTEGER DEFAULT 1,service_areas TEXT,certifications TEXT,created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS nutritionist_services (id INTEGER PRIMARY KEY AUTOINCREMENT,nutritionist_id INTEGER NOT NULL,service_type TEXT NOT NULL,title TEXT NOT NULL,description TEXT,duration_minutes INTEGER DEFAULT 60,price REAL NOT NULL,is_active INTEGER DEFAULT 1,created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS nutritionist_bookings (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,nutritionist_id INTEGER NOT NULL,service_id INTEGER,service_type TEXT NOT NULL,status TEXT DEFAULT 'pending',service_date TEXT,service_time TEXT,address TEXT,contact_phone TEXT,user_note TEXT,nutritionist_note TEXT,price REAL,created_at TEXT DEFAULT (datetime('now')),confirmed_at TEXT,completed_at TEXT);
  CREATE TABLE IF NOT EXISTS nutritionist_reviews (id INTEGER PRIMARY KEY AUTOINCREMENT,booking_id INTEGER NOT NULL,user_id INTEGER NOT NULL,nutritionist_id INTEGER NOT NULL,rating INTEGER NOT NULL,review TEXT,created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS task_checkins (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,task_id TEXT NOT NULL,checkin_date TEXT NOT NULL,points_earned INTEGER DEFAULT 0,created_at TEXT DEFAULT (datetime('now')),UNIQUE(user_id, task_id, checkin_date));
  CREATE TABLE IF NOT EXISTS ai_assessment_records (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,assessment_type TEXT NOT NULL DEFAULT 'comprehensive',primary_type TEXT,secondary_type TEXT,confidence REAL DEFAULT 0,detail TEXT,created_at TEXT DEFAULT (datetime('now')));
`;

async function initDb(dbPath) {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  // Run schema
  db.run(SCHEMA_SQL);

  // Seed users
  db.run('INSERT INTO users (username, hashed_password, nickname, role) VALUES (?,?,?,?)', ['demo', hashPw('123456'), '养生达人', 'demo']);
  db.run('INSERT INTO users (username, hashed_password, nickname, role) VALUES (?,?,?,?)', ['test', hashPw('123456'), '测试用户', 'user']);
  db.run('INSERT INTO users (username, hashed_password, nickname, role) VALUES (?,?,?,?)', ['admin', hashPw('admin123!'), '管理员', 'admin']);

  // Constitution questions
  var qs = [
    ['您容易疲乏吗？','气虚质',1.2],['您容易气短吗？','气虚质',1.3],['您容易心慌吗？','气虚质',1.1],
    ['您容易头晕或站起时晕眩吗？','气虚质',1.0],['您比别人更容易感冒吗？','气虚质',1.2],
    ['您手脚发凉吗？','阳虚质',1.3],['您胃脘部、背部或腰膝部怕冷吗？','阳虚质',1.2],
    ['您比一般人耐受不了寒冷吗？','阳虚质',1.3],['您吃凉的东西会感到不舒服吗？','阳虚质',1.1],
    ['您受凉或吃凉的东西容易拉肚子吗？','阳虚质',1.0],['您感到手脚心发热吗？','阴虚质',1.3],
    ['您感觉身体、脸上发热吗？','阴虚质',1.2],['您皮肤或口唇偏干吗？','阴虚质',1.2],
    ['您口唇的颜色比一般人偏红吗？','阴虚质',1.1],['您容易便秘或大便干燥吗？','阴虚质',1.1],
    ['您感到胸闷或腹部胀满吗？','痰湿质',1.2],['您感觉身体沉重不轻松吗？','痰湿质',1.3],
    ['您腹部肥满松软吗？','痰湿质',1.3],['您有额部油脂分泌多的现象吗？','痰湿质',1.1],
    ['您上眼睑比别人肿吗？','痰湿质',1.0],['您面部或鼻部有油腻感吗？','湿热质',1.2],
    ['您容易生痤疮或疮疖吗？','湿热质',1.3],['您感到口苦或嘴里有异味吗？','湿热质',1.3],
    ['您大便黏滞不爽吗？','湿热质',1.2],['您小便时尿道有发热感吗？','湿热质',1.1],
    ['皮肤常在不知不觉中出现青紫瘀斑吗？','血瘀质',1.2],['您两颧部有细微红丝吗？','血瘀质',1.1],
    ['您身体上有哪里疼痛吗？','血瘀质',1.2],['您面色偏暗或有色素沉着吗？','血瘀质',1.3],
    ['您容易有黑眼圈吗？','血瘀质',1.2],['您感到闷闷不乐、情绪低沉吗？','气郁质',1.3],
    ['您容易精神紧张、焦虑不安吗？','气郁质',1.3],['您多愁善感、感情脆弱吗？','气郁质',1.2],
    ['您容易感到害怕或受到惊吓吗？','气郁质',1.0],['您胁肋部或乳房胀痛吗？','气郁质',1.1],
    ['您没有感冒也会打喷嚏吗？','特禀质',1.2],['您没有感冒也会鼻塞、流鼻涕吗？','特禀质',1.2],
    ['您有因季节变化而咳喘的现象吗？','特禀质',1.3],['您容易过敏吗？','特禀质',1.3],
    ['您的皮肤容易起荨麻疹吗？','特禀质',1.2],['您精力充沛吗？','平和质',1.3],
    ['您容易适应外界环境变化吗？','平和质',1.3],['您睡眠良好吗？','平和质',1.2],
    ['您能够较好地应对压力吗？','平和质',1.1],['您面色红润有光泽吗？','平和质',1.2],
  ];
  for (var i = 0; i < qs.length; i++) {
    db.run('INSERT INTO constitution_questions (question_text, category, weight) VALUES (?,?,?)', qs[i]);
  }

  // Recipes
  var recipes = [
    ['山药枸杞粥','粥类','气虚质','四季','山药50g,枸杞10g,大米100g','1.大米淘洗干净;2.山药去皮切块;3.所有材料加水煮粥','补气健脾，适合气虚体质'],
    ['当归生姜羊肉汤','药膳汤','阳虚质','秋冬','羊肉500g,当归15g,生姜30g','1.羊肉焯水;2.当归生姜切片;3.炖煮2小时','温阳散寒，适合阳虚体质'],
    ['百合莲子银耳羹','粥类','阴虚质','秋冬','百合30g,莲子30g,银耳20g,冰糖适量','1.银耳泡发撕小朵;2.莲子去芯;3.炖煮1小时','滋阴润燥，适合阴虚体质'],
    ['薏米赤小豆汤','药膳汤','痰湿质','春夏','薏米50g,赤小豆50g,冰糖适量','1.薏米赤小豆浸泡2小时;2.加水煮烂;3.加冰糖调味','祛湿化痰，适合痰湿体质'],
    ['绿豆薏米粥','粥类','湿热质','夏季','绿豆50g,薏米50g,大米50g','1.绿豆薏米浸泡;2.与大米同煮成粥','清热利湿，适合湿热体质'],
    ['山楂红糖水','茶饮','血瘀质','四季','山楂15g,红糖适量,生姜3片','1.山楂洗净;2.加水煮15分钟;3.加红糖调味','活血化瘀，适合血瘀体质'],
    ['玫瑰花茶','茶饮','气郁质','四季','干玫瑰花5朵,蜂蜜适量','1.玫瑰花放入杯中;2.热水冲泡;3.加蜂蜜','疏肝解郁，适合气郁体质'],
    ['黄芪乌鸡汤','药膳汤','气虚质','秋冬','黄芪30g,乌鸡半只,红枣5颗','1.乌鸡焯水;2.黄芪红枣洗净;3.炖煮1.5小时','补气养血，适合气虚体质'],
    ['红枣桂圆茶','茶饮','阳虚质','秋冬','红枣5颗,桂圆10g,枸杞5g','1.红枣去核;2.所有材料放入杯中;3.热水冲泡','温补气血，适合阳虚体质'],
    ['山药排骨汤','药膳汤','平和质','四季','山药200g,排骨300g,姜3片','1.排骨焯水;2.山药去皮切块;3.炖煮1小时','健脾养胃，适合平和体质'],
    ['菊花决明子茶','茶饮','湿热质','夏季','菊花5g,决明子10g,枸杞5g','1.所有材料放入杯中;2.热水冲泡;3.焖5分钟','清肝明目，适合湿热体质'],
    ['黑豆核桃粥','粥类','血瘀质','秋冬','黑豆30g,核桃3个,大米100g','1.黑豆浸泡;2.核桃去壳;3.同煮成粥','补肾活血，适合血瘀体质'],
    ['百合小米粥','粥类','阴虚质','四季','百合30g,小米100g,红枣3颗','1.百合小米洗净;2.红枣去核;3.煮成粥','养阴安神，适合阴虚体质'],
    ['陈皮普洱茶','茶饮','痰湿质','四季','陈皮5g,普洱茶10g','1.陈皮撕小块;2.与普洱茶一起冲泡','理气化痰，适合痰湿体质'],
    ['莲子心茶','茶饮','气郁质','夏季','莲子心3g,合欢花5g','1.莲子心合欢花放入杯中;2.热水冲泡','清心安神，适合气郁体质'],
  ];
  for (var r = 0; r < recipes.length; r++) {
    db.run('INSERT INTO recipes (name,category,suitable_constitution,suitable_season,ingredients,steps,benefits) VALUES (?,?,?,?,?,?,?)', recipes[r]);
  }

  // 24 Solar terms
  var terms = [
    ['立春','02-04','春季开始，万物复苏','宜食辛甘发散之品','宜散步、太极拳','按揉太冲穴'],
    ['雨水','02-19','降雨增多，湿气渐重','宜食健脾祛湿之品','宜慢跑、伸展运动','按揉足三里'],
    ['惊蛰','03-06','春雷始动，阳气生发','宜食养肝护肝之品','宜户外运动','按揉肝俞穴'],
    ['春分','03-21','昼夜平分，阴阳调和','宜食时令蔬菜','宜和缓运动','按揉关元穴'],
    ['清明','04-05','天地清朗，万物生长','宜食清淡、养肺之品','宜踏青、放风筝','按揉肺俞穴'],
    ['谷雨','04-20','雨生百谷，湿气最重','宜食祛湿健脾之品','宜慢跑、瑜伽','按揉阴陵泉'],
    ['立夏','05-06','夏季开始，心火易旺','宜食清淡、养心之品','宜晨练、游泳','按揉内关穴'],
    ['小满','05-21','麦类灌浆，湿热渐重','宜食清热利湿之品','宜散步、太极','按揉曲池穴'],
    ['芒种','06-06','麦类成熟，暑热渐盛','宜食清暑解热之品','宜早晚运动','按揉合谷穴'],
    ['夏至','06-21','白昼最长，阳气最盛','宜食清淡、滋阴之品','宜避免剧烈运动','按揉神门穴'],
    ['小暑','07-07','暑热渐浓，湿气加重','宜食清热解暑之品','宜游泳、晨练','按揉足三里'],
    ['大暑','07-23','一年最热，暑湿交加','宜食清热祛湿之品','宜减少户外活动','按揉阴陵泉'],
    ['立秋','08-07','秋季开始，燥气渐生','宜食润肺生津之品','宜登山、慢跑','按揉肺俞穴'],
    ['处暑','08-23','暑热消退，秋燥明显','宜食滋阴润燥之品','宜户外活动','按揉太渊穴'],
    ['白露','09-08','天气转凉，露珠凝白','宜食温润之品','宜适当增加运动','按揉列缺穴'],
    ['秋分','09-23','昼夜平分，秋燥最盛','宜食润肺养阴之品','宜和缓运动','按揉中府穴'],
    ['寒露','10-08','露水渐寒，秋意更浓','宜食温补脾胃之品','宜登山、太极','按揉足三里'],
    ['霜降','10-23','天气渐冷，开始有霜','宜食温补之品','宜适当运动','按揉关元穴'],
    ['立冬','11-07','冬季开始，万物收藏','宜食温补肾阳之品','宜早睡晚起','按揉肾俞穴'],
    ['小雪','11-22','开始降雪，寒气加重','宜食温补暖身之品','宜室内运动','按揉命门穴'],
    ['大雪','12-07','降雪增多，寒气最盛','宜食温补滋腻之品','宜避免受寒','按揉涌泉穴'],
    ['冬至','12-22','白昼最短，阴气最盛','宜食温补阳气之品','宜静养为宜','按揉气海穴'],
    ['小寒','01-06','寒冷加剧，小寒胜大寒','宜食温补肾阳之品','宜适度运动','按揉腰眼穴'],
    ['大寒','01-20','一年最冷，寒气极盛','宜食温补滋养之品','宜室内运动','按揉命门穴'],
  ];
  for (var t = 0; t < terms.length; t++) {
    db.run('INSERT INTO solar_terms (name,date_mmdd,description,diet_tips,exercise_tips,acupoint_tips) VALUES (?,?,?,?,?,?)', terms[t]);
  }

  // Articles
  db.run("INSERT INTO articles (title,category,content,summary,is_published) VALUES (?,?,?,?,1)", ['九种体质自测指南','中医养生','# 九种体质\n\n中医将人的体质分为九种类型……\n\n**平和质**：阴阳气血调和\n**气虚质**：元气不足，易疲劳\n**阳虚质**：阳气不足，怕冷\n**阴虚质**：阴液亏少，口干\n**痰湿质**：痰湿凝聚，体胖\n**湿热质**：湿热内蕴，易生痘\n**血瘀质**：血行不畅，肤色暗\n**气郁质**：气机郁滞，情绪低\n**特禀质**：先天失常，易过敏','中医九种体质的特点与调理方向']);
  db.run("INSERT INTO articles (title,category,content,summary,is_published) VALUES (?,?,?,?,1)", ['春季养生：顺应阳气生发','节气养生','# 春季养生\n\n春季阳气生发…\n\n## 饮食原则\n减酸增甘，养脾气\n\n## 运动建议\n增加户外活动，舒展筋骨','春季养生重点：养肝、升阳、防风']);
  db.run("INSERT INTO articles (title,category,content,summary,is_published) VALUES (?,?,?,?,1)", ['每天10分钟，改善气虚体质','运动养生','# 适合气虚体质的运动\n\n气虚体质的人不宜剧烈运动……\n\n## 推荐运动\n1. 太极拳（15分钟）\n2. 八段锦（20分钟）\n3. 散步（30分钟）\n4. 站桩（10分钟）','气虚体质适合的温和运动方案']);
  db.run("INSERT INTO articles (title,category,content,summary,is_published) VALUES (?,?,?,?,1)", ['饮食调理：三高人群的日常食谱','中医养生','# 三高人群饮食指南\n\n## 推荐食材\n- 苦瓜、芹菜、木耳\n- 燕麦、荞麦、糙米\n\n## 忌口清单\n- 高盐食品\n- 高糖饮品\n- 油炸食品','针对三高人群的饮食调理方案']);

  // Shop products
  var prods = [
    ['有机枸杞','食材',39.9,49.9,'宁夏有机枸杞，颗粒饱满',328],['铁棍山药','食材',29.9,35.0,'河南焦作铁棍山药',256],
    ['古法红糖','食材',19.9,25.0,'传统手工熬制红糖',189],['精选当归','食材',35.0,42.0,'甘肃岷县当归片',156],
    ['有机薏米','食材',24.9,29.9,'贵州兴仁薏米',203],['特级百合干','食材',32.0,38.0,'湖南龙山百合干',178],
    ['黄芪切片','食材',28.0,35.0,'甘肃黄芪饮片',145],['养生壶','厨具',199.0,259.0,'多功能全自动养生壶',89],
  ];
  for (var p = 0; p < prods.length; p++) {
    db.run('INSERT INTO shop_products (name,category,price,original_price,description,sales_count) VALUES (?,?,?,?,?,?)', prods[p]);
  }

  // TCM Doctors
  var docs = [
    ['陈国栋','主任中医师','北京中医药大学附属医院','内科,脾胃病,亚健康调理','38年中医临床经验','/images/doctors/doctor1.jpg',4.9,1586,99,199,1],
    ['林雅文','副主任中医师','广东省中医院','妇科,气血调理,失眠','20年中医妇科临床经验','/images/doctors/doctor2.jpg',4.8,1243,79,159,1],
    ['张志强','中医主治医师','上海中医药大学附属岳阳医院','痰湿体质,三高调理','擅长从"痰湿"入手','/images/doctors/doctor3.jpg',4.7,892,59,129,1],
    ['王丽萍','中医博士/主治医师','成都中医药大学附属医院','小儿体质调,过敏,鼻炎','中医药大学博士毕业','/images/doctors/doctor4.jpg',4.9,678,69,139,1],
    ['刘明远','中医执业医师','八珍堂中医诊所','痛症,颈肩腰腿痛','专注中医外治法15年','/images/doctors/doctor5.jpg',4.6,435,49,99,1],
  ];
  for (var d = 0; d < docs.length; d++) {
    var doc = docs[d];
    db.run('INSERT INTO tcm_doctors (name,title,hospital,specialty,introduction,avatar,rating,consultation_count,price_online,price_video,available) VALUES (?,?,?,?,?,?,?,?,?,?,?)', doc);
  }

  // Nutritionists
  var nuts = [
    ['张明','高级营养师','北京协和医院营养科','体重管理,慢病营养','15年临床营养经验','/images/nutritionist1.jpg',4.9,328,129,399,1,'北京市朝阳区'],
    ['李芳','注册营养师','上海瑞金医院','孕期营养,儿童营养','10年妇幼营养经验','/images/nutritionist2.jpg',4.8,256,99,299,1,'上海市浦东新区'],
    ['王磊','公共营养师','自由职业','运动营养,亚健康调理','8年营养咨询经验','/images/nutritionist3.jpg',4.7,189,79,249,1,'深圳市南山区'],
  ];
  for (var n = 0; n < nuts.length; n++) {
    var nut = nuts[n];
    db.run('INSERT INTO nutritionists (name,title,hospital,specialty,introduction,avatar,rating,service_count,price_online,price_visit,available,service_areas) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', nut);
  }

  // Chef services  
  var chefs = [
    ['张大厨','粤菜养生','粤式煲汤','气虚质,阳虚质',299,'20年粤菜主厨经验',4.9,128],
    ['李营养师','药膳食疗','体质食疗','气虚质,痰湿质',399,'国家注册营养师',4.8,96],
    ['王师傅','家常养生','四季养生菜','平和质',199,'15年家常菜经验',4.7,215],
  ];
  for (var c = 0; c < chefs.length; c++) {
    db.run('INSERT INTO chef_services (name,category,specialty,suitable_constitution,price,description,score,order_count) VALUES (?,?,?,?,?,?,?,?)', chefs[c]);
  }

  // Tea products
  var teas = [
    ['黄芪红枣茶','补气茶','气虚质','四季','补气固表','黄芪10g+红枣3颗+枸杞5g冲泡',90,5,2,'🍵'],
    ['肉桂姜茶','温阳茶','阳虚质','秋冬','温阳散寒','肉桂3g+干姜5g+红糖冲泡',95,5,2,'🫖'],
    ['麦冬玉竹茶','滋阴茶','阴虚质','四季','滋阴润燥','麦冬10g+玉竹10g冲泡',85,4,2,'🫖'],
    ['陈皮普洱茶','祛湿茶','痰湿质','四季','理气化痰','陈皮5g+普洱茶10g冲泡',100,4,2,'🍵'],
    ['菊花金银花茶','清热茶','湿热质','夏季','清热解毒','菊花5g+金银花5g冲泡',90,3,2,'🍵'],
    ['玫瑰花丹参茶','活血茶','血瘀质','四季','活血化瘀','玫瑰花5朵+丹参5g冲泡',90,5,2,'🌹'],
    ['佛手薄荷茶','理气茶','气郁质','四季','疏肝理气','佛手5g+薄荷3g冲泡',90,4,2,'🌿'],
    ['黄芪白术茶','固本茶','特禀质','换季','固本培元','黄芪10g+白术5g+防风5g冲泡',95,5,2,'🍵'],
    ['枸杞菊花茶','平补茶','平和质','四季','滋补肝肾','枸杞5g+菊花3g冲泡',85,4,2,'🍵'],
  ];
  for (var tc = 0; tc < teas.length; tc++) {
    var t = teas[tc];
    db.run('INSERT INTO tea_products (name,category,constitution,season,benefits,principle,temperature,steep_minutes,daily_cups,icon) VALUES (?,?,?,?,?,?,?,?,?,?)', t);
  }

  // Tea time rules
  for (var tr of [['晨茶',7,9,'🌅','晨起阳气初生，饮温茶助阳气升发','1,8'],['午茶',11,13,'☀️','午时心火旺盛，宜饮清热滋阴之品','3,5'],['申茶',15,17,'🌤','申时膀胱经当令，适合饮祛湿理气茶','4,7'],['晚茶',19,21,'🌙','晚间宜安神，饮温和安神之茶','6,9']]) {
    db.run('INSERT INTO tea_time_rules (label,start_hour,end_hour,icon,description,recommended_teas) VALUES (?,?,?,?,?,?)', tr);
  }

  // Tea badges
  for (var b of [['初入茶道','🌱','完成第一次茶饮记录','first_brew',1],['七日茶养','🍵','连续7天茶饮打卡','consecutive',7],['月度茶友','🏅','累计30天茶饮打卡','total_days',30],['品茶达人','👑','累计100杯茶饮','total_cups',100],['体质茶师','🎓','尝试5种以上不同茶饮','variety',5]]) {
    db.run('INSERT INTO tea_badges (name,icon,description,condition_type,condition_value) VALUES (?,?,?,?,?)', b);
  }

  // Tea daily tips
  for (var tip of [['春捂秋冻','春季不要急于减衣，秋季不要过早添衣','节气养生'],['晨起一杯温水','每天早晨喝一杯温水，有助于唤醒脾胃','日常养生'],['饭后不宜立即饮茶','饭后30分钟再饮茶，避免鞣酸影响铁的吸收','饮茶知识']]) {
    db.run('INSERT INTO tea_daily_tips (title,content,category) VALUES (?,?,?)', tip);
  }

  // Save to disk
  var dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  var buf = Buffer.from(db.export());
  fs.writeFileSync(dbPath, buf);
  console.log('✅ Database auto-initialized at', dbPath);

  return db;
}

module.exports = { initDb };
