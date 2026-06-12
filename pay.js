/**
 * 微信支付模块 — APIv3
 * 
 * 使用方法：
 * 1. 在 server.js 中 require('./pay')
 * 2. 配置 WXPAY_APPID, WXPAY_MCHID, WXPAY_API_KEY 环境变量
 * 3. 证书文件放在 backend/certs/ 目录下
 * 
 * 注意：APIv3 需要商户API证书（apiclient_key.pem + apiclient_cert.pem）
 */

const crypto = require('crypto');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ===== 配置（通过环境变量或直接修改） =====
const CONFIG = {
  appId: process.env.WXPAY_APPID || 'wxf58db167256b11d9',
  mchId: process.env.WXPAY_MCHID || '',        // ← 需要填你的商户号
  apiKey: process.env.WXPAY_API_KEY || '',      // ← APIv3 密钥（32位，在商户平台设置）
  apiKeyV2: process.env.WXPAY_API_V2_KEY || '', // ← APIv2 密钥（用于通知回调验签）
  certDir: path.join(__dirname, 'backend', 'certs'),
  notifyUrl: '',  // 支付回调地址，部署后设置
};

// 证书路径
function certPath(name) {
  return path.join(CONFIG.certDir, name);
}

/**
 * 生成商户订单号
 */
function generateOrderNo() {
  const now = new Date();
  const dateStr = now.getFullYear().toString()
    + String(now.getMonth() + 1).padStart(2, '0')
    + String(now.getDate()).padStart(2, '0');
  const rand = crypto.randomBytes(4).toString('hex');
  return `HP${dateStr}${rand}`;
}

/**
 * 获取微信支付 access_token（用于调用JSAPI）
 * 注意：需要商户号的接口调用凭据
 */
function getAccessToken() {
  // 简化版：用固定token（生产环境需定期刷新）
  // 实际项目中应该用 https://api.weixin.qq.com/cgi-bin/token 获取
  return Promise.resolve('');
}

/**
 * 构建 JSAPI 调起支付所需的参数
 * 
 * @param {string} prepayId - 统一下单返回的 prepay_id
 * @param {boolean} isMp - 是否为公众号支付（默认false，小程序支付）
 * @returns {Object} 前端调起支付所需的参数
 */
function buildPayParams(prepayId, isMp) {
  const appId = CONFIG.appId;
  const timeStamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = crypto.randomBytes(16).toString('hex');
  const packageStr = isMp ? `prepay_id=${prepayId}` : `prepay_id=${prepayId}`;

  // 小程序支付签名串
  const signStr = `${appId}\n${timeStamp}\n${nonceStr}\n${packageStr}\n`;
  
  // 使用 APIv3 密钥签名
  const sign = crypto.createHmac('sha256', CONFIG.apiKey)
    .update(signStr)
    .digest('hex');

  return {
    appId,
    timeStamp,
    nonceStr,
    package: packageStr,
    signType: 'HMAC-SHA256',
    paySign: sign,
  };
}

/**
 * 统一下单 (APIv3)
 * 
 * @param {Object} params
 * @param {string} params.openId - 用户微信openId
 * @param {string} params.description - 商品描述
 * @param {number} params.total - 金额（分）
 * @param {string} params.outTradeNo - 商户订单号
 * @param {string} params.notifyUrl - 回调地址
 * @returns {Promise<{prepayId: string, payParams: Object}>}
 */
