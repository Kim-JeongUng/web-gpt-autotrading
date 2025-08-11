"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  Time,
  ISeriesApi,
  HistogramData,
  LineData,
  CandlestickData,
} from "lightweight-charts";
import { bybitService } from "@/lib/bybit-client";

interface Props {
  symbol: string;
  interval?: string;
}

function toNum(s?: string) {
  return s ? Number(s) : 0;
}

function ema(vals: number[], period: number) {
  const k = 2 / (period + 1);
  const emaArr: number[] = [];
  vals.forEach((v, idx) => {
    if (idx === 0) emaArr.push(v);
    else emaArr.push(v * k + emaArr[idx - 1] * (1 - k));
  });
  return emaArr;
}

function removeBranding(ref: HTMLDivElement | null) {
  if (!ref) return;
  const link = ref.querySelector<HTMLAnchorElement>("a[href*='tradingview.com']");
  if (link) link.remove();
}

function linkTimeScales(charts: ReturnType<typeof createChart>[]) {
  const syncing = { current: false };
  charts.forEach((chart) => {
    chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
      if (
        syncing.current ||
        !range ||
        range.from == null ||
        range.to == null
      )
        return;
      syncing.current = true;
      charts.forEach((c) => {
        if (c !== chart) c.timeScale().setVisibleRange(range);
      });
      syncing.current = false;
    });
  });
}

