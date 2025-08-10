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

export function BybitMarketChart({ symbol, interval = "1" }: Props) {
  const mainRef = useRef<HTMLDivElement>(null);
  const volRef = useRef<HTMLDivElement>(null);
  const fundRef = useRef<HTMLDivElement>(null);
  const oiRef = useRef<HTMLDivElement>(null);
  const lsrRef = useRef<HTMLDivElement>(null);
  const imbRef = useRef<HTMLDivElement>(null);

  const mainChart = useRef<ReturnType<typeof createChart>>();
  const volChart = useRef<ReturnType<typeof createChart>>();
  const fundChart = useRef<ReturnType<typeof createChart>>();
  const oiChart = useRef<ReturnType<typeof createChart>>();
  const lsrChart = useRef<ReturnType<typeof createChart>>();
  const imbChart = useRef<ReturnType<typeof createChart>>();

  const candleSeries = useRef<ISeriesApi<"Candlestick">>();
  const markSeries = useRef<ISeriesApi<"Line">>();
  const indexSeries = useRef<ISeriesApi<"Line">>();
  const volSeries = useRef<ISeriesApi<"Histogram">>();
  const fundSeries = useRef<ISeriesApi<"Line">>();
  const oiSeries = useRef<ISeriesApi<"Line">>();
  const oiDeltaSeries = useRef<ISeriesApi<"Histogram">>();
  const lsrSeries = useRef<ISeriesApi<"Line">>();
  const imbalanceSeries = useRef<ISeriesApi<"Histogram">>();

  const tradeBuckets = useRef<Record<number, { buy: number; sell: number }>>({});

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
      timeScale: { borderColor: "#374151" },
    });
    volChart.current = createChart(volRef.current!, {
      layout: { background: { type: ColorType.Solid, color: "#111827" }, textColor: "#e5e7eb" },
      rightPriceScale: { borderColor: "#374151" },
      timeScale: { borderColor: "#374151" },
      grid: { vertLines: { color: "#374151" }, horzLines: { color: "#374151" } },
    });
    fundChart.current = createChart(fundRef.current!, {
      layout: { background: { type: ColorType.Solid, color: "#111827" }, textColor: "#e5e7eb" },
      rightPriceScale: { borderColor: "#374151" },
      timeScale: { borderColor: "#374151" },
      grid: { vertLines: { color: "#374151" }, horzLines: { color: "#374151" } },
    });
    oiChart.current = createChart(oiRef.current!, {
      layout: { background: { type: ColorType.Solid, color: "#111827" }, textColor: "#e5e7eb" },
      rightPriceScale: { borderColor: "#374151" },
      timeScale: { borderColor: "#374151" },
      grid: { vertLines: { color: "#374151" }, horzLines: { color: "#374151" } },
    });
    lsrChart.current = createChart(lsrRef.current!, {
      layout: { background: { type: ColorType.Solid, color: "#111827" }, textColor: "#e5e7eb" },
      rightPriceScale: { borderColor: "#374151" },
      timeScale: { borderColor: "#374151" },
      grid: { vertLines: { color: "#374151" }, horzLines: { color: "#374151" } },
    });
    imbChart.current = createChart(imbRef.current!, {
      layout: { background: { type: ColorType.Solid, color: "#111827" }, textColor: "#e5e7eb" },
      rightPriceScale: { borderColor: "#374151" },
      timeScale: { borderColor: "#374151" },
      grid: { vertLines: { color: "#374151" }, horzLines: { color: "#374151" } },
    });
  }, []);

  useEffect(() => {
    async function load() {
      if (!mainChart.current) return;
      const [kl, markKl, idxKl, fund, oi, lsr, trades] = await Promise.all([
        bybitService.getKlines({ symbol, interval, limit: 1000 }),
        bybitService.getMarkPriceKlines({ symbol, interval, limit: 1000 }),
        bybitService.getIndexPriceKlines({ symbol, interval, limit: 1000 }),
        bybitService.getFundingHistory({ symbol, limit: 200 }),
        bybitService.getOpenInterest({ symbol, intervalTime: "5min", limit: 200 }),
        bybitService.getLongShortRatio({ symbol, period: "5min", limit: 200 }),
        bybitService.getRecentTrades({ symbol, limit: 1000 }),
      ]);

      const candles: CandlestickData[] = kl.map((r: any) => ({
        time: Math.floor(Number(r[0]) / 1000) as Time,
        open: toNum(r[1]),
        high: toNum(r[2]),
        low: toNum(r[3]),
        close: toNum(r[4]),
      }));
      const volumes: HistogramData[] = kl.map((r: any) => ({
        time: Math.floor(Number(r[0]) / 1000) as Time,
        value: toNum(r[5]),
        color: toNum(r[4]) >= toNum(r[1]) ? "#22c55e" : "#ef4444",
      }));
      const markLine: LineData[] = markKl.map((r: any) => ({
        time: Math.floor(Number(r[0]) / 1000) as Time,
        value: toNum(r[4]),
      }));
      const indexLine: LineData[] = idxKl.map((r: any) => ({
        time: Math.floor(Number(r[0]) / 1000) as Time,
        value: toNum(r[4]),
      }));
      const fundingLine: LineData[] = fund.map((x: any) => ({
        time: Math.floor(Number(x.fundingTime) / 1000) as Time,
        value: Number(x.fundingRate) * 100,
      }));
      const oiLine: LineData[] = oi.map((x: any) => ({
        time: Math.floor(Number(x.timestamp) / 1000) as Time,
        value: Number(x.openInterest),
      }));
      const oiDelta: HistogramData[] = oiLine.map((v, i) => ({
        time: v.time,
        value: i === 0 ? 0 : v.value - oiLine[i - 1].value,
        color: i === 0
          ? "#60a5fa"
          : v.value - oiLine[i - 1].value >= 0
            ? "#22c55e"
            : "#ef4444",
      }));
      const lsrLine: LineData[] = lsr.map((x: any) => ({
        time: Math.floor(Number(x.timestamp) / 1000) as Time,
        value: Number(x.longAccountRatio),
      }));

      tradeBuckets.current = {};
      (trades as any[]).forEach((t) => {
        const ts = Math.floor(Number(t.execTime || t.time) / 1000);
        const m = Math.floor(ts / 60) * 60;
        if (!tradeBuckets.current[m]) tradeBuckets.current[m] = { buy: 0, sell: 0 };
        if ((t.side || t.execType) === "Buy")
          tradeBuckets.current[m].buy += toNum(t.execQty || t.qty);
        else tradeBuckets.current[m].sell += toNum(t.execQty || t.qty);
      });
      const imbalance: HistogramData[] = Object.entries(tradeBuckets.current).map(
        ([time, v]) => {
          const total = v.buy + v.sell;
          const val = total > 0 ? (v.buy - v.sell) / total : 0;
          return {
            time: Number(time) as Time,
            value: val,
            color: val >= 0 ? "#22c55e" : "#ef4444",
          };
        },
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
      candleSeries.current.setData(candles);
      markSeries.current =
        markSeries.current || mainChart.current.addLineSeries({ color: "#fbbf24" });
      markSeries.current.setData(markLine);
      indexSeries.current =
        indexSeries.current || mainChart.current.addLineSeries({ color: "#60a5fa" });
      indexSeries.current.setData(indexLine);

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
    }
    load();
  }, [symbol, interval]);

  useEffect(() => {
    if (!candleSeries.current) return;
    const unsubs: (() => void)[] = [];
    unsubs.push(
      bybitService.subscribeKline(symbol, interval, (d) => {
        const time = Math.floor(Number(d.start || d.startTime) / 1000) as Time;
        const bar: CandlestickData = {
          time,
          open: toNum(d.open),
          high: toNum(d.high),
          low: toNum(d.low),
          close: toNum(d.close),
        };
        candleSeries.current?.update(bar);
        volSeries.current?.update({
          time,
          value: toNum(d.volume || d.turnover),
          color: bar.close >= bar.open ? "#22c55e" : "#ef4444",
        });
      }) || (() => {}),
    );
    unsubs.push(
      bybitService.subscribeMarkPrice(symbol, interval, (d) => {
        const time = Math.floor(Number(d.start || d.time) / 1000) as Time;
        markSeries.current?.update({ time, value: toNum(d.close) });
      }) || (() => {}),
    );
    unsubs.push(
      bybitService.subscribeIndexPrice(symbol, interval, (d) => {
        const time = Math.floor(Number(d.start || d.time) / 1000) as Time;
        indexSeries.current?.update({ time, value: toNum(d.close) });
      }) || (() => {}),
    );
    unsubs.push(
      bybitService.subscribeTrades(symbol, (t) => {
        const ts = Math.floor(Number(t.execTime || t.T) / 1000);
        const m = Math.floor(ts / 60) * 60;
        if (!tradeBuckets.current[m]) tradeBuckets.current[m] = { buy: 0, sell: 0 };
        if ((t.side || t.S) === 'Buy')
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
      }) || (() => {}),
    );
    return () => {
      unsubs.forEach((u) => u());
    };
  }, [symbol, interval]);

  return (
    <div className="space-y-2">
      <div ref={mainRef} className="h-64 w-full" />
      <div ref={volRef} className="h-20 w-full" />
      <div ref={fundRef} className="h-20 w-full" />
      <div ref={oiRef} className="h-20 w-full" />
      <div ref={lsrRef} className="h-20 w-full" />
      <div ref={imbRef} className="h-20 w-full" />
    </div>
  );
}