async function unifiedOrder(params) {
  const { openId, description, total, outTradeNo, notifyUrl } = params;
  
  if (!CONFIG.mchId) {
    // 没有商户号时的模拟模式
    console.log('[PAY MOCK] 模拟统一下单:', { description, total });
    return mockUnifiedOrder(outTradeNo);
  }

  // 真实API调用
  // TODO: 需要加载商户证书，构造请求签名
  // 参考微信支付APIv3文档：
  // POST https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi
  
  const url = 'https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi';
  const body = {
    appid: CONFIG.appId,
    mchid: CONFIG.mchId,
    description,
    out_trade_no: outTradeNo,
    notify_url: notifyUrl || CONFIG.notifyUrl,
    amount: { total, currency: 'CNY' },
    payer: { openid: openId },
  };

  // 构造 Authorization 签名头（APIv3 需要商户证书签名）
  // 这里需要加载 apiclient_key.pem 来签名
  const method = 'POST';
  const uri = '/v3/pay/transactions/jsapi';
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomBytes(16).toString('hex');
  const bodyStr = JSON.stringify(body);
  
  // 签名串
  const signStr = `${method}\n${uri}\n${timestamp}\n${nonce}\n${bodyStr}\n`;
  
  try {
    // 读取商户证书私钥
    const privateKey = fs.readFileSync(certPath('apiclient_key.pem'), 'utf8');
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signStr);
    const signature = signer.sign(privateKey, 'base64');

    // 获取平台证书序列号（商户号 -> 微信支付平台）
    const serialNo = fs.readFileSync(certPath('serial_no.txt'), 'utf8').trim();

    const authStr = `WECHATPAY2-SHA256-RSA2048 ` +
      `mchid="${CONFIG.mchId}",` +
      `nonce_str="${nonce}",` +
      `timestamp="${timestamp}",` +
      `serial_no="${serialNo}",` +
      `signature="${signature}"`;

    const response = await axios.post(url, body, {
      headers: {
        'Authorization': authStr,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'wellness-app/1.0',
      },
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: true,
      }),
    });

    const prepayId = response.data.prepay_id;
    const payParams = buildPayParams(prepayId);
    
    return { prepayId, payParams };
  } catch (err) {
    console.error('[PAY] 统一下单失败:', err.response?.data || err.message);
    throw new Error('统一下单失败: ' + (err.response?.data?.message || err.message));
  }
}

/**
 * 模拟统一下单（无商户号时使用）
 */
async function mockUnifiedOrder(outTradeNo) {
  const fakePrepayId = `wx${Date.now()}${crypto.randomBytes(4).toString('hex')}`;
  const payParams = buildPayParams(fakePrepayId);
  return { prepayId: fakePrepayId, payParams };
}

/**
 * 验证支付回调通知（APIv3）
 * 
 * @param {Object} headers - 请求头
 * @param {string} body - 原始请求体
 * @returns {Object|null} 解析后的回调数据
 */
function verifyNotify(headers, body) {
  const { 'wechatpay-signature': signature, 'wechatpay-timestamp': timestamp,
    'wechatpay-nonce': nonce, 'wechatpay-serial': serial } = headers;

  // 验证签名
  const signStr = `${timestamp}\n${nonce}\n${body}\n`;
  
  // 获取微信支付平台证书
  try {
    const platformCert = fs.readFileSync(certPath('wechatpay_platform_cert.pem'), 'utf8');
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(signStr);
    const isValid = verifier.verify(platformCert, signature, 'base64');
    
    if (!isValid) {
      console.error('[PAY] 回调签名验证失败');
      return null;
    }
    
    // 解密 resource 中的数据（AES-256-GCM）
    const resource = JSON.parse(body).resource;
    const ciphertext = Buffer.from(resource.ciphertext, 'base64');
    const associatedData = resource.associated_data;
    const nonceAes = resource.nonce;
    
    const authTag = ciphertext.slice(ciphertext.length - 16);
    const data = ciphertext.slice(0, ciphertext.length - 16);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', CONFIG.apiKey, nonceAes);
    decipher.setAAD(Buffer.from(associatedData));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(data);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return JSON.parse(decrypted.toString('utf8'));
  } catch (err) {
    console.error('[PAY] 回调处理失败:', err.message);
    return null;
  }
}

module.exports = {
  CONFIG,
  generateOrderNo,
  unifiedOrder,
  mockUnifiedOrder,
  buildPayParams,
  verifyNotify,
};
