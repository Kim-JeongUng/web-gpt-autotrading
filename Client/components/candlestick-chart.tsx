"use client"

import { useRef, useEffect, useState } from "react"

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
  bb_upper?: number
  bb_middle?: number
  bb_lower?: number
  rsi?: number
}

interface Props {
  data: Candle[]
  width?: number
  height?: number
  initialCandles?: number
  showBollinger?: boolean
}

export function CandlestickChart({ data, width, height = 300, initialCandles, showBollinger = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [chartWidth, setChartWidth] = useState(width ?? 0)
  const [zoom, setZoom] = useState(1)
  const [hover, setHover] = useState<{ x: number; y: number; candle: Candle } | null>(null)
  const hasInitialZoom = useRef(false)

  useEffect(() => {
    if (width) {
      setChartWidth(width)
      return
    }
    const resize = () => {
      if (containerRef.current) {
        setChartWidth(containerRef.current.clientWidth)
      }
    }
    resize()
    window.addEventListener("resize", resize)
    return () => window.removeEventListener("resize", resize)
  }, [width])

  useEffect(() => {
    if (initialCandles && data.length && !hasInitialZoom.current) {
      setZoom(data.length / initialCandles)
      hasInitialZoom.current = true
    }
  }, [data.length, initialCandles])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !data.length || chartWidth === 0) return

    const dpr = window.devicePixelRatio || 1
    canvas.style.width = `${chartWidth}px`
    canvas.style.height = `${height}px`
    canvas.width = chartWidth * dpr
    canvas.height = height * dpr

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, chartWidth, height)

    const visibleCount = Math.max(10, Math.min(data.length, Math.floor(data.length / zoom)))
    const visible = data.slice(-visibleCount)

    const prices = visible.flatMap((d) => [d.high, d.low])
    if (showBollinger) {
      visible.forEach((d) => {
        if (d.bb_upper !== undefined && d.bb_lower !== undefined) {
          prices.push(d.bb_upper, d.bb_lower)
        }
      })
    }
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice || 1

    const candleWidth = (chartWidth - 100) / visibleCount
    const chartHeight = height - 80

    ctx.strokeStyle = "#2a2a2a"
    ctx.lineWidth = 1 / dpr

    for (let i = 0; i <= 10; i++) {
      const y = 40 + (chartHeight / 10) * i
      ctx.beginPath()
      ctx.moveTo(50, y)
      ctx.lineTo(chartWidth - 50, y)
      ctx.stroke()
    }

    for (let i = 0; i <= 10; i++) {
      const x = 50 + ((chartWidth - 100) / 10) * i
      ctx.beginPath()
      ctx.moveTo(x, 40)
      ctx.lineTo(x, height - 40)
      ctx.stroke()
    }

    ctx.fillStyle = "#888"
    ctx.font = "12px monospace"
    ctx.textAlign = "right"
    for (let i = 0; i <= 10; i++) {
      const price = maxPrice - (priceRange / 10) * i
      const y = 40 + (chartHeight / 10) * i
      ctx.fillText(price.toFixed(0), 45, y + 4)
    }

    visible.forEach((candle, index) => {
      const x = 50 + index * candleWidth + candleWidth / 2
      const openY = 40 + ((maxPrice - candle.open) / priceRange) * chartHeight
      const closeY = 40 + ((maxPrice - candle.close) / priceRange) * chartHeight
      const highY = 40 + ((maxPrice - candle.high) / priceRange) * chartHeight
      const lowY = 40 + ((maxPrice - candle.low) / priceRange) * chartHeight
      const isGreen = candle.close > candle.open

      ctx.strokeStyle = isGreen ? "#00ff88" : "#ff4444"
      ctx.lineWidth = 1 / dpr
      ctx.beginPath()
      ctx.moveTo(x, highY)
      ctx.lineTo(x, lowY)
      ctx.stroke()

      ctx.fillStyle = isGreen ? "#00ff88" : "#ff4444"
      const bodyTop = Math.min(openY, closeY)
      const bodyHeight = Math.abs(closeY - openY)
      ctx.fillRect(
        x - candleWidth / 4,
        bodyTop,
        candleWidth / 2,
        Math.max(bodyHeight, 1 / dpr)
      )
    })

    if (showBollinger) {
      const drawLine = (key: keyof Candle, color: string) => {
        ctx.strokeStyle = color
        ctx.lineWidth = 1
        ctx.beginPath()
        visible.forEach((candle, index) => {
          const value = candle[key]
          if (value === undefined) return
          const x = 50 + index * candleWidth + candleWidth / 2
          const y = 40 + ((maxPrice - value) / priceRange) * chartHeight
          if (index === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.stroke()
      }
      drawLine("bb_upper", "#d1d5db")
      drawLine("bb_middle", "#6b7280")
      drawLine("bb_lower", "#d1d5db")
    }
  }, [data, chartWidth, height, zoom])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setZoom((z) => Math.min(100, Math.max(0.5, z - e.deltaY * 0.005)))
    }
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const visibleCount = Math.max(10, Math.min(data.length, Math.floor(data.length / zoom)))
      const candleWidth = (chartWidth - 100) / visibleCount
      const index = Math.floor((x - 50) / candleWidth)
      const visible = data.slice(-visibleCount)

      if (index >= 0 && index < visible.length) {
        setHover({ x, y, candle: visible[index] })
      } else {
        setHover(null)
      }
    }
    const onLeave = () => setHover(null)

    canvas.addEventListener("wheel", onWheel, { passive: false })
    canvas.addEventListener("mousemove", onMove)
    canvas.addEventListener("mouseleave", onLeave)
    return () => {
      canvas.removeEventListener("wheel", onWheel)
      canvas.removeEventListener("mousemove", onMove)
      canvas.removeEventListener("mouseleave", onLeave)
    }
  }, [data, chartWidth, zoom])

  return (
    <div ref={containerRef} className="relative w-full" style={{ height }}>
      <canvas ref={canvasRef} className="border border-gray-800 bg-gray-900 w-full h-full" />
      {hover && (
        <div
          className="absolute text-xs bg-black bg-opacity-75 text-white p-2 rounded border border-gray-700 pointer-events-none"
          style={{ left: hover.x + 10, top: hover.y + 10 }}
        >
          <div>O: {hover.candle.open.toFixed(2)}</div>
          <div>H: {hover.candle.high.toFixed(2)}</div>
          <div>L: {hover.candle.low.toFixed(2)}</div>
          <div>C: {hover.candle.close.toFixed(2)}</div>
        </div>
      )}
    </div>
  )
}

