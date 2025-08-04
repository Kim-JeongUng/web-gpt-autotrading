require('dotenv').config();
const axios = require('axios');
const XLSX = require('xlsx');
const path = require('path');

const GEMINI_URL = 'http://localhost:4000/api/gemini';
const KLINE_URL = 'http://localhost:4000/api/klines';
const TICKER_URL = 'http://localhost:4000/api/ticker';
const ORDER_URL = 'http://localhost:4000/api/order';
const SET_CREDENTIALS_URL = 'http://localhost:4000/api/set-credentials';
const INTERVAL_MS = 60 * 1000;
const USER_FILE = path.resolve(__dirname, '../userInfo.xlsx');

function readUsers() {
  const wb = XLSX.readFile(USER_FILE);
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0];
  const users = XLSX.utils.sheet_to_json(sheet);
  return { wb, sheetName, headers, users };
}

function writeUsers({ wb, sheetName, headers, users }) {
  const sheet = XLSX.utils.json_to_sheet(users, { header: headers });
  wb.Sheets[sheetName] = sheet;
  XLSX.writeFile(wb, USER_FILE);
}

async function fetchGeminiSignal() {
  const { data: kline } = await axios.get(KLINE_URL, {
    params: { symbol: 'BTCUSDT', interval: '1', limit: '200' },
  });
  const { data } = await axios.post(GEMINI_URL, kline);
  return data.text || '';
}

function parseSignal(text) {
  const posMatch = /(포지션 추천|position)\s*[:\-]?\s*(매수|매도|long|short)/i.exec(text);
  let position = posMatch ? posMatch[2].toLowerCase() : null;
  if (position === '매수') position = 'long';
  if (position === '매도') position = 'short';

  const levMatch = /(추천 레버리지|leverage)\s*[:\-]?\s*(\d+)/i.exec(text);
  const leverage = levMatch ? parseInt(levMatch[2], 10) : null;

  const tp = /(익절가|take profit)[^$]*\$([\d.]+)/i.exec(text)?.[2];
  const sl = /(손절가|stop loss)[^$]*\$([\d.]+)/i.exec(text)?.[2];

  return { position, leverage, takeProfit: tp, stopLoss: sl };
}

async function placeOrders(signal, usersData) {
  const { users, wb, sheetName, headers } = usersData;
  if (!signal.position) return;

  const priceRes = await axios.get(TICKER_URL, { params: { symbol: 'BTCUSDT' } });
  const lastPrice = parseFloat(priceRes.data?.result?.list?.[0]?.lastPrice || '0');

  const side = signal.position === 'long' ? 'Buy' : signal.position === 'short' ? 'Sell' : null;
  if (!side) return;

  for (const user of users) {
    if (user['now AI trading count(read Only)'] >= user['max AI trading count']) continue;
    if (Math.random() * 100 > (user['Reliability(%)'] || 0)) continue;

    const amount = user['Limit the amount used($)'] || 0;
    const qty = lastPrice > 0 ? (amount / lastPrice).toFixed(4) : '0';
    const leverage = Math.min(signal.leverage || 1, user.maxReverage || 1);

    try {
      await axios.post(SET_CREDENTIALS_URL, {
        apiKey: user['bybit API Key'],
        apiSecret: user['bybit API Screet'],
        testnet: !!user.isTestNet,
      });

      await axios.post(ORDER_URL, {
        symbol: 'BTCUSDT',
        side,
        orderType: 'Market',
        qty,
        leverage,
        ...(signal.takeProfit ? { takeProfit: signal.takeProfit } : {}),
        ...(signal.stopLoss ? { stopLoss: signal.stopLoss } : {}),
      });

      user['now AI trading count(read Only)'] =
        (user['now AI trading count(read Only)'] || 0) + 1;

      console.log('✅ 주문 완료');
      console.log(`📌 유저 ID: ${user.id}`);
      console.log(`🔑 API KEY (앞 6자리): ${user['bybit API Key'].slice(0, 6)}...`);
      console.log(`📉 현재 가격: ${lastPrice}`);
      console.log(`📦 주문 수량(BTC): ${qty}`);
      console.log(`📈 레버리지: ${leverage}x`);
      console.log(`📄 포지션 방향: ${signal.position} → ${side}`);
      console.log(`💰 매수 금액($): ${amount}`);
      if (signal.takeProfit) console.log(`🎯 익절가: $${signal.takeProfit}`);
      if (signal.stopLoss) console.log(`🛑 손절가: $${signal.stopLoss}`);
      console.log('----------------------------------------');
    } catch (err) {
      console.error(`❌ 주문 실패 - 유저 ID: ${user.id}:`, err.message);
    }
  }

  writeUsers({ wb, sheetName, headers, users });
}


async function run() {
  try {
    const text = await fetchGeminiSignal();
    const signal = parseSignal(text);
    console.log('[Gemini]', signal);
    if (signal.position === 'long' || signal.position === 'short') {
      const usersData = readUsers();
      await placeOrders(signal, usersData);
    }
  } catch (err) {
    console.error('Auto trader error:', err.message);
  }
}

setInterval(run, INTERVAL_MS);
run();

