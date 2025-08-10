"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
} from "lightweight-charts";
import { bybitService } from "@/lib/bybit-client";

interface Props {
  symbol: string;
}

export function BybitMarketChart({ symbol }: Props) {
  const mainRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);
  const fundingRef = useRef<HTMLDivElement>(null);
  const oiRef = useRef<HTMLDivElement>(null);
  const lsrRef = useRef<HTMLDivElement>(null);
  const tradeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const [kl, markKl, idxKl, fund, oi, lsr, trades] = await Promise.all([
        bybitService.getKlines({ symbol, interval: "1", limit: 1000, category: "linear" }),
        bybitService.getMarkPriceKlines({ symbol, interval: "1", limit: 1000, category: "linear" }),
        bybitService.getIndexPriceKlines({ symbol, interval: "1", limit: 1000, category: "linear" }),
        bybitService.getFundingRateHistory({ symbol, category: "linear", limit: 200 }),
        bybitService.getOpenInterest({ symbol, category: "linear", intervalTime: "5min", limit: 200 }),
        bybitService.getLongShortRatio({ symbol, category: "linear", period: "5min", limit: 200 }),
        bybitService.getRecentTrades({ symbol, category: "linear", limit: 1000 }),
      ]);

      const toNum = (s?: string) => (s ? Number(s) : 0);
      const candles = kl.map((r: any) => ({
        time: Math.floor(Number(r[0]) / 1000),
        open: toNum(r[1]),
        high: toNum(r[2]),
        low: toNum(r[3]),
        close: toNum(r[4]),
        volume: toNum(r[5]),
      }));

      const markLine = markKl.map((r: any) => ({
        time: Math.floor(Number(r[0]) / 1000),
        value: toNum(r[4]),
      }));
      const indexLine = idxKl.map((r: any) => ({
        time: Math.floor(Number(r[0]) / 1000),
        value: toNum(r[4]),
      }));

      const funding = fund.map((x: any) => ({
        time: Math.floor(Number(x.fundingTime) / 1000),
        value: Number(x.fundingRate) * 100,
      }));

      const oiMap = new Map<number, number>();
      oi.forEach((x: any) => {
        const t = Math.floor(Number(x.timestamp || x.time) / 1000);
        oiMap.set(t, Number(x.openInterest));
      });
      const start = candles[0]?.time;
      const end = candles[candles.length - 1]?.time;
      const oiSeries: { time: number; value: number }[] = [];
      const oiDeltaSeries: { time: number; value: number }[] = [];
      let last = 0;
      if (start && end) {
        for (let t = start; t <= end; t += 60) {
          const v = oiMap.get(t) ?? last;
          oiSeries.push({ time: t, value: v });
          oiDeltaSeries.push({ time: t, value: v - last });
          last = v;
        }
      }

      const lsrSeries = lsr.map((x: any) => ({
        time: Math.floor(Number(x.timestamp) / 1000),
        value: Number(x.longAccountRatio) * 100,
      }));

      const tradeBuckets = new Map<number, { buy: number; sell: number }>();
      trades.forEach((t: any) => {
        const ts = Math.floor(Number(t.execTime) / 60000) * 60;
        const vol = Number(t.execQty);
        const sideBuy = t.side === "Buy";
        const bucket = tradeBuckets.get(ts) || { buy: 0, sell: 0 };
        if (sideBuy) bucket.buy += vol;
        else bucket.sell += vol;
        tradeBuckets.set(ts, bucket);
      });
      const tradeHist: { time: number; value: number }[] = [];
      tradeBuckets.forEach((v, ts) => {
        const total = v.buy + v.sell;
        const imb = total ? (v.buy - v.sell) / total : 0;
        tradeHist.push({ time: ts, value: imb });
      });
      tradeHist.sort((a, b) => a.time - b.time);

      if (mainRef.current) {
        const chart = createChart(mainRef.current, {
          height: 300,
          layout: {
            background: { type: ColorType.Solid, color: "#111827" },
            textColor: "#e5e7eb",
          },
          grid: {
            vertLines: { color: "#374151" },
            horzLines: { color: "#374151" },
          },
        });
        const candleSeries = chart.addCandlestickSeries({
          upColor: "#22c55e",
          downColor: "#ef4444",
          borderVisible: false,
          wickUpColor: "#22c55e",
          wickDownColor: "#ef4444",
        });
        candleSeries.setData(candles);
        const markSeries = chart.addLineSeries({ color: "#f59e0b" });
        markSeries.setData(markLine);
        const indexSeries = chart.addLineSeries({ color: "#3b82f6" });
        indexSeries.setData(indexLine);
        chart.timeScale().fitContent();
      }

      if (volumeRef.current) {
        const chart = createChart(volumeRef.current, {
          height: 80,
          layout: {
            background: { type: ColorType.Solid, color: "#111827" },
            textColor: "#e5e7eb",
          },
          grid: {
            vertLines: { color: "#374151" },
            horzLines: { color: "#374151" },
          },
          timeScale: { visible: false },
        });
        const volumeSeries = chart.addHistogramSeries({
          color: "#e5e7eb",
          priceFormat: { type: "volume" },
          priceScaleId: "",
        });
        volumeSeries.setData(
          candles.map((c) => ({
            time: c.time,
            value: c.volume,
            color: c.close >= c.open ? "#22c55e" : "#ef4444",
          })),
        );
        chart.timeScale().fitContent();
      }

      if (fundingRef.current) {
        const chart = createChart(fundingRef.current, {
          height: 80,
          layout: {
            background: { type: ColorType.Solid, color: "#111827" },
            textColor: "#e5e7eb",
          },
          grid: {
            vertLines: { color: "#374151" },
            horzLines: { color: "#374151" },
          },
          timeScale: { visible: false },
        });
        const series = chart.addLineSeries({ color: "#f97316" });
        series.setData(funding);
        chart.timeScale().fitContent();
      }

      if (oiRef.current) {
        const chart = createChart(oiRef.current, {
          height: 80,
          layout: {
            background: { type: ColorType.Solid, color: "#111827" },
            textColor: "#e5e7eb",
          },
          grid: {
            vertLines: { color: "#374151" },
            horzLines: { color: "#374151" },
          },
          timeScale: { visible: false },
        });
        const line = chart.addLineSeries({ color: "#10b981" });
        line.setData(oiSeries);
        const hist = chart.addHistogramSeries({
          color: "#60a5fa",
          priceScaleId: "right",
        });
        hist.setData(oiDeltaSeries);
        chart.timeScale().fitContent();
      }

      if (lsrRef.current) {
        const chart = createChart(lsrRef.current, {
          height: 80,
          layout: {
            background: { type: ColorType.Solid, color: "#111827" },
            textColor: "#e5e7eb",
          },
          grid: {
            vertLines: { color: "#374151" },
            horzLines: { color: "#374151" },
          },
          timeScale: { visible: false },
          rightPriceScale: { scaleMargins: { top: 0.1, bottom: 0.1 } },
        });
        const line = chart.addLineSeries({ color: "#8b5cf6" });
        line.setData(lsrSeries);
        chart.priceScale("right").applyOptions({ autoScale: true });
        chart.timeScale().fitContent();
      }

      if (tradeRef.current) {
        const chart = createChart(tradeRef.current, {
          height: 80,
          layout: {
            background: { type: ColorType.Solid, color: "#111827" },
            textColor: "#e5e7eb",
          },
          grid: {
            vertLines: { color: "#374151" },
            horzLines: { color: "#374151" },
          },
          timeScale: { visible: false },
        });
        const hist = chart.addHistogramSeries({ color: "#94a3b8" });
        hist.setData(tradeHist);
        chart.timeScale().fitContent();
      }
    };

    load();
  }, [symbol]);

  return (
    <div className="space-y-2">
      <div ref={mainRef} />
      <div ref={volumeRef} />
      <div ref={fundingRef} />
      <div ref={oiRef} />
      <div ref={lsrRef} />
      <div ref={tradeRef} />
    </div>
  );
}

export default BybitMarketChart;
