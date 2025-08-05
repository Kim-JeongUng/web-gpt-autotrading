"use client"

const SERVER_URL =
  process.env.NEXT_PUBLIC_TRADING_SERVER || "http://localhost:4000"

export class BybitService {
  async setCredentials(apiKey: string, apiSecret: string, testnet = false) {
    try {
      await fetch(`${SERVER_URL}/api/set-credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, apiSecret, testnet }),
      })
    } catch (err) {
      console.error("Failed to update server credentials:", err)
    }
  }

  async validateCredentials(apiKey: string, apiSecret: string, testnet = false) {
    try {
      const res = await fetch(`${SERVER_URL}/api/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, apiSecret, testnet }),
      })
      const data = await res.json()
      if (!res.ok || !data.valid) {
        throw new Error(data.error || "Invalid credentials")
      }
      return true
    } catch (err) {
      console.error("API credential validation failed:", err)
      throw err
    }
  }

  async getKlines(params: {
    symbol: string
    interval?: string
    limit?: number
    category?: string
    start?: number
    end?: number
  }) {
    const query = new URLSearchParams({
      symbol: params.symbol,
      interval: params.interval?.toString() || "1",
      limit: (params.limit || 200).toString(),
      category: params.category || "linear",
    })
    if (params.start) query.set("start", params.start.toString())
    if (params.end) query.set("end", params.end.toString())

    const res = await fetch(`${SERVER_URL}/api/klines?${query.toString()}`)
    if (!res.ok) {
      const message = await res.text()
      throw new Error(`Server error ${res.status}: ${message}`)
    }
    const data = await res.json()
    return data.result?.list || []
  }

  async getAccountBalance() {
    try {
      const res = await fetch(`${SERVER_URL}/api/balance`)
      if (!res.ok) {
        const message = await res.text()
        throw new Error(`Server error ${res.status}: ${message}`)
      }
      const data = await res.json()
      return data
    } catch (error) {
      console.error("Error fetching account balance:", error)
      throw error
    }
  }

  async getPositions() {
    try {
      const res = await fetch(`${SERVER_URL}/api/positions`)
      if (!res.ok) {
        const message = await res.text()
        throw new Error(`Server error ${res.status}: ${message}`)
      }
      const data = await res.json()
      return data.result?.list || []
    } catch (error) {
      console.error("Error fetching positions:", error)
      throw error
    }
  }

  async placeOrder(orderParams: {
    symbol: string
    side: "Buy" | "Sell"
    orderType: "Market" | "Limit"
    qty: string
    price?: string
    leverage?: number
    positionIdx?: number
    takeProfit?: string
    stopLoss?: string
  }) {
    try {
      const res = await fetch(`${SERVER_URL}/api/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderParams),
      })
      if (!res.ok) {
        const message = await res.text()
        throw new Error(`Server error ${res.status}: ${message}`)
      }
      const data = await res.json()
      return data
    } catch (error) {
      console.error("Error placing order:", error)
      throw error
    }
  }

  async getActiveOrders() {
    try {
      const res = await fetch(`${SERVER_URL}/api/orders`)
      if (!res.ok) {
        const message = await res.text()
        throw new Error(`Server error ${res.status}: ${message}`)
      }
      const data = await res.json()
      return data.result?.list || []
    } catch (error) {
      console.error("Error fetching orders:", error)
      throw error
    }
  }

  async amendOrder(params: { symbol: string; orderId: string; qty?: string; price?: string }) {
    try {
      const res = await fetch(`${SERVER_URL}/api/amend-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      })
      if (!res.ok) {
        const message = await res.text()
        throw new Error(`Server error ${res.status}: ${message}`)
      }
      const data = await res.json()
      return data.result
    } catch (error) {
      console.error("Error amending order:", error)
      throw error
    }
  }

  async closePosition(params: { symbol: string; side: "Buy" | "Sell"; qty: string; positionIdx?: number }) {
    try {
      const res = await fetch(`${SERVER_URL}/api/close-position`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      })
      if (!res.ok) {
        const message = await res.text()
        throw new Error(`Server error ${res.status}: ${message}`)
      }
      const data = await res.json()
      return data.result
    } catch (error) {
      console.error("Error closing position:", error)
      throw error
    }
  }

  async setTradingStop(params: { symbol: string; takeProfit?: string; stopLoss?: string; positionIdx?: number }) {
    try {
      const res = await fetch(`${SERVER_URL}/api/trading-stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      })
      if (!res.ok) {
        const message = await res.text()
        throw new Error(`Server error ${res.status}: ${message}`)
      }
      const data = await res.json()
      return data.result
    } catch (error) {
      console.error("Error updating position:", error)
      throw error
    }
  }

  async getGeminiAnalysis(data: any) {
    try {
      const res = await fetch(`${SERVER_URL}/api/gemini`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const message = await res.text()
        throw new Error(`Server error ${res.status}: ${message}`)
      }
      const result = await res.json()
      return result.text as string
    } catch (error) {
      console.error("Error fetching Gemini analysis:", error)
      throw error
    }
  }

  subscribeToTickers(symbols: string[], callback: (data: any) => void) {
    const interval = setInterval(async () => {
      for (const symbol of symbols) {
        try {
          const res = await fetch(
            `${SERVER_URL}/api/ticker?symbol=${symbol}&category=linear`,
          )
          if (!res.ok) continue
          const data = await res.json()
          const ticker = data.result?.list?.[0]
          if (ticker) {
            callback({ topic: `tickers.${symbol}`, data: ticker })
          }
        } catch (error) {
          console.error("Error fetching ticker:", error)
        }
      }
    }, 2000)

    return () => clearInterval(interval)
  }

  subscribeToOrderbook(symbol: string, callback: (data: any) => void) {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `${SERVER_URL}/api/orderbook?symbol=${symbol}&category=linear&limit=25`,
        )
        if (!res.ok) return
        const data = await res.json()
        if (data.result) {
          callback({ topic: `orderbook.25.${symbol}`, data: data.result })
        }
      } catch (error) {
        console.error("Error fetching orderbook:", error)
      }
    }, 1000)

    return () => clearInterval(interval)
  }

  subscribeToKlines(symbol: string, interval: string, callback: (data: any) => void) {
    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(
          `${SERVER_URL}/api/klines?symbol=${symbol}&interval=${interval}&limit=1`,
        )
        if (!res.ok) return
        const data = await res.json()
        const kline = data.result?.list?.[0]
        if (kline) {
          callback({
            start: Number(kline.start),
            open: Number(kline.open),
            high: Number(kline.high),
            low: Number(kline.low),
            close: Number(kline.close),
            volume: Number(kline.volume),
          })
        }
      } catch (error) {
        console.error("Error fetching klines:", error)
      }
    }, 1000)

    return () => clearInterval(intervalId)
  }
}

// Global instance
export const bybitService = new BybitService()
