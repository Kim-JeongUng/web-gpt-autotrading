require('dotenv').config();
const axios = require('axios');
const xlsx = require('xlsx');
const path = require('path');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4000';

function readUsers() {
  const workbook = xlsx.readFile(path.join(__dirname, '../userInfo.xlsx'));
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return xlsx.utils.sheet_to_json(sheet, { defval: '' });
}

function parseAnalysis(text) {
  const positionMatch = text.match(/포지션 추천:\s*(매수|매도|보류)/);
  const leverageMatch = text.match(/추천 레버리지:\s*(\d+)/);
  const tpMatch = text.match(/익절가[^$]*\$([0-9.]+)/);
  const slMatch = text.match(/손절가[^$]*\$([0-9.]+)/);

  return {
    position: positionMatch ? positionMatch[1] : undefined,
    leverage: leverageMatch ? parseInt(leverageMatch[1], 10) : undefined,
    tp: tpMatch ? parseFloat(tpMatch[1]) : undefined,
    sl: slMatch ? parseFloat(slMatch[1]) : undefined,
  };
}

async function executeTrade(analysis) {
  if (!analysis.position || analysis.position === '보류') {
    return;
  }

  const users = readUsers();
  const tickerRes = await axios.get(`${SERVER_URL}/api/ticker`, {
    params: { symbol: 'BTCUSDT', category: 'linear' },
  });
  const price = parseFloat(tickerRes.data?.result?.list?.[0]?.lastPrice);

  for (const user of users) {
    const maxCount = Number(user['max AI trading count'] || 0);
    const nowCount = Number(user['now AI trading count(read Only)'] || 0);
    if (nowCount >= maxCount) continue;

    const useAmt = Number(user['Limit the amount used($)'] || 0);
    const qty = (useAmt / price).toFixed(3);
    const leverage = Math.min(
      analysis.leverage || 1,
      Number(user['maxReverage(1x~100x)'] || 1),
    );

    await axios.post(`${SERVER_URL}/api/set-credentials`, {
      apiKey: user['bybit API Key'],
      apiSecret: user['bybit API Screet'],
      testnet: user['isTestNet'] == 1,
    });

    await axios.post(`${SERVER_URL}/api/order`, {
      symbol: 'BTCUSDT',
      side: analysis.position === '매수' ? 'Buy' : 'Sell',
      orderType: 'Market',
      qty,
      leverage,
    });

    await axios.post(`${SERVER_URL}/api/trading-stop`, {
      symbol: 'BTCUSDT',
      takeProfit: analysis.tp,
      stopLoss: analysis.sl,
    });
  }
}

async function runCycle() {
  try {
    const klineRes = await axios.get(`${SERVER_URL}/api/klines`, {
      params: { symbol: 'BTCUSDT', interval: '1', limit: '200' },
    });
    const geminiRes = await axios.post(`${SERVER_URL}/api/gemini`, klineRes.data);
    const analysis = parseAnalysis(geminiRes.data.text || '');
    console.log(
      `[Gemini] position=${analysis.position} leverage=${analysis.leverage} tp=${analysis.tp} sl=${analysis.sl}`,
    );
    await executeTrade(analysis);
  } catch (err) {
    console.error('AutoTrader error:', err.message);
  }
}

runCycle();
setInterval(runCycle, 60 * 1000);
