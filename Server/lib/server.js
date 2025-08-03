var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { RestClientV5 } = require('bybit-api');
const axios = require('axios');
const app = express();
app.use(cors());
app.use(express.json());
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
// Initialize with environment variables on startup
initRestClient({
    apiKey: process.env.BYBIT_API_KEY,
    apiSecret: process.env.BYBIT_API_SECRET,
    testnet: process.env.BYBIT_TESTNET === 'true',
});
app.get('/api/klines', (req, res) => __awaiter(this, void 0, void 0, function* () {
    try {
        const { symbol = 'BTCUSDT', interval = '1', limit = '200', category = 'linear', start, end, } = req.query;
        const result = yield restClient.getKline(Object.assign(Object.assign({ category,
            symbol, interval: interval.toString(), limit: parseInt(limit, 10) }, (start ? { start: parseInt(start, 10) } : {})), (end ? { end: parseInt(end, 10) } : {})));
        res.json(result);
    }
    catch (err) {
        console.error('Error fetching klines:', err);
        res.status(500).json({ error: err.message });
    }
}));
app.get('/api/balance', (req, res) => __awaiter(this, void 0, void 0, function* () {
    try {
        const result = yield restClient.getWalletBalance({ accountType: 'UNIFIED' });
        res.json(result);
    }
    catch (err) {
        console.error('Error fetching balance:', err);
        res.status(500).json({ error: err.message });
    }
}));
app.get('/api/positions', (req, res) => __awaiter(this, void 0, void 0, function* () {
    try {
        const result = yield restClient.getPositionInfo({ category: 'linear' });
        res.json(result);
    }
    catch (err) {
        console.error('Error fetching positions:', err);
        res.status(500).json({ error: err.message });
    }
}));
app.get('/api/ticker', (req, res) => __awaiter(this, void 0, void 0, function* () {
    try {
        const { symbol = 'BTCUSDT', category = 'linear' } = req.query;
        const result = yield restClient.getTickers({ category, symbol });
        res.json(result);
    }
    catch (err) {
        console.error('Error fetching ticker:', err);
        res.status(500).json({ error: err.message });
    }
}));
app.get('/api/orderbook', (req, res) => __awaiter(this, void 0, void 0, function* () {
    try {
        const { symbol = 'BTCUSDT', category = 'linear', limit = 25 } = req.query;
        const result = yield restClient.getOrderbook({
            category,
            symbol,
            limit: parseInt(limit, 10),
        });
        res.json(result);
    }
    catch (err) {
        console.error('Error fetching orderbook:', err);
        res.status(500).json({ error: err.message });
    }
}));
app.get('/api/orders', (req, res) => __awaiter(this, void 0, void 0, function* () {
    var _a, _b;
    try {
        const result = yield restClient.getActiveOrders({ category: 'linear' });
        const count = ((_b = (_a = result === null || result === void 0 ? void 0 : result.result) === null || _a === void 0 ? void 0 : _a.list) === null || _b === void 0 ? void 0 : _b.length) || 0;
        console.log('Fetched', count, 'active orders');
        res.json(result);
    }
    catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).json({ error: err.message });
    }
}));
app.get('/api/account', (req, res) => __awaiter(this, void 0, void 0, function* () {
    try {
        const [balance, positions, orders] = yield Promise.all([
            restClient.getWalletBalance({ accountType: 'UNIFIED' }),
            restClient.getPositionInfo({ category: 'linear' }),
            restClient.getActiveOrders({ category: 'linear' }),
        ]);
        const balanceData = balance.result || balance;
        const positionsList = ((positions === null || positions === void 0 ? void 0 : positions.result) && positions.result.list) || positions.list || [];
        const ordersList = ((orders === null || orders === void 0 ? void 0 : orders.result) && orders.result.list) || orders.list || [];
        const list = balanceData.list || [];
        const item = Array.isArray(list) ? list[0] : balanceData;
        const totalEquity = parseFloat((item === null || item === void 0 ? void 0 : item.totalEquity) || (item === null || item === void 0 ? void 0 : item.walletBalance) || '0');
        const totalPnl = positionsList.reduce((sum, p) => sum + parseFloat((p === null || p === void 0 ? void 0 : p.unrealisedPnl) || '0'), 0);
        res.json({ balance: balanceData, positions: positionsList, orders: ordersList, totalEquity, totalPnl });
    }
    catch (err) {
        console.error('Error fetching account overview:', err);
        res.status(500).json({ error: err.message });
    }
}));
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
app.post('/api/validate', (req, res) => __awaiter(this, void 0, void 0, function* () {
    const { apiKey, apiSecret, testnet } = req.body;
    const isTestnet = testnet === true || testnet === 'true';
    console.log('Received validate request:', { apiKey, testnet, isTestnet });
    const client = new RestClientV5({
        key: apiKey,
        secret: apiSecret,
        testnet: isTestnet,
    });
    try {
        yield client.getWalletBalance({ accountType: 'UNIFIED' });
        console.log('API credentials validated successfully');
        res.json({ valid: true });
    }
    catch (err) {
        console.log('API credential validation failed:', err.message);
        res.status(400).json({ valid: false, error: err.message });
    }
}));
app.post('/api/set-credentials', (req, res) => {
    const { apiKey, apiSecret, testnet } = req.body;
    try {
        initRestClient({
            apiKey,
            apiSecret,
            testnet: testnet === true || testnet === 'true',
        });
        res.json({ success: true });
    }
    catch (err) {
        console.error('Failed to set credentials:', err);
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/order', (req, res) => __awaiter(this, void 0, void 0, function* () {
    try {
        const { symbol, side, orderType = 'Market', qty, price, leverage, positionIdx } = req.body;
        if (leverage) {
            yield restClient.setLeverage({
                category: 'linear',
                symbol,
                buyLeverage: leverage.toString(),
                sellLeverage: leverage.toString(),
            });
        }
        const result = yield restClient.submitOrder({
            category: 'linear',
            symbol,
            side,
            orderType,
            qty: qty.toString(),
            price,
            positionIdx: positionIdx !== null && positionIdx !== void 0 ? positionIdx : 0,
        });
        res.json(result);
    }
    catch (err) {
        console.error('Error placing order:', err);
        res.status(500).json({ error: err.message });
    }
}));
app.post('/api/amend-order', (req, res) => __awaiter(this, void 0, void 0, function* () {
    try {
        const { symbol, orderId, qty, price } = req.body;
        const result = yield restClient.amendOrder(Object.assign(Object.assign({ category: 'linear', symbol,
            orderId }, (qty ? { qty: qty.toString() } : {})), (price ? { price } : {})));
        res.json(result);
    }
    catch (err) {
        console.error('Error amending order:', err);
        res.status(500).json({ error: err.message });
    }
}));
app.post('/api/close-position', (req, res) => __awaiter(this, void 0, void 0, function* () {
    try {
        const { symbol, side, qty, positionIdx } = req.body;
        const result = yield restClient.submitOrder({
            category: 'linear',
            symbol,
            side,
            orderType: 'Market',
            qty: qty.toString(),
            positionIdx: positionIdx !== null && positionIdx !== void 0 ? positionIdx : 0,
            reduceOnly: true,
        });
        res.json(result);
    }
    catch (err) {
        console.error('Error closing position:', err);
        res.status(500).json({ error: err.message });
    }
}));
app.post('/api/trading-stop', (req, res) => __awaiter(this, void 0, void 0, function* () {
    try {
        const { symbol, takeProfit, stopLoss, positionIdx } = req.body;
        const result = yield restClient.setTradingStop(Object.assign(Object.assign(Object.assign({ category: 'linear', symbol }, (takeProfit ? { takeProfit } : {})), (stopLoss ? { stopLoss } : {})), { positionIdx: positionIdx !== null && positionIdx !== void 0 ? positionIdx : 0 }));
        res.json(result);
    }
    catch (err) {
        console.error('Error updating position:', err);
        res.status(500).json({ error: err.message });
    }
}));
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
app.post('/api/gemini', (req, res) => __awaiter(this, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const coinInfo = req.body;
        const prompt = '당신은 고도로 숙련된 트레이더이자 차트 분석 전문가입니다.\\n\\n' +
            `${JSON.stringify(coinInfo)}\\n\\n` +
            '모두 RSI 지표, 볼린저밴드, 캔들 패턴이 포함되어 있습니다.\\n\\n' +
            '### 분석 요청 사항:\\n' +
            '1. 현재 시점에서의 최적 포지션을 선택해주세요:\\n   - 매수 (Long) / 매도 (Short) / 보류 (No Trade)\\n' +
            '2. 선택한 포지션이 적절한 이유를 RSI, 볼린저밴드, 캔들 패턴 기반으로 설명해주세요.\\n' +
            '3. 적절한 레버리지 (1x ~ 50x) 를 제안해주세요.\\n' +
            '4. 진입 시점 기준:\\n   - **익절가와 예상 수익률(%)**\\n   - **손절가와 예상 손실률(%)**\\n\\n' +
            '### 응답 형식 (꼭 아래 구조를 따라주세요):\\n---\\n📈 **포지션 추천:** 매수 / 매도 / 보류\\n🔁 **추천 레버리지:** X배\\n🎯 **익절가 및 예상 수익률:** $XX / +XX%\\n🛑 **손절가 및 예상 손실률:** $XX / -XX%\\n📊 **분석 근거:**\\n- RSI 상태 (과매수/과매도 여부)\\n- 볼린저밴드 위치 (상단 돌파 / 하단 이탈 등)\\n- 캔들 패턴 해석 (반전/지속 가능성)\\n- 1분, 5분, 15분봉 간 흐름 일치 여부\\n\\n모든 수치는 전략적 트레이딩 의사결정 보조용입니다. 정확한 근거 기반 판단만 제시해주세요.';
        const response = yield axios.post(
        // 👇 더 높은 할당량을 가진 'gemini-1.5-flash-latest' 모델로 변경
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`, {
            contents: [
                {
                    role: 'user',
                    parts: [{ text: prompt }],
                },
            ],
        });
        const text = ((_e = (_d = (_c = (_b = (_a = response.data.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text) || '';
        console.log('Gemini Response:', text);
        res.json({ text });
    }
    catch (err) {
        console.error('Error fetching Gemini analysis:', ((_f = err.response) === null || _f === void 0 ? void 0 : _f.data) || err.message);
        res.status(500).json({ error: 'Failed to fetch Gemini analysis' });
    }
}));
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
//# sourceMappingURL=server.js.map