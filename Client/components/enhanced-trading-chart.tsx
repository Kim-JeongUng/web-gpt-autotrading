"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTradingStore } from "@/lib/trading-store";
import { bybitService } from "@/lib/bybit-client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LightweightCandlestickChart } from "./lightweight-candlestick-chart";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
} from "recharts";
import { TrendingUp, TrendingDown, BarChart3, LineChart } from "lucide-react";

function formatTime(ts: number, tf: string) {
  const d = new Date(ts)
  if (tf === '1d') {
    return d.toLocaleDateString('ko-KR')
  }
  return d.toLocaleTimeString('ko-KR', { hour12: false })
}

function calculateIndicators(data: ChartData[]) {
  const closes = data.map((d) => d.close)
  const rsiPeriod = 14
  const bbPeriod = 20
  const emaShortPeriod = 12
  const emaLongPeriod = 26
  const signalPeriod = 9

  let emaShort = closes[0]
  let emaLong = closes[0]
  let emaSignal = 0
  for (let i = 0; i < data.length; i++) {
    const close = closes[i]

    // RSI
    if (i > 0) {
      let gains = 0
      let losses = 0
      const start = Math.max(0, i - rsiPeriod + 1)
      for (let j = start + 1; j <= i; j++) {
        const diff = closes[j] - closes[j - 1]
        if (diff >= 0) gains += diff
        else losses -= diff
      }
      const avgGain = gains / Math.min(i, rsiPeriod)
      const avgLoss = losses / Math.min(i, rsiPeriod)
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
      data[i].rsi = 100 - 100 / (1 + rs)
    } else {
      data[i].rsi = 50
    }

    // Bollinger Bands
    const bbStart = Math.max(0, i - bbPeriod + 1)
    const slice = closes.slice(bbStart, i + 1)
    const mean = slice.reduce((a, b) => a + b, 0) / slice.length
    const std = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / slice.length)
    data[i].bb_middle = mean
    data[i].bb_upper = mean + 2 * std
    data[i].bb_lower = mean - 2 * std

    // MACD
    if (i === 0) {
      emaShort = close
      emaLong = close
      emaSignal = 0
    } else {
      const kShort = 2 / (emaShortPeriod + 1)
      const kLong = 2 / (emaLongPeriod + 1)
      emaShort = close * kShort + emaShort * (1 - kShort)
      emaLong = close * kLong + emaLong * (1 - kLong)
    }
    const macd = emaShort - emaLong
    const kSignal = 2 / (signalPeriod + 1)
    emaSignal = macd * kSignal + emaSignal * (1 - kSignal)
    data[i].macd = macd
    data[i].macd_signal = emaSignal
    data[i].macd_histogram = macd - emaSignal
  }
}

interface ChartData {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  rsi: number;
  bb_upper: number;
  bb_middle: number;
  bb_lower: number;
  macd: number;
  macd_signal: number;
  macd_histogram: number;
}

interface EnhancedTradingChartProps {
  symbol: string;
}

