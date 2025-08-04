require('dotenv').config();
const axios = require('axios');
const XLSX = require('xlsx');
const { RestClientV5 } = require('bybit-api');
const path = require('path');

const GEMINI_URL = 'http://localhost:4000/api/gemini';
const KLINE_URL = 'http://localhost:4000/api/klines';
const TICKER_URL = 'http://localhost:4000/api/ticker';
const INTERVAL_MS = 60 * 1000;
const USER_FILE = path.resolve(__dirname, '../userInfo.xlsx');

function readUsers() {
  const wb = XLSX.readFile(USER_FILE);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet);
}

async function fetchGeminiSignal() {
  const { data: kline } = await axios.get(KLINE_URL, {
    params: { symbol: 'BTCUSDT', interval: '1', limit: '200' },
  });
  const { data } = await axios.post(GEMINI_URL, kline);
  return data.text || '';
}

function parseSignal(text) {
  const position = /포지션 추천:\s*(매수|매도|보류)/.exec(text)?.[1] || '보류';
  const leverage = parseInt(/추천 레버리지:\s*(\d+)배/.exec(text)?.[1], 10);
  const tp = /익절가[^$]*\$([\d.]+)/.exec(text)?.[1];
  const sl = /손절가[^$]*\$([\d.]+)/.exec(text)?.[1];
  return { position, leverage, takeProfit: tp, stopLoss: sl };
}

async function placeOrders(signal, users) {
  if (signal.position !== '매수') return;

  const priceRes = await axios.get(TICKER_URL, { params: { symbol: 'BTCUSDT' } });
  const lastPrice = parseFloat(priceRes.data?.result?.list?.[0]?.lastPrice || '0');

  for (const user of users) {
    if (user['now AI trading count(read Only)'] >= user['max AI trading count']) continue;
    if (Math.random() * 100 > (user['Reliability(%)'] || 0)) continue;

    const client = new RestClientV5({
      key: user['bybit API Key'],
      secret: user['bybit API Screet'],
      testnet: !!user.isTestNet,
    });

    const amount = user['Limit the amount used($)'] || 0;
    const qty = lastPrice > 0 ? (amount / lastPrice).toFixed(4) : '0';
    const leverage = Math.min(signal.leverage || 1, user.maxReverage || 1);

    try {
      await client.submitOrder({
        category: 'linear',
        symbol: 'BTCUSDT',
        side: 'Buy',
        orderType: 'Market',
        qty,
        leverage: String(leverage),
      });
      await client.setTradingStop({
        category: 'linear',
        symbol: 'BTCUSDT',
        ...(signal.takeProfit ? { takeProfit: signal.takeProfit } : {}),
        ...(signal.stopLoss ? { stopLoss: signal.stopLoss } : {}),
      });
      console.log(`Placed order for user ${user.id}`);
    } catch (err) {
      console.error(`Failed order for user ${user.id}:`, err.message);
    }
  }
}

async function run() {
  try {
    const text = await fetchGeminiSignal();
    const signal = parseSignal(text);
    console.log('[Gemini]', signal);
    if (signal.position === '매수') {
      const users = readUsers();
      await placeOrders(signal, users);
    }
  } catch (err) {
    console.error('Auto trader error:', err.message);
  }
}

setInterval(run, INTERVAL_MS);
run();