export function BybitMarketChart({ symbol, interval = "1" }: Props) {
  const mainRef = useRef<HTMLDivElement>(null);
  const volRef = useRef<HTMLDivElement>(null);
  const fundRef = useRef<HTMLDivElement>(null);
  const oiRef = useRef<HTMLDivElement>(null);
    const lsrRef = useRef<HTMLDivElement>(null);
    const imbRef = useRef<HTMLDivElement>(null);
    const macdRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const mainChart = useRef<ReturnType<typeof createChart>>();
    const volChart = useRef<ReturnType<typeof createChart>>();
    const fundChart = useRef<ReturnType<typeof createChart>>();
    const oiChart = useRef<ReturnType<typeof createChart>>();
    const lsrChart = useRef<ReturnType<typeof createChart>>();
    const imbChart = useRef<ReturnType<typeof createChart>>();
    const macdChart = useRef<ReturnType<typeof createChart>>();

    const candleSeries = useRef<ISeriesApi<"Candlestick">>();
    const markSeries = useRef<ISeriesApi<"Line">>();
    const indexSeries = useRef<ISeriesApi<"Line">>();
    const volSeries = useRef<ISeriesApi<"Histogram">>();
    const fundSeries = useRef<ISeriesApi<"Line">>();
    const oiSeries = useRef<ISeriesApi<"Line">>();
    const oiDeltaSeries = useRef<ISeriesApi<"Histogram">>();
    const lsrSeries = useRef<ISeriesApi<"Line">>();
    const imbalanceSeries = useRef<ISeriesApi<"Histogram">>();
    const bbUpperSeries = useRef<ISeriesApi<"Line">>();
    const bbLowerSeries = useRef<ISeriesApi<"Line">>();
    const bbMidSeries = useRef<ISeriesApi<"Line">>();
    const macdLineSeries = useRef<ISeriesApi<"Line">>();
    const macdSignalSeries = useRef<ISeriesApi<"Line">>();
    const macdHistSeries = useRef<ISeriesApi<"Histogram">>();

    const tradeBuckets = useRef<Record<number, { buy: number; sell: number }>>({});
    const lastCandleTime = useRef<number>(0);
    const candleCache = useRef<CandlestickData[]>([]);

  useEffect(() => {
    if (!mainRef.current || mainChart.current) return;
    mainChart.current = createChart(mainRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#111827" },
        textColor: "#e5e7eb",
      },
      grid: {
        vertLines: { color: "#374151" },
        horzLines: { color: "#374151" },
      },
      rightPriceScale: { borderColor: "#374151" },
      timeScale: { borderColor: "#374151", timeVisible: true, barSpacing: 10 },
      crosshair: { mode: 0 },
    });
    removeBranding(mainRef.current);
    tooltipRef.current = document.createElement("div");
    tooltipRef.current.className =
      "absolute left-2 top-2 rounded bg-black/50 px-2 py-1 text-xs text-gray-200";
    tooltipRef.current.style.pointerEvents = "none";
    mainRef.current.appendChild(tooltipRef.current);

    const chartOpts = {
      layout: { background: { type: ColorType.Solid, color: "#111827" }, textColor: "#e5e7eb" },
      rightPriceScale: { borderColor: "#374151" },
      timeScale: { borderColor: "#374151", timeVisible: true, barSpacing: 10 },
      grid: { vertLines: { color: "#374151" }, horzLines: { color: "#374151" } },
    } as const;

    volChart.current = createChart(volRef.current!, chartOpts);
    removeBranding(volRef.current);
    fundChart.current = createChart(fundRef.current!, chartOpts);
    removeBranding(fundRef.current);
    oiChart.current = createChart(oiRef.current!, chartOpts);
    removeBranding(oiRef.current);
    lsrChart.current = createChart(lsrRef.current!, chartOpts);
    removeBranding(lsrRef.current);
    imbChart.current = createChart(imbRef.current!, chartOpts);
    removeBranding(imbRef.current);
    macdChart.current = createChart(macdRef.current!, chartOpts);
    removeBranding(macdRef.current);

    linkTimeScales([
      mainChart.current,
      volChart.current,
      fundChart.current,
      oiChart.current,
      lsrChart.current,
      imbChart.current,
      macdChart.current,
    ].filter(Boolean) as ReturnType<typeof createChart>[]);
  }, []);

  useEffect(() => {
    if (!mainChart.current) return;
    let unsubs: (() => void)[] = [];
    const crosshairHandler = (param: any) => {
      if (!tooltipRef.current) return;
      const data = param.seriesData?.get?.(candleSeries.current!);
      if (!param.time || !data) {
        tooltipRef.current.innerText = "";
        return;
      }
      const d = new Date((param.time as number) * 1000);
      tooltipRef.current.innerText = `O:${data.open} H:${data.high} L:${data.low} C:${data.close} ${d.toLocaleString()}`;
    };

    async function load() {
      const [kl, markKl, idxKl, fund, oi, lsr, trades] = await Promise.all([
        bybitService.getKlines({ symbol, interval, limit: 1000 }),
        bybitService.getMarkPriceKlines({ symbol, interval, limit: 1000 }),
        bybitService.getIndexPriceKlines({ symbol, interval, limit: 1000 }),
        bybitService.getFundingHistory({ symbol, limit: 200 }),
        bybitService.getOpenInterest({ symbol, intervalTime: "5min", limit: 200 }),
        bybitService.getLongShortRatio({ symbol, period: "5min", limit: 200 }),
        bybitService.getRecentTrades({ symbol, limit: 1000 }),
      ]);

      const sortedKlines = (kl as any[])
        .filter((r) => Number.isFinite(Number(r[0])))
        .sort((a, b) => Number(a[0]) - Number(b[0]));
      const candles: CandlestickData[] = sortedKlines.map((r) => ({
        time: Math.floor(Number(r[0]) / 1000) as Time,
        open: toNum(r[1]),
        high: toNum(r[2]),
        low: toNum(r[3]),
        close: toNum(r[4]),
      }));
        const volumes: HistogramData[] = sortedKlines.map((r) => ({
          time: Math.floor(Number(r[0]) / 1000) as Time,
          value: toNum(r[5]),
          color: toNum(r[4]) >= toNum(r[1]) ? "#22c55e" : "#ef4444",
        }));

        const closes = candles.map((c) => c.close);
        const bbPeriod = 20;
        const bbU: LineData[] = [];
        const bbL: LineData[] = [];
        const bbM: LineData[] = [];
        for (let i = bbPeriod - 1; i < closes.length; i++) {
          const slice = closes.slice(i - bbPeriod + 1, i + 1);
          const mean = slice.reduce((a, b) => a + b, 0) / bbPeriod;
          const sd = Math.sqrt(
            slice.reduce((a, b) => a + (b - mean) ** 2, 0) / bbPeriod,
          );
          const time = candles[i].time;
          bbM.push({ time, value: mean });
          bbU.push({ time, value: mean + 2 * sd });
          bbL.push({ time, value: mean - 2 * sd });
        }

        const ema12 = ema(closes, 12);
        const ema26 = ema(closes, 26);
        const macdArr = closes.map((_, i) => ema12[i] - ema26[i]);
        const signalArr = ema(macdArr, 9);
        const histArr = macdArr.map((v, i) => v - signalArr[i]);
        const macdLine: LineData[] = macdArr.map((v, i) => ({ time: candles[i].time, value: v }));
        const macdSignal: LineData[] = signalArr.map((v, i) => ({ time: candles[i].time, value: v }));
        const macdHist: HistogramData[] = histArr.map((v, i) => ({
          time: candles[i].time,
          value: v,
          color: v >= 0 ? "#22c55e" : "#ef4444",
        }));

      const sortedMark = (markKl as any[])
        .filter((r) => Number.isFinite(Number(r[0])))
        .sort((a, b) => Number(a[0]) - Number(b[0]));
      const markLine: LineData[] = sortedMark.map((r) => ({
        time: Math.floor(Number(r[0]) / 1000) as Time,
        value: toNum(r[4]),
      }));

      const sortedIdx = (idxKl as any[])
        .filter((r) => Number.isFinite(Number(r[0])))
        .sort((a, b) => Number(a[0]) - Number(b[0]));
      const indexLine: LineData[] = sortedIdx.map((r) => ({
        time: Math.floor(Number(r[0]) / 1000) as Time,
        value: toNum(r[4]),
      }));

      const sortedFund = (fund as any[])
        .filter((x) => Number.isFinite(Number(x.fundingTime)))
        .sort((a, b) => Number(a.fundingTime) - Number(b.fundingTime));
      const fundingLine: LineData[] = sortedFund.map((x) => ({
        time: Math.floor(Number(x.fundingTime) / 1000) as Time,
        value: Number(x.fundingRate) * 100,
      }));

      const sortedOi = (oi as any[])
        .filter((x) => Number.isFinite(Number(x.timestamp)))
        .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
      const oiLine: LineData[] = sortedOi.map((x) => ({
        time: Math.floor(Number(x.timestamp) / 1000) as Time,
        value: Number(x.openInterest),
      }));
      const oiDelta: HistogramData[] = oiLine.map((v, i) => ({
        time: v.time,
        value: i === 0 ? 0 : v.value - oiLine[i - 1].value,
        color:
          i === 0
            ? "#60a5fa"
            : v.value - oiLine[i - 1].value >= 0
            ? "#22c55e"
            : "#ef4444",
      }));

      const sortedLsr = (lsr as any[])
        .filter((x) => Number.isFinite(Number(x.timestamp)))
        .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
      const lsrLine: LineData[] = sortedLsr.map((x) => ({
        time: Math.floor(Number(x.timestamp) / 1000) as Time,
        value: Number(x.longAccountRatio),
      }));

      tradeBuckets.current = {};
      (trades as any[])
        .filter((t) => Number.isFinite(Number(t.execTime || t.time)))
        .forEach((t) => {
          const ts = Math.floor(Number(t.execTime || t.time) / 1000);
          const m = Math.floor(ts / 60) * 60;
          if (!tradeBuckets.current[m]) tradeBuckets.current[m] = { buy: 0, sell: 0 };
          if ((t.side || t.execType) === "Buy")
            tradeBuckets.current[m].buy += toNum(t.execQty || t.qty);
          else tradeBuckets.current[m].sell += toNum(t.execQty || t.qty);
        });
      const imbalance: HistogramData[] = Object.entries(tradeBuckets.current)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([time, v]) => {
          const total = v.buy + v.sell;
          const val = total > 0 ? (v.buy - v.sell) / total : 0;
          return {
            time: Number(time) as Time,
            value: val,
            color: val >= 0 ? "#22c55e" : "#ef4444",
          };
        });

      mainChart.current?.applyOptions({
        timeScale: { timeVisible: true, secondsVisible: interval === "1" },
      });
      [volChart, fundChart, oiChart, lsrChart, imbChart, macdChart].forEach((c) =>
        c.current?.applyOptions({
          timeScale: { timeVisible: true, secondsVisible: interval === "1" },
        }),
      );

      candleSeries.current =
        candleSeries.current ||
        mainChart.current.addCandlestickSeries({
          upColor: "#22c55e",
          downColor: "#ef4444",
          borderVisible: false,
          wickUpColor: "#22c55e",
          wickDownColor: "#ef4444",
        });
      const validCandles = candles.filter((c) => Number.isFinite(c.time));
      candleSeries.current.setData(validCandles);
      candleCache.current = validCandles;
      lastCandleTime.current = Number(validCandles[validCandles.length - 1]?.time || 0);
      markSeries.current =
        markSeries.current || mainChart.current.addLineSeries({ color: "#fbbf24" });
      markSeries.current.setData(markLine);
      indexSeries.current =
        indexSeries.current || mainChart.current.addLineSeries({ color: "#60a5fa" });
      indexSeries.current.setData(indexLine);
      bbUpperSeries.current =
        bbUpperSeries.current || mainChart.current.addLineSeries({ color: "#f97316" });
      bbUpperSeries.current.setData(bbU);
      bbLowerSeries.current =
        bbLowerSeries.current || mainChart.current.addLineSeries({ color: "#f97316" });
      bbLowerSeries.current.setData(bbL);
      bbMidSeries.current =
        bbMidSeries.current || mainChart.current.addLineSeries({ color: "#94a3b8" });
      bbMidSeries.current.setData(bbM);
      volSeries.current =
        volSeries.current || volChart.current!.addHistogramSeries({ color: "#9ca3af" });
      volSeries.current.setData(volumes);
      fundSeries.current =
        fundSeries.current || fundChart.current!.addLineSeries({ color: "#f472b6" });
      fundSeries.current.setData(fundingLine);
      oiSeries.current =
        oiSeries.current || oiChart.current!.addLineSeries({ color: "#a855f7" });
      oiSeries.current.setData(oiLine);
      oiDeltaSeries.current =
        oiDeltaSeries.current ||
        oiChart.current!.addHistogramSeries({ color: "#fde047" });
      oiDeltaSeries.current.setData(oiDelta);
      lsrSeries.current =
        lsrSeries.current || lsrChart.current!.addLineSeries({ color: "#10b981" });
      lsrSeries.current.setData(lsrLine);
      imbalanceSeries.current =
        imbalanceSeries.current ||
        imbChart.current!.addHistogramSeries({ color: "#9ca3af" });
      imbalanceSeries.current.setData(imbalance);

      macdLineSeries.current =
        macdLineSeries.current || macdChart.current!.addLineSeries({ color: "#facc15" });
      macdLineSeries.current.setData(macdLine);
      macdSignalSeries.current =
        macdSignalSeries.current || macdChart.current!.addLineSeries({ color: "#3b82f6" });
      macdSignalSeries.current.setData(macdSignal);
      macdHistSeries.current =
        macdHistSeries.current ||
        macdChart.current!.addHistogramSeries({ color: "#9ca3af" });
      macdHistSeries.current.setData(macdHist);

      mainChart.current.timeScale().fitContent();

      mainChart.current?.subscribeCrosshairMove(crosshairHandler);
      unsubs = [
        bybitService.subscribeKline(symbol, interval, (d) => {
          const time = Math.floor(Number(d.start || d.startTime) / 1000);
          if (!Number.isFinite(time) || time < lastCandleTime.current) return;
          lastCandleTime.current = time;
          const bar: CandlestickData = {
            time: time as Time,
            open: toNum(d.open),
            high: toNum(d.high),
            low: toNum(d.low),
            close: toNum(d.close),
          };
          const cache = candleCache.current;
          const last = cache[cache.length - 1];
          if (last && last.time === bar.time) cache[cache.length - 1] = bar;
          else cache.push(bar);
          candleSeries.current?.update(bar);
          volSeries.current?.update({
            time: bar.time,
            value: toNum(d.volume || d.turnover),
            color: bar.close >= bar.open ? "#22c55e" : "#ef4444",
          });
          const closes = cache.map((c) => c.close);
          if (closes.length >= 20) {
            const slice = closes.slice(-20);
            const mean = slice.reduce((a, b) => a + b, 0) / 20;
            const sd = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / 20);
            bbMidSeries.current?.update({ time: bar.time, value: mean });
            bbUpperSeries.current?.update({ time: bar.time, value: mean + 2 * sd });
            bbLowerSeries.current?.update({ time: bar.time, value: mean - 2 * sd });
          }
          const ema12 = ema(closes, 12);
          const ema26 = ema(closes, 26);
          const macdArr = closes.map((_, i) => ema12[i] - ema26[i]);
          const signalArr = ema(macdArr, 9);
          const macdVal = macdArr[macdArr.length - 1];
          const signalVal = signalArr[signalArr.length - 1];
          const histVal = macdVal - signalVal;
          macdLineSeries.current?.update({ time: bar.time, value: macdVal });
          macdSignalSeries.current?.update({ time: bar.time, value: signalVal });
          macdHistSeries.current?.update({
            time: bar.time,
            value: histVal,
            color: histVal >= 0 ? "#22c55e" : "#ef4444",
          });
        }),
        bybitService.subscribeMarkPrice(symbol, interval, (d) => {
          const time = Math.floor(Number(d.start || d.time) / 1000);
          if (!Number.isFinite(time)) return;
          markSeries.current?.update({ time: time as Time, value: toNum(d.close) });
        }),
        bybitService.subscribeIndexPrice(symbol, interval, (d) => {
          const time = Math.floor(Number(d.start || d.time) / 1000);
          if (!Number.isFinite(time)) return;
          indexSeries.current?.update({ time: time as Time, value: toNum(d.close) });
        }),
        bybitService.subscribeTrades(symbol, (t) => {
          const ts = Math.floor(Number(t.execTime || t.T) / 1000);
          if (!Number.isFinite(ts)) return;
          const m = Math.floor(ts / 60) * 60;
          if (!tradeBuckets.current[m]) tradeBuckets.current[m] = { buy: 0, sell: 0 };
          if ((t.side || t.S) === "Buy")
            tradeBuckets.current[m].buy += toNum(t.execQty || t.v);
          else tradeBuckets.current[m].sell += toNum(t.execQty || t.v);
          const bucket = tradeBuckets.current[m];
          const total = bucket.buy + bucket.sell;
          const val = total > 0 ? (bucket.buy - bucket.sell) / total : 0;
          imbalanceSeries.current?.update({
            time: m as Time,
            value: val,
            color: val >= 0 ? "#22c55e" : "#ef4444",
          });
        }),
      ].filter(Boolean) as (() => void)[];
    }
    load();
    return () => {
      unsubs.forEach((u) => u && u());
      mainChart.current?.unsubscribeCrosshairMove(crosshairHandler);
    };
  }, [symbol, interval]);


    return (
      <div className="space-y-4">
        <div>
          <div className="text-xs text-gray-400">Price / Bollinger Bands</div>
          <div ref={mainRef} className="relative h-96 w-full" />
        </div>
        <div>
          <div className="text-xs text-gray-400">Volume</div>
          <div ref={volRef} className="h-24 w-full" />
        </div>
        <div>
          <div className="text-xs text-gray-400">Funding Rate (%)</div>
          <div ref={fundRef} className="h-24 w-full" />
        </div>
        <div>
          <div className="text-xs text-gray-400">Open Interest / ΔOI</div>
          <div ref={oiRef} className="h-24 w-full" />
        </div>
        <div>
          <div className="text-xs text-gray-400">Long / Short Ratio</div>
          <div ref={lsrRef} className="h-24 w-full" />
        </div>
        <div>
          <div className="text-xs text-gray-400">Trade Imbalance</div>
          <div ref={imbRef} className="h-24 w-full" />
        </div>
        <div>
          <div className="text-xs text-gray-400">MACD</div>
          <div ref={macdRef} className="h-24 w-full" />
        </div>
      </div>
    );
}
