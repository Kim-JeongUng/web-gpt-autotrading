"use client"

import { useEffect, useState } from "react"
import { bybitService } from "@/lib/bybit-client"
import { CandlestickChart, Candle } from "./candlestick-chart"
import { RSIChart } from "./rsi-chart"

interface Props {
  symbol: string
  timeframe?: "1m" | "5m" | "15m" | "1h" | "4h" | "1d"
}

const intervalMap: Record<string, string> = {
  "1m": "1",
  "5m": "5",
  "15m": "15",
  "1h": "60",
  "4h": "240",
  "1d": "D",
}
const msMap: Record<string, number> = {
  "1m": 60 * 1000,
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
}

export function WebsocketCandlestickChart({ symbol, timeframe = "1m" }: Props) {
  const [candles, setCandles] = useState<Candle[]>([])

  useEffect(() => {
    let cancelled = false
    let unsub: (() => void) | undefined

    const calculateIndicators = (data: Candle[]) => {
      const closes = data.map((d) => d.close)
      const rsiPeriod = 14
      const bbPeriod = 20
      for (let i = 0; i < data.length; i++) {
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

        const bbStart = Math.max(0, i - bbPeriod + 1)
        const slice = closes.slice(bbStart, i + 1)
        const mean = slice.reduce((a, b) => a + b, 0) / slice.length
        const std = Math.sqrt(
          slice.reduce((s, v) => s + (v - mean) ** 2, 0) / slice.length,
        )
        data[i].bb_middle = mean
        data[i].bb_upper = mean + 2 * std
        data[i].bb_lower = mean - 2 * std
      }
    }

    const fetchData = async () => {
      let start: number | undefined
      let combined: Candle[] = []
      for (let i = 0; i < 5; i++) {
        try {
          const list = await bybitService.getKlines({
            symbol,
            interval: intervalMap[timeframe] || "1",
            limit: 200,
            category: "linear",
            start,
          })
          if (!list.length) break
          list.sort((a: any, b: any) => Number(a[0]) - Number(b[0]))
          const chunk: Candle[] = list.map((k: any) => ({
            time: Number(k[0]),
            open: Number(k[1]),
            high: Number(k[2]),
            low: Number(k[3]),
            close: Number(k[4]),
            volume: Number(k[5]),
          }))
          combined = [...chunk, ...combined]
          start = Number(list[0][0]) - msMap[timeframe] * 200
        } catch (err) {
          console.error("Failed to fetch klines", err)
          break
        }
      }
      if (!cancelled) {
        calculateIndicators(combined)
        setCandles(combined)
        unsub = bybitService.subscribeToKlines(
          symbol,
          intervalMap[timeframe] || "1",
          (k) => {
            setCandles((prev) => {
              const ts = k.start < 1e12 ? k.start * 1000 : k.start
              const newItem: Candle = {
                time: ts,
                open: k.open,
                high: k.high,
                low: k.low,
                close: k.close,
                volume: k.volume,
              }
              const updated = [...prev]
              if (updated.length && updated[updated.length - 1].time === newItem.time) {
                updated[updated.length - 1] = newItem
              } else {
                updated.push(newItem)
              }
              updated.sort((a, b) => a.time - b.time)
              calculateIndicators(updated)
              return updated.slice(-1000)
            })
          }
        )
      }
    }

    fetchData()

    return () => {
      cancelled = true
      unsub?.()
    }
  }, [symbol, timeframe])

  const rsiData = candles.map((c) => ({
    time: new Date(c.time).toLocaleTimeString("ko-KR", { hour12: false }),
    rsi: c.rsi || 0,
  }))

  return (
    <div className="space-y-4">
      <CandlestickChart
        key={`${symbol}-${timeframe}`}
        data={candles}
        initialCandles={40}
        showBollinger
      />
      <div>
        <h4 className="text-sm font-medium mb-2">RSI (14)</h4>
        <RSIChart data={rsiData} />
      </div>
    </div>
  )
}

