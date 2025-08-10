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
}

function toNum(s?: string) {
  return s ? Number(s) : 0;
}

export function BybitMarketChart({ symbol }: Props) {
  const mainRef = useRef<HTMLDivElement>(null);
  const volRef = useRef<HTMLDivElement>(null);
  const fundRef = useRef<HTMLDivElement>(null);
  const oiRef = useRef<HTMLDivElement>(null);
  const lsrRef = useRef<HTMLDivElement>(null);

  const mainChart = useRef<ReturnType<typeof createChart>>();
  const volChart = useRef<ReturnType<typeof createChart>>();
  const fundChart = useRef<ReturnType<typeof createChart>>();
  const oiChart = useRef<ReturnType<typeof createChart>>();
  const lsrChart = useRef<ReturnType<typeof createChart>>();

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
  }, []);

  useEffect(() => {
    async function load() {
      if (!mainChart.current) return;
      const [kl, markKl, idxKl, fund, oi, lsr, trades] = await Promise.all([
        bybitService.getKlines({ symbol, interval: "1", limit: 1000 }),
        bybitService.getMarkPriceKlines({ symbol, interval: "1", limit: 1000 }),
        bybitService.getIndexPriceKlines({ symbol, interval: "1", limit: 1000 }),
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

      const tradeBuckets: Record<number, { buy: number; sell: number }> = {};
      (trades as any[]).forEach((t) => {
        const ts = Math.floor(Number(t.execTime || t.time) / 1000);
        const m = Math.floor(ts / 60) * 60;
        if (!tradeBuckets[m]) tradeBuckets[m] = { buy: 0, sell: 0 };
        if ((t.side || t.execType) === "Buy") tradeBuckets[m].buy += toNum(t.execQty || t.qty);
        else tradeBuckets[m].sell += toNum(t.execQty || t.qty);
      });
      const imbalance: HistogramData[] = Object.entries(tradeBuckets).map(
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

      const candleSeries = mainChart.current.addCandlestickSeries({
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderVisible: false,
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
      });
      candleSeries.setData(candles);
      const markSeries = mainChart.current.addLineSeries({ color: "#fbbf24" });
      markSeries.setData(markLine);
      const indexSeries = mainChart.current.addLineSeries({ color: "#60a5fa" });
      indexSeries.setData(indexLine);

      const volSeries = volChart.current!.addHistogramSeries({ color: "#9ca3af" });
      volSeries.setData(volumes);
      const fundSeries = fundChart.current!.addLineSeries({ color: "#f472b6" });
      fundSeries.setData(fundingLine);
      const oiSeries = oiChart.current!.addLineSeries({ color: "#a855f7" });
      oiSeries.setData(oiLine);
      const oiDeltaSeries = oiChart.current!.addHistogramSeries({ color: "#fde047" });
      oiDeltaSeries.setData(oiDelta);
      const lsrSeries = lsrChart.current!.addLineSeries({ color: "#10b981" });
      lsrSeries.setData(lsrLine);
    }
    load();
  }, [symbol]);

  return (
    <div className="space-y-2">
      <div ref={mainRef} className="h-64 w-full" />
      <div ref={volRef} className="h-20 w-full" />
      <div ref={fundRef} className="h-20 w-full" />
      <div ref={oiRef} className="h-20 w-full" />
      <div ref={lsrRef} className="h-20 w-full" />
    </div>
  );
}
