require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const cookieParser = require('cookie-parser');
const { RestClientV5 } = require('bybit-api');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const app = express();

// CORS 설정
app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true, // 쿠키 및 세션을 프론트에서 허용
  }),
);

app.use(express.json());
app.use(cookieParser());

// 세션 설정 (passport 세션 지원용)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // HTTPS 환경에서는 true로 변경
      maxAge: 1000 * 60 * 60, // 1시간
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

// Passport: user serialize / deserialize
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Passport: Google OAuth 전략 설정
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    (accessToken, refreshToken, profile, done) => {
      // 사용자 DB 저장 로직 여기에 구현 가능
      const user = {
        id: profile.id,
        displayName: profile.displayName,
        email: profile.emails[0].value,
        accessToken,
        refreshToken,
      };
      return done(null, user);
    },
  ),
);

// --- OAuth 라우트 ---
// 구글 로그인 시작
app.get(
  '/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    accessType: 'offline',
    prompt: 'consent', // 강제 동의 화면 표시 (refreshToken 재발급 위해)
  }),
);

// 구글 로그인 콜백
app.get(
  '/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: 'http://localhost:3000/login',
  }),
  (req, res) => {
    res.cookie('accessToken', req.user.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // 운영환경에서 true
      maxAge: 1000 * 60 * 60, // 1시간
      sameSite: 'lax',
      path: '/',
    });

    res.cookie('refreshToken', req.user.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30일
      sameSite: 'lax',
      path: '/',
    });

    res.redirect('http://localhost:3000/dashboard');
  },
);

// Bybit API 초기화 및 재설정 함수
let restClient = new RestClientV5({
  key: process.env.BYBIT_API_KEY,
  secret: process.env.BYBIT_API_SECRET,
  testnet: process.env.BYBIT_TESTNET === 'true',
});

function initRestClient({ apiKey, apiSecret, testnet }) {
  restClient = new RestClientV5({
    key: apiKey,
    secret: apiSecret,
    testnet,
  });
}

// Bybit API 관련 엔드포인트들

