"use client"

import { RestClientV5, WebsocketClient } from "bybit-api"

const SERVER_URL =
  process.env.NEXT_PUBLIC_TRADING_SERVER || "http://localhost:4000"

export interface BybitConfig {
  apiKey?: string
  apiSecret?: string
  testnet?: boolean
}

export class BybitService {
  private restClient: RestClientV5 | null = null
  private wsClient: WebsocketClient | null = null
  private config: BybitConfig

  constructor(config: BybitConfig = {}) {
    this.config = {
    apiKey: process.env.NEXT_PUBLIC_BYBIT_API_KEY || config.apiKey,
    apiSecret: process.env.NEXT_PUBLIC_BYBIT_API_SECRET || config.apiSecret,
    testnet:
      config.testnet ?? (process.env.NEXT_PUBLIC_BYBIT_TESTNET === 'true'),
  }

  console.log("Final config:", this.config);

  if (this.config.apiKey && this.config.apiSecret) {
    this.initializeClients()
  }
  }


  /** Update API credentials and reinitialize clients if not in simulation mode */
  async setCredentials(apiKey: string, apiSecret: string, testnet = false) {
    this.config = {
      ...this.config,
      apiKey,
      apiSecret,
      testnet,
    }
    this.initializeClients()

    try {
      await fetch(`${SERVER_URL}/api/set-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, apiSecret, testnet }),
      })
    } catch (err) {
      console.error('Failed to update server credentials:', err)
    }
  }

  /** Validate that the provided credentials can make authenticated requests */
  async validateCredentials(apiKey: string, apiSecret: string, testnet = false) {
    try {
      const res = await fetch(`${SERVER_URL}/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, apiSecret, testnet }),
      })
      const data = await res.json()
      if (!res.ok || !data.valid) {
        throw new Error(data.error || 'Invalid credentials')
      }
      return true
    } catch (err) {
      console.error('API credential validation failed:', err)
      throw err
    }
  }

  private initializeClients() {
    try {
      // Clean up previous clients if they exist
      if (this.wsClient) {
        try {
          this.wsClient.closeAll?.()
        } catch (e) {
          console.warn("Failed to close existing websocket client", e)
        }
      }

      this.restClient = new RestClientV5({
        key: this.config.apiKey,
        secret: this.config.apiSecret,
        testnet: this.config.testnet ?? true,
      })

      this.wsClient = new WebsocketClient({
        key: this.config.apiKey,
        secret: this.config.apiSecret,
        testnet: this.config.testnet ?? true,
        market: "v5",
      })
    } catch (error) {
      console.error("Failed to initialize Bybit clients:", error)
    }
  }

  /** Fetch historical klines from the local server */
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
      interval: params.interval?.toString() || '1',
      limit: (params.limit || 200).toString(),
      category: params.category || 'linear',
    })
    if (params.start) query.set('start', params.start.toString())
    if (params.end) query.set('end', params.end.toString())

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

  async cancelOrder(symbol: string, orderId: string) {

    try {
      if (!this.restClient) throw new Error("REST client not initialized")

      const response = await this.restClient.cancelOrder({
        category: "linear",
        symbol,
        orderId,
      })

      return response.result
    } catch (error) {
      console.error("Error canceling order:", error)
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
      console.error('Error fetching orders:', error)
      throw error
    }
  }

  async amendOrder(params: { symbol: string; orderId: string; qty?: string; price?: string }) {
    try {
      const res = await fetch(`${SERVER_URL}/api/amend-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!res.ok) {
        const message = await res.text()
        throw new Error(`Server error ${res.status}: ${message}`)
      }
      const data = await res.json()
      return data.result
    } catch (error) {
      console.error('Error amending order:', error)
      throw error
    }
  }

  async closePosition(params: { symbol: string; side: 'Buy' | 'Sell'; qty: string; positionIdx?: number }) {
    try {
      const res = await fetch(`${SERVER_URL}/api/close-position`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!res.ok) {
        const message = await res.text()
        throw new Error(`Server error ${res.status}: ${message}`)
      }
      const data = await res.json()
      return data.result
    } catch (error) {
      console.error('Error closing position:', error)
      throw error
    }
  }

  async setTradingStop(params: { symbol: string; takeProfit?: string; stopLoss?: string; positionIdx?: number }) {
    try {
      const res = await fetch(`${SERVER_URL}/api/trading-stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!res.ok) {
        const message = await res.text()
        throw new Error(`Server error ${res.status}: ${message}`)
      }
      const data = await res.json()
      return data.result
    } catch (error) {
      console.error('Error updating position:', error)
      throw error
    }
  }

  // async getGptAnalysis(data: any) {
  //   try {
  //     const res = await fetch(`${SERVER_URL}/api/gpt`, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify(data),
  //     })
  //     if (!res.ok) {
  //       const message = await res.text()
  //       throw new Error(`Server error ${res.status}: ${message}`)
  //     }
  //     const result = await res.json()
  //     return result.text as string
  //   } catch (error) {
  //     console.error('Error fetching GPT analysis:', error)
  //     throw error
  //   }
  // }

  async getGeminiAnalysis(data: any) {
    try {
      const res = await fetch(`${SERVER_URL}/api/gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const message = await res.text()
        throw new Error(`Server error ${res.status}: ${message}`)
      }
      const result = await res.json()
      return result.text as string
    } catch (error) {
      console.error('Error fetching Gemini analysis:', error)
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
          console.error('Error fetching ticker:', error)
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
        console.error('Error fetching orderbook:', error)
      }
    }, 1000)

    return () => clearInterval(interval)
  }

  subscribeToKlines(
    symbol: string,
    interval: string,
    callback: (data: any) => void,
  ) {

    if (!this.wsClient) {
      this.initializeClients()
    }

    const topic = `kline.${interval}.${symbol}`
    const handler = (event: any) => {
      if (event.topic === topic && event.data) {
        const d = Array.isArray(event.data) ? event.data[0] : event.data
        callback({
          start: Number(d.start),
          open: Number(d.open),
          high: Number(d.high),
          low: Number(d.low),
          close: Number(d.close),
          volume: Number(d.volume),
        })
      }
    }

    this.wsClient?.on('update', handler)
    this.wsClient?.subscribeV5(topic, 'linear')

    return () => {
      try {
        this.wsClient?.unsubscribeV5(topic, 'linear')
      } catch (err) {
        console.warn('Failed to unsubscribe klines', err)
      }
      this.wsClient?.off('update', handler)
    }
  }

}

// Global instance
export const bybitService = new BybitService()