export function EnhancedTradingChart({ symbol }: EnhancedTradingChartProps) {
  const { tickers, isTestnet } = useTradingStore();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [timeframe, setTimeframe] = useState("1h");
  const [chartType, setChartType] = useState<"candlestick" | "line">(
    "candlestick",
  );
  const [showIndicators, setShowIndicators] = useState({
    rsi: true,
    bollinger: true,
    macd: false,
    volume: true,
  });
  const [geminiAnswer, setGeminiAnswer] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const lastValidPrice = useRef(0);
  const [loading, setLoading] = useState(false);

  const currentTicker = tickers[symbol];
  const currentPrice = currentTicker?.lastPrice
    ? Number.parseFloat(currentTicker.lastPrice)
    : 0;
  const priceChange = currentTicker?.price24hPcnt
    ? Number.parseFloat(currentTicker.price24hPcnt)
    : 0;

  // Preserve the last valid price so the chart doesn't jump to zero when
  // the websocket misses a tick.
  useEffect(() => {
    if (currentPrice > 0) {
      lastValidPrice.current = currentPrice;
    }
  }, [currentPrice]);

  // Fetch historical chart data when symbol or timeframe changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      try {
        const intervalMap: Record<string, string> = {
          '1m': '1',
          '5m': '5',
          '1h': '60',
          '1d': 'D',
        }
        const msMap: Record<string, number> = {
          '1m': 60 * 1000,
          '5m': 5 * 60 * 1000,
          '1h': 60 * 60 * 1000,
          '1d': 24 * 60 * 60 * 1000,
        }

        let start: number | undefined
        let combined: ChartData[] = []
        for (let i = 0; i < 5; i++) {
          const list = await bybitService.getKlines({
            symbol,
            interval: intervalMap[timeframe] || '1',
            limit: 200,
            category: 'linear',
            start,
          })
          if (!list.length) break

          const chunk = (list as any[])
            .map((k) => ({
              time: formatTime(Number(k[0]), timeframe),
              timestamp: Number(k[0]),
              open: Number(k[1]),
              high: Number(k[2]),
              low: Number(k[3]),
              close: Number(k[4]),
              volume: Number(k[5]),
              rsi: 50,
              bb_upper: 0,
              bb_middle: 0,
              bb_lower: 0,
              macd: 0,
              macd_signal: 0,
              macd_histogram: 0,
            })) as ChartData[]

          chunk.sort((a, b) => a.timestamp - b.timestamp)
          combined = [...chunk, ...combined]
          start = chunk[0].timestamp - msMap[timeframe] * 200
        }

        calculateIndicators(combined)
        combined.sort((a, b) => a.timestamp - b.timestamp)
        setChartData(combined)
        if (combined.length > 0) {
          lastValidPrice.current = combined[combined.length - 1].close
        }
      } catch (err) {
        console.error('Failed to fetch klines', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [symbol, timeframe])

  // Real-time updates using websocket klines
  useEffect(() => {
    if (loading) return
    const intervalMap: Record<string, string> = {
      '1m': '1',
      '5m': '5',
      '1h': '60',
      '1d': 'D',
    }

    const unsub = bybitService.subscribeToKlines(
      symbol,
      intervalMap[timeframe] || '1',
      (k) => {
        const ts = k.start < 1e12 ? k.start * 1000 : k.start
        setChartData((prev) => {
          const newItem: ChartData = {
            time: formatTime(ts, timeframe),
            timestamp: ts,
            open: k.open,
            high: k.high,
            low: k.low,
            close: k.close,
            volume: k.volume,
            rsi: prev.length ? prev[prev.length - 1].rsi : 50,
            bb_upper: prev.length ? prev[prev.length - 1].bb_upper : 0,
            bb_middle: prev.length ? prev[prev.length - 1].bb_middle : 0,
            bb_lower: prev.length ? prev[prev.length - 1].bb_lower : 0,
            macd: prev.length ? prev[prev.length - 1].macd : 0,
            macd_signal: prev.length ? prev[prev.length - 1].macd_signal : 0,
            macd_histogram: prev.length ? prev[prev.length - 1].macd_histogram : 0,
          }

          const updated = [...prev]
          if (updated.length && updated[updated.length - 1].timestamp === newItem.timestamp) {
            updated[updated.length - 1] = { ...updated[updated.length - 1], ...newItem }
          } else {
            updated.push(newItem)
          }
          updated.sort((a, b) => a.timestamp - b.timestamp)
          calculateIndicators(updated)
          return updated.slice(-1000)
        })
      },
    )

    return () => {
      unsub?.()
    }
  }, [symbol, timeframe, loading])

  const handleAskGemini = async () => {
    if (chartData.length === 0) return;
    setIsAsking(true);
    setGeminiAnswer(null);
    try {
      const payload = {
        symbol,
        currentPrice,
        rsi: chartData[chartData.length - 1].rsi,
        data: chartData.slice(-20),
      };
      const text = await bybitService.getGeminiAnalysis(payload);
      setGeminiAnswer(text);
    } catch (err: any) {
      setGeminiAnswer('오류: ' + (err.message || 'failed'));
    } finally {
      setIsAsking(false);
    }
  };

  const MainChart = ({ data }: { data: ChartData[] }) => {
    const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
    if (chartType === "candlestick") {
      const candles = sorted.map((d) => ({
        time: d.timestamp / 1000 as any,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));
      const bollinger = sorted.map((d) => ({
        time: d.timestamp / 1000 as any,
        upper: d.bb_upper,
        middle: d.bb_middle,
        lower: d.bb_lower,
      }));
      return (
        <LightweightCandlestickChart
          data={candles}
          bollinger={showIndicators.bollinger ? bollinger : undefined}
        />
      );
    }

    return (
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={sorted} isAnimationActive={false}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis yAxisId="price" orientation="right" />
          {showIndicators.volume && <YAxis yAxisId="volume" orientation="left" />}
          <Tooltip
            formatter={(value, name) => {
              if (name === "volume")
                return [Number(value).toLocaleString(), "거래량"];
              return [`$${Number(value).toFixed(2)}`, name];
            }}
          />

        {/* Bollinger Bands */}
        {showIndicators.bollinger && (
          <>
            <Area
              yAxisId="price"
              type="monotone"
              dataKey="bb_upper"
              stackId="bb"
              stroke="#e5e7eb"
              fill="transparent"
              strokeDasharray="2 2"
              isAnimationActive={false}
            />
            <Area
              yAxisId="price"
              type="monotone"
              dataKey="bb_lower"
              stackId="bb"
              stroke="#e5e7eb"
              fill="#f3f4f6"
              fillOpacity={0.1}
              strokeDasharray="2 2"
              isAnimationActive={false}
            />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="bb_middle"
              stroke="#6b7280"
              strokeDasharray="2 2"
              dot={false}
              isAnimationActive={false}
            />
          </>
        )}

        {/* Price Line/Candlestick */}
        {chartType === "line" ? (
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="close"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        ) : (
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="close"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        )}

        {/* Volume */}
        {showIndicators.volume && (
          <Bar
            yAxisId="volume"
            dataKey="volume"
            fill="#e5e7eb"
            opacity={0.3}
            isAnimationActive={false}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
  };

  const RSIChart = ({ data }: { data: ChartData[] }) => (
    <ResponsiveContainer width="100%" height={120}>
      <ComposedChart data={data} isAnimationActive={false}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" />
        <YAxis domain={[0, 100]} />
        <Tooltip
          formatter={(value) => [`${Number(value).toFixed(1)}`, "RSI"]}
        />
        <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="2 2" />
        <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="2 2" />
        <Area
          type="monotone"
          dataKey="rsi"
          stroke="#f59e0b"
          fill="#f59e0b"
          fillOpacity={0.1}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );

  const MACDChart = ({ data }: { data: ChartData[] }) => (
    <ResponsiveContainer width="100%" height={120}>
      <ComposedChart data={data} isAnimationActive={false}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" />
        <YAxis />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="macd"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="macd_signal"
          stroke="#ef4444"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        <Bar
          dataKey="macd_histogram"
          fill="#6b7280"
          opacity={0.6}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              {symbol} 차트
              <Badge variant={isTestnet ? "secondary" : "default"}>
                {isTestnet ? "테스트넷" : "메인넷"}
              </Badge>
            </CardTitle>
            {currentPrice > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">
                  ${currentPrice.toFixed(2)}
                </span>
                <div
                  className={`flex items-center gap-1 ${priceChange >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {priceChange >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span>
                    {priceChange >= 0 ? "+" : ""}
                    {(priceChange * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Chart Type Toggle */}
            <Button
              variant={chartType === "candlestick" ? "default" : "outline"}
              size="sm"
              onClick={() => setChartType("candlestick")}
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === "line" ? "default" : "outline"}
              size="sm"
              onClick={() => setChartType("line")}
            >
              <LineChart className="h-4 w-4" />
            </Button>

            {/* Timeframe Selection */}
            <Tabs value={timeframe} onValueChange={setTimeframe}>
              <TabsList>
                <TabsTrigger value="1m">1분</TabsTrigger>
                <TabsTrigger value="5m">5분</TabsTrigger>
                <TabsTrigger value="1h">1시간</TabsTrigger>
                <TabsTrigger value="1d">1일</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Indicator Toggles */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={showIndicators.bollinger ? "default" : "outline"}
            size="sm"
            onClick={() =>
              setShowIndicators((prev) => ({
                ...prev,
                bollinger: !prev.bollinger,
              }))
            }
          >
            볼린저 밴드
          </Button>
          <Button
            variant={showIndicators.rsi ? "default" : "outline"}
            size="sm"
            onClick={() =>
              setShowIndicators((prev) => ({ ...prev, rsi: !prev.rsi }))
            }
          >
            RSI
          </Button>
          <Button
            variant={showIndicators.macd ? "default" : "outline"}
            size="sm"
            onClick={() =>
              setShowIndicators((prev) => ({ ...prev, macd: !prev.macd }))
            }
          >
            MACD
          </Button>
          <Button
            variant={showIndicators.volume ? "default" : "outline"}
            size="sm"
            onClick={() =>
              setShowIndicators((prev) => ({ ...prev, volume: !prev.volume }))
            }
          >
            거래량
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAskGemini}
            disabled={isAsking}
          >
            {isAsking ? "분석 중..." : "Gemini에 이 코인 물어보기"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main Chart */}
          {loading ? (
            <div className="h-96 flex items-center justify-center">로딩 중...</div>
          ) : (
            <MainChart data={chartData} />
          )}

          {/* RSI Indicator */}
          {showIndicators.rsi && (
            <div>
              <h4 className="text-sm font-medium mb-2">RSI (14)</h4>
              <RSIChart data={chartData} />
            </div>
          )}

          {/* MACD Indicator */}
          {showIndicators.macd && (
            <div>
              <h4 className="text-sm font-medium mb-2">MACD</h4>
              <MACDChart data={chartData} />
            </div>
          )}

          {geminiAnswer && (
            <Alert>
              <AlertDescription className="whitespace-pre-wrap">
                {geminiAnswer}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
