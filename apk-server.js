/* =============================================
   APK 下载服务器
   食术养生 - 免安装直链下载
   ============================================= */

var http = require('http');
var fs = require('fs');
var path = require('path');

var PORT = 8899;
var APK_DIR = path.join(__dirname, '..', '..', '..', '..', 'Desktop', '食术养生 - Google Play package');

// Fallback
if (!fs.existsSync(APK_DIR)) {
  APK_DIR = 'C:\\Users\\Public\\Downloads';
}

var CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Range'
};

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, function(err, data) {
    if (err) {
      res.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'});
      res.end('文件未找到: ' + path.basename(filePath));
      return;
    }
    res.writeHead(200, Object.assign({
      'Content-Type': contentType,
      'Content-Length': data.length,
      'Content-Disposition': 'attachment; filename="' + encodeURIComponent(path.basename(filePath)) + '"',
      'Cache-Control': 'public, max-age=300'
    }, CORS_HEADERS));
    res.end(data);
  });
}

function serveAPKList(res) {
  if (!fs.existsSync(APK_DIR)) {
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
    res.end('<html><body><h1>APK目录未找到</h1><p>请将APK文件放到: ' + APK_DIR + '</p></body></html>');
    return;
  }
  var files = fs.readdirSync(APK_DIR).filter(function(f) {
    return f.endsWith('.apk') || f.endsWith('.aab') || f.endsWith('.apks');
  });
  var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>食术养生 APK下载</title>';
  html += '<meta name="viewport" content="width=device-width,initial-scale=1">';
  html += '<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:600px;margin:40px auto;padding:0 20px;background:#fafaf8}';
  html += 'h1{color:#4A7C59;border-bottom:2px solid #4A7C59;padding-bottom:12px}';
  html += '.file{background:#fff;border:1px solid #e0e0e0;border-radius:12px;padding:16px 20px;margin:12px 0;display:flex;justify-content:space-between;align-items:center;box-shadow:0 1px 3px rgba(0,0,0,0.06)}';
  html += '.file:hover{box-shadow:0 3px 10px rgba(74,124,89,0.15)}';
  html += '.name{font-weight:600;color:#333;font-size:15px}';
  html += '.meta{color:#888;font-size:12px;margin-top:4px}';
  html += '.btn{background:#4A7C59;color:#fff;border:none;padding:8px 20px;border-radius:8px;text-decoration:none;font-size:14px;cursor:pointer;font-weight:500}';
  html += '.btn:hover{background:#3d6749}';
  html += '.version{background:#e8f5e9;color:#4A7C59;font-size:11px;padding:2px 8px;border-radius:10px}';
  html += '.tip{background:#fffbe6;border:1px solid #ffe082;border-radius:8px;padding:12px;margin-top:20px;font-size:13px;color:#666;line-height:1.6}';
  html += '.qr{text-align:center;margin-top:30px;color:#aaa;font-size:12px}';
  html += '@media(max-width:480px){.file{flex-direction:column;align-items:flex-start;gap:10px}.btn{width:100%;text-align:center;box-sizing:border-box}}</style>';
  html += '</head><body>';
  html += '<h1>🌿 食术养生 APK下载</h1>';
  html += '<p style="color:#666;font-size:14px">当前局域网地址: <code id="ip" style="background:#f0f0f0;padding:2px 6px;border-radius:4px">检测中...</code></p>';
  html += '<div style="margin-top:12px">';
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    var fp = path.join(APK_DIR, f);
    var stats = fs.statSync(fp);
    var size = stats.size;
    var sizeStr = size > 1024 * 1024 ? (size / 1024 / 1024).toFixed(1) + ' MB' : (size / 1024).toFixed(0) + ' KB';
    var isAPK = f.endsWith('.apk');
    var color = isAPK ? '#4A7C59' : '#5B7FBB';
    var label = isAPK ? 'APK' : 'AAB';
    var modified = stats.mtime.toISOString().substring(0, 10);
    html += '<div class="file">';
    html += '<div><div class="name">🌿 ' + f.replace('.apk','').replace('.aab','') + ' <span class="version" style="background:' + (isAPK?'#e8f5e9':'#e3f2fd') + ';color:' + color + '">' + label + '</span></div>';
    html += '<div class="meta">大小: ' + sizeStr + ' · 更新: ' + modified + '</div></div>';
    html += '<a class="btn" href="/' + encodeURIComponent(f) + '">⬇ 下载</a>';
    html += '</div>';
  }
  html += '</div>';
  html += '<div class="tip">💡 <b>安装提示</b>：首次安装需在设置中开启「允许安装未知来源应用」，安装后即可正常使用。</div>';
  html += '<div class="tip" style="background:#e3f2fd;border-color:#90caf9;color:#1565C0">📱 <b>二维码下载</b>（手机扫描）：将地址 <b>http://' + require('os').hostname() + ':8899</b> 在手机浏览器中打开即可下载APK</div>';
  html += '<div class="qr">食术养生 v0.1.0 · 服务器已启动 · 自动备份: 每6小时</div>';
  html += '<script>fetch("/__ip__").then(r=>r.text()).then(ip=>document.getElementById("ip").textContent=ip).catch(()=>{document.getElementById("ip").textContent="手动查看日志";});</script>';
  html += '</body></html>';
  res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
  res.end(html);
}

var server = http.createServer(function(req, res) {
  var url = req.url.split('?')[0];
  var pathname = decodeURIComponent(url);

  if (pathname === '/' || pathname === '/index.html') {
    serveAPKList(res);
    return;
  }

  if (pathname === '/__ip__') {
    var nets = require('os').networkInterfaces();
    var ips = [];
    for (var k in nets) {
      for (var j = 0; j < nets[k].length; j++) {
        var addr = nets[k][j];
        if (addr.family === 'IPv4' && !addr.internal) ips.push(addr.address);
      }
    }
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end(ips.join(', '));
    return;
  }

  if (pathname.startsWith('/.well-known/')) {
    // Asset links for TWA
    var assetPath = path.join(__dirname, 'frontend', pathname);
    if (fs.existsSync(assetPath)) {
      res.writeHead(200, {'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400'});
      res.end(fs.readFileSync(assetPath));
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
    return;
  }

  // APK file download
  var filename = pathname.replace(/^\//, '');
  var filePath = path.join(APK_DIR, filename);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    console.log('[' + new Date().toISOString() + '] 下载: ' + filename + ' (' + (fs.statSync(filePath).size / 1024 / 1024).toFixed(1) + 'MB)');
    var ext = path.extname(filename).toLowerCase();
    var ct = ext === '.apk' ? 'application/vnd.android.package-archive' : ext === '.aab' ? 'application/aab' : 'application/octet-stream';
    serveFile(res, filePath, ct);
  } else {
    res.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'});
    res.end('文件未找到: ' + filename);
  }
});

server.listen(PORT, '0.0.0.0', function() {
  var addr = server.address();
  console.log('APK下载服务器已启动: http://' + addr.address + ':' + addr.port);
  console.log('APK目录: ' + APK_DIR);
  var nets = require('os').networkInterfaces();
  for (var k in nets) {
    for (var j = 0; j < nets[k].length; j++) {
      var addr2 = nets[k][j];
      if (addr2.family === 'IPv4' && !addr2.internal) {
        console.log('📱 手机下载地址: http://' + addr2.address + ':' + PORT);
      }
    }
  }
});