app.get('/api/klines', async (req, res) => {
  try {
    const {
      symbol = 'BTCUSDT',
      interval = '1',
      limit = '200',
      category = 'linear',
      start,
      end,
    } = req.query;

    const result = await restClient.getKline({
      category,
      symbol,
      interval: interval.toString(),
      limit: parseInt(limit, 10),
      ...(start ? { start: parseInt(start, 10) } : {}),
      ...(end ? { end: parseInt(end, 10) } : {}),
    });

    res.json(result);
  } catch (err) {
    console.error('Error fetching klines:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/balance', async (req, res) => {
  try {
    const result = await restClient.getWalletBalance({
      accountType: 'UNIFIED',
    });
    res.json(result);
  } catch (err) {
    console.error('Error fetching balance:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/positions', async (req, res) => {
  try {
    const result = await restClient.getPositionInfo({ category: 'linear' });
    res.json(result);
  } catch (err) {
    console.error('Error fetching positions:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ticker', async (req, res) => {
  try {
    const { symbol = 'BTCUSDT', category = 'linear' } = req.query;
    const result = await restClient.getTickers({ category, symbol });
    res.json(result);
  } catch (err) {
    console.error('Error fetching ticker:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orderbook', async (req, res) => {
  try {
    const { symbol = 'BTCUSDT', category = 'linear', limit = 25 } = req.query;
    const result = await restClient.getOrderbook({
      category,
      symbol,
      limit: parseInt(limit, 10),
    });
    res.json(result);
  } catch (err) {
    console.error('Error fetching orderbook:', err);
    res.status(500).json({ error: err.message });
  }
});

// Additional public market data endpoints
app.get('/api/mark-price-kline', async (req, res) => {
  try {
    const {
      symbol = 'BTCUSDT',
      interval = '1',
      limit = '200',
      category = 'linear',
    } = req.query;
    const result = await restClient.getMarkPriceKline({
      category,
      symbol,
      interval: interval.toString(),
      limit: parseInt(limit, 10),
    });
    res.json(result);
  } catch (err) {
    console.error('Error fetching mark price kline:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/index-price-kline', async (req, res) => {
  try {
    const {
      symbol = 'BTCUSDT',
      interval = '1',
      limit = '200',
      category = 'linear',
    } = req.query;
    const result = await restClient.getIndexPriceKline({
      category,
      symbol,
      interval: interval.toString(),
      limit: parseInt(limit, 10),
    });
    res.json(result);
  } catch (err) {
    console.error('Error fetching index price kline:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/funding-history', async (req, res) => {
  try {
    const { symbol = 'BTCUSDT', category = 'linear', limit = '200' } = req.query;
    const result = await restClient.getFundingRateHistory({
      category,
      symbol,
      limit: parseInt(limit, 10),
    });
    res.json(result);
  } catch (err) {
    console.error('Error fetching funding history:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/open-interest', async (req, res) => {
  try {
    const {
      symbol = 'BTCUSDT',
      category = 'linear',
      intervalTime = '5min',
      limit = '200',
    } = req.query;
    const result = await restClient.getOpenInterest({
      category,
      symbol,
      intervalTime: intervalTime.toString(),
      limit: parseInt(limit, 10),
    });
    res.json(result);
  } catch (err) {
    console.error('Error fetching open interest:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/long-short-ratio', async (req, res) => {
  try {
    const {
      symbol = 'BTCUSDT',
      category = 'linear',
      period = '5min',
      limit = '200',
    } = req.query;
    const result = await restClient.getLongShortRatio({
      category,
      symbol,
      period: period.toString(),
      limit: parseInt(limit, 10),
    });
    res.json(result);
  } catch (err) {
    console.error('Error fetching long short ratio:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/recent-trade', async (req, res) => {
  try {
    const { symbol = 'BTCUSDT', category = 'linear', limit = '1000' } = req.query;
    const result = await restClient.getPublicTradingHistory({
      category,
      symbol,
      limit: parseInt(limit, 10),
    });
    res.json(result);
  } catch (err) {
    console.error('Error fetching recent trade:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const result = await restClient.getActiveOrders({ category: 'linear' });
    const count = result?.result?.list?.length || 0;
    if (count > 0) {
      console.log('Fetched', count, 'active orders');
    }
    res.json(result);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/validate', async (req, res) => {
  const { apiKey, apiSecret, testnet } = req.body;
  const isTestnet = testnet === true || testnet === 'true';

  console.log('Received validate request:', { apiKey, testnet, isTestnet });

  const client = new RestClientV5({
    key: apiKey,
    secret: apiSecret,
    testnet: isTestnet,
  });

  try {
    await client.getWalletBalance({ accountType: 'UNIFIED' });
    console.log('API credentials validated successfully');
    res.json({ valid: true });
  } catch (err) {
    console.log('API credential validation failed:', err.message);
    res.status(400).json({ valid: false, error: err.message });
  }
});

app.post('/api/set-credentials', (req, res) => {
  const { apiKey, apiSecret, testnet } = req.body;
  try {
    initRestClient({
      apiKey,
      apiSecret,
      testnet: testnet === true || testnet === 'true',
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to set credentials:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/order', async (req, res) => {
  console.log('Received order request:', req.body);
  try {
    const {
      symbol,
      side,
      orderType = 'Market',
      qty,
      price,
      leverage,
      positionIdx,
      takeProfit,
      stopLoss,
    } = req.body;

    if (leverage) {
      await restClient.setLeverage({
        category: 'linear',
        symbol,
        buyLeverage: leverage.toString(),
        sellLeverage: leverage.toString(),
      });
    }

    const result = await restClient.submitOrder({
      category: 'linear',
      symbol,
      side,
      orderType,
      qty: qty.toString(),
      price,
      positionIdx: positionIdx ?? 0,
      ...(takeProfit ? { takeProfit, tpSlMode: 'Full' } : {}),
      ...(stopLoss ? { stopLoss, tpSlMode: 'Full' } : {}),
    });

    console.log('Order result:', result);
    res.json({ success: true, result });
  } catch (err) {
    console.error('Error placing order:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/amend-order', async (req, res) => {
  try {
    const { symbol, orderId, qty, price } = req.body;

    const result = await restClient.amendOrder({
      category: 'linear',
      symbol,
      orderId,
      ...(qty ? { qty: qty.toString() } : {}),
      ...(price ? { price } : {}),
    });
    res.json(result);
  } catch (err) {
    console.error('Error amending order:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/close-position', async (req, res) => {
  try {
    const { symbol, side, qty, positionIdx } = req.body;

    const result = await restClient.submitOrder({
      category: 'linear',
      symbol,
      side,
      orderType: 'Market',
      qty: qty.toString(),
      positionIdx: positionIdx ?? 0,
      reduceOnly: true,
    });

    res.json(result);
  } catch (err) {
    console.error('Error closing position:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/trading-stop', async (req, res) => {
  try {
    const { symbol, takeProfit, stopLoss, positionIdx } = req.body;

    const result = await restClient.setTradingStop({
      category: 'linear',
      symbol,
      ...(takeProfit ? { takeProfit } : {}),
      ...(stopLoss ? { stopLoss } : {}),
      positionIdx: positionIdx ?? 0,
    });

    res.json(result);
  } catch (err) {
    console.error('Error updating position:', err);
    res.status(500).json({ error: err.message });
  }
});

// 필요시 GPT, Gemini API 관련 라우트도 여기에 추가하세요...

// 서버 시작
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Validate API credentials by attempting a private request
// app.post('/api/validate', async (req, res) => {
//   const { apiKey, apiSecret, testnet = false } = req.body;
//   console.log("Sent to server:", { apiKey, apiSecret, testnet });

//   const client = new RestClientV5({ key: apiKey, secret: apiSecret, testnet });
//   try {
//     await client.getWalletBalance({ accountType: 'UNIFIED' });
//     console.log("Calling:", `${SERVER_URL}/api/validate`)

//     console.log('API credentials validated successfully');
//     res.json({ valid: true });
//   } catch (err) {
//     console.log('API credential validation failed:', err.message);
//     res.status(400).json({ valid: false, error: err.message });
//   }
// });

// app.post('/api/gpt', async (req, res) => {
//   try {
//     const coinInfo = req.body;
//     const prompt =
//       '당신은 고도로 숙련된 트레이더이자 차트 분석 전문가입니다.\\n\\n' +
//       `${JSON.stringify(coinInfo)}\\n\\n` +
//       '모두 RSI 지표, 볼린저밴드, 캔들 패턴이 포함되어 있습니다.\\n\\n' +
//       '### 분석 요청 사항:\\n' +
//       '1. 현재 시점에서의 최적 포지션을 선택해주세요:\\n   - 매수 (Long) / 매도 (Short) / 보류 (No Trade)\\n' +
//       '2. 선택한 포지션이 적절한 이유를 RSI, 볼린저밴드, 캔들 패턴 기반으로 설명해주세요.\\n' +
//       '3. 적절한 레버리지 (1x ~ 50x) 를 제안해주세요.\\n' +
//       '4. 진입 시점 기준:\\n   - **익절가와 예상 수익률(%)**\\n   - **손절가와 예상 손실률(%)**\\n\\n' +
//       '### 응답 형식 (꼭 아래 구조를 따라주세요):\\n---\\n📈 **포지션 추천:** 매수 / 매도 / 보류\\n🔁 **추천 레버리지:** X배\\n🎯 **익절가 및 예상 수익률:** $XX / +XX%\\n🛑 **손절가 및 예상 손실률:** $XX / -XX%\\n📊 **분석 근거:**\\n- RSI 상태 (과매수/과매도 여부)\\n- 볼린저밴드 위치 (상단 돌파 / 하단 이탈 등)\\n- 캔들 패턴 해석 (반전/지속 가능성)\\n- 1분, 5분, 15분봉 간 흐름 일치 여부\\n\\n모든 수치는 전략적 트레이딩 의사결정 보조용입니다. 정확한 근거 기반 판단만 제시해주세요.';
//     const response = await axios.post(
//       'https://api.openai.com/v1/chat/completions',
//       {
//         model: 'gpt-4o',
//         temperature: 0.3,
//         messages: [
//           { role: 'user', content: prompt },
//         ],
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
//           'Content-Type': 'application/json',
//         },
//       },
//     );
//     const text = response.data.choices?.[0]?.message?.content || '';
//     console.log('GPT Response:', text);
//     res.json({ text });
//   } catch (err) {
//     console.error('Error fetching GPT analysis:', err.response?.data || err.message);
//     res.status(500).json({ error: 'Failed to fetch GPT analysis' });
//   }
// });


app.post('/api/gemini', async (req, res) => {
  try {
    const { symbol = 'BTCUSDT', category = 'linear' } = req.body;
    const [kl, markKl, idxKl, fund, oi, lsr, trades] = await Promise.all([
      restClient.getKline({ category, symbol, interval: '1', limit: 200 }),
      restClient.getMarkPriceKline({ category, symbol, interval: '1', limit: 200 }),
      restClient.getIndexPriceKline({ category, symbol, interval: '1', limit: 200 }),
      restClient.getFundingRateHistory({ category, symbol, limit: 200 }),
      restClient.getOpenInterest({ category, symbol, intervalTime: '5min', limit: 200 }),
      restClient.getLongShortRatio({ category, symbol, period: '5min', limit: 200 }),
      restClient.getPublicTradingHistory({ category, symbol, limit: 1000 }),
    ]);
    const toNum = (s) => (s ? Number(s) : 0);

    const candles = (kl.result.list || [])
      .map((r) => [
        Math.floor(Number(r[0]) / 1000),
        toNum(r[1]),
        toNum(r[2]),
        toNum(r[3]),
        toNum(r[4]),
        toNum(r[5]),
      ])
      .filter((r) => Number.isFinite(r[0]))
      .sort((a, b) => a[0] - b[0]);

    const markLine = (markKl.result.list || [])
      .map((r) => [Math.floor(Number(r[0]) / 1000), toNum(r[4])])
      .filter((r) => Number.isFinite(r[0]))
      .sort((a, b) => a[0] - b[0]);

    const indexLine = (idxKl.result.list || [])
      .map((r) => [Math.floor(Number(r[0]) / 1000), toNum(r[4])])
      .filter((r) => Number.isFinite(r[0]))
      .sort((a, b) => a[0] - b[0]);

    const fundingRate = (fund.result.list || [])
      .map((x) => [
        Math.floor(
          Number(x.fundingRateTimestamp || x.fundingTime || x.timestamp) / 1000,
        ),
        Number(x.fundingRate) * 100,
      ])
      .filter((r) => Number.isFinite(r[0]))
      .sort((a, b) => a[0] - b[0]);

    const oiLine = [];
    let prevOi = 0;
    (oi.result.list || []).forEach((x) => {
      const time = Math.floor(Number(x.timestamp || x[0]) / 1000);
      const value = toNum(x.openInterest || x[1]);
      if (!Number.isFinite(time)) return;
      oiLine.push([time, value, value - prevOi]);
      prevOi = value;
    });
    oiLine.sort((a, b) => a[0] - b[0]);

    const lsrLine = (lsr.result.list || [])
      .map((x) => [
        Math.floor(Number(x.timestamp || x[0]) / 1000),
        toNum(x.buyRatio ?? x[1]) * 100,
      ])
      .filter((r) => Number.isFinite(r[0]))
      .sort((a, b) => a[0] - b[0]);

    const buckets = {};
    (trades.result.list || []).forEach((t) => {
      const ts = Math.floor(Number(t.execTime) / 1000);
      const m = Math.floor(ts / 60) * 60;
      if (!buckets[m]) buckets[m] = { buy: 0, sell: 0 };
      const qty = toNum(t.execQty);
      if (t.side === 'Buy') buckets[m].buy += qty;
      else buckets[m].sell += qty;
    });
    const imbalance = Object.entries(buckets)
      .map(([time, { buy, sell }]) => {
        const total = buy + sell;
        return [Number(time), buy, sell, total ? (buy - sell) / total : 0];
      })
      .sort((a, b) => a[0] - b[0]);

    const schema = {
      candles: ['time', 'open', 'high', 'low', 'close', 'volume'],
      markLine: ['time', 'value'],
      indexLine: ['time', 'value'],
      fundingRate: ['time', 'value'],
      openInterest: ['time', 'value', 'delta'],
      longShortRatio: ['time', 'value'],
      tradeImbalance: ['time', 'buy', 'sell', 'imbalance'],
    };

    const coinInfo = {
      symbol,
      schema,
      candles,
      markLine,
      indexLine,
      fundingRate,
      openInterest: oiLine,
      longShortRatio: lsrLine,
      tradeImbalance: imbalance,
    };

    const prompt =
      '당신은 고도로 숙련된 트레이더이자 차트 분석 전문가입니다.\n\n' +
      `${JSON.stringify(coinInfo)}\n\n` +
      '모두 RSI 지표, 볼린저밴드, 캔들 패턴이 포함되어 있습니다. 또한 1분봉을 기준으로 5분봉이나 15분을 만들 수 있으니, 감안해서 모든 RSI 를 계산 후 생각하세요.\n\n' +
      '### 분석 요청 사항:\n' +
      '1. 현재 시점에서의 최적 포지션을 선택해주세요:\n   - 매수 (Long) / 매도 (Short)\n 보류는 없습니다. 무조건 매수 또는 매도로 선택하세요.' +
      '2. 선택한 포지션이 적절한 이유를 RSI, 볼린저밴드, 캔들 패턴 기반으로 설명해주세요.\n' +
      '3. 적절한 레버리지 (1x ~ 50x) 를 제안해주세요.\n' +
      '4. 진입 시점 기준:\n   - **익절가와 예상 수익률(%)**\n   - **손절가와 예상 손실률(%)**\n\n' +
      '응답 형식 (꼭 아래 구조를 따라주세요):\n---\n포지션 추천: 매수 (Long) / 매도 (Short) \n 추천 레버리지: X배 \n 익절가및 예상 수익률: $XX / +XX%\n손절가 및 예상 손실률: $XX / -XX% \n 분석 근거: \n- RSI 상태 (과매수/과매도 여부) \n- 볼린저밴드 위치 (상단 돌파 / 하단 이탈 등)\n - 캔들 패턴 해석 (반전/지속 가능성)\n \n- 1분, 5분, 15분봉 간 흐름 일치 여부\n 모든 수치는 전략적 트레이딩 의사결정 보조용입니다. 정확한 근거 기반 판단만 제시해주세요.';
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
      },
    );
    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('Gemini Response:', text);
    res.json({ text });
  } catch (err) {
    console.error('Error fetching Gemini analysis:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch Gemini analysis' });
  }
});
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
