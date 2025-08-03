"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useTradingStore } from "@/lib/trading-store"
import { bybitService } from "@/lib/bybit-client"
import { WebsocketCandlestickChart } from "@/components/websocket-candlestick-chart"
import { RealTimeOrderBook } from "@/components/real-time-order-book"
import { EnhancedPositionManager } from "@/components/enhanced-position-manager"
import { TrendingUp, TrendingDown, AlertTriangle, Wifi, WifiOff, BarChart3 } from "lucide-react"

const SUPPORTED_SYMBOLS = [
  { symbol: "BTCUSDT", name: "Bitcoin" },
  { symbol: "ETHUSDT", name: "Ethereum" },
  { symbol: "SOLUSDT", name: "Solana" },
  { symbol: "ADAUSDT", name: "Cardano" },
]

const INTERVAL_MAP: Record<string, string> = {
  "1m": "1",
  "5m": "5",
  "15m": "15",
  "1h": "60",
  "4h": "240",
  "1d": "D",
}

export function EnhancedLiveTrading() {
  const {
    selectedSymbol,
    tickers,
    isTestnet,
    isConnected,
    balance,
    positions,
    error,
    setSelectedSymbol,
    updateTicker,
    updateOrderbook,
    placeOrder,
    refreshAccountData,
    setError,
  } = useTradingStore()

  const [orderType, setOrderType] = useState<"Market" | "Limit">("Limit")
  const [side, setSide] = useState<"Buy" | "Sell">("Buy")
  const [amount, setAmount] = useState("")
  const [price, setPrice] = useState("")
  const [leverage, setLeverage] = useState("1")
  const [positionType, setPositionType] = useState<"long" | "short">("long")
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [timeframe, setTimeframe] = useState<
    "1m" | "5m" | "15m" | "1h" | "4h" | "1d"
  >("1m")
  const [geminiAnswer, setGeminiAnswer] = useState<string | null>(null)
  const [isAsking, setIsAsking] = useState(false)

  // Subscribe to real-time data
  useEffect(() => {
    const symbols = SUPPORTED_SYMBOLS.map((s) => s.symbol)

    const unsubscribeTickers = bybitService.subscribeToTickers(symbols, (data) => {
      if (data.topic && data.data) {
        const symbol = data.data.symbol
        updateTicker(symbol, data.data)
      }
    })

    const unsubscribeOrderbook = bybitService.subscribeToOrderbook(selectedSymbol, (data) => {
      if (data.topic && data.data) {
        updateOrderbook(selectedSymbol, data.data)
      }
    })

    // Initial data refresh
    refreshAccountData()

    return () => {
      unsubscribeTickers?.()
      unsubscribeOrderbook?.()
    }
  }, [selectedSymbol, updateTicker, updateOrderbook, refreshAccountData])

  useEffect(() => {
    refreshAccountData()
    const id = setInterval(refreshAccountData, 5000)
    return () => clearInterval(id)
  }, [refreshAccountData])

  const currentTicker = tickers[selectedSymbol]
  const currentPrice = currentTicker?.lastPrice ? Number.parseFloat(currentTicker.lastPrice) : 0
  const priceChange = currentTicker?.price24hPcnt ? Number.parseFloat(currentTicker.price24hPcnt) : 0

  const availableBalance = useMemo(() => {
    if (!balance) return 0
    if (typeof balance.totalAvailableBalance === 'string') {
      return Number.parseFloat(balance.totalAvailableBalance)
    }
    const list = balance.list || balance.result?.list
    const item = Array.isArray(list) ? list[0] : null
    if (item && typeof item.totalAvailableBalance === 'string') {
      return Number.parseFloat(item.totalAvailableBalance)
    }
    const coins = item?.coin || balance.coin
    if (Array.isArray(coins)) {
      const usdt = coins.find((c: any) => c.coin === 'USDT')
      if (usdt?.availableToWithdraw) {
        return Number.parseFloat(usdt.availableToWithdraw)
      }
      if (usdt?.walletBalance) {
        return Number.parseFloat(usdt.walletBalance)
      }
    }
    return 0
  }, [balance])

  const positionQty = useMemo(() => {
    if (!positions) return 0
    return positions
      .filter((p: any) => p.symbol === selectedSymbol)
      .reduce((sum: number, p: any) => sum + Number.parseFloat(p.size || '0'), 0)
  }, [positions, selectedSymbol])

  // Pre-fill limit order price with current market price when available
  useEffect(() => {
    if (orderType === 'Limit' && currentPrice > 0 && price === '') {
      setPrice(currentPrice.toString())
    }
  }, [orderType, currentPrice, selectedSymbol, price])

  const handleAskGemini = async () => {
    setIsAsking(true)
    setGeminiAnswer(null)
    try {
      const list = await bybitService.getKlines({
        symbol: selectedSymbol,
        interval: INTERVAL_MAP[timeframe] || '1',
        limit: 20,
        category: 'linear',
      })
      const data = list.map((k: any) => ({
        time: Number(k[0]),
        open: Number(k[1]),
        high: Number(k[2]),
        low: Number(k[3]),
        close: Number(k[4]),
        volume: Number(k[5]),
      }))
      const payload = {
        symbol: selectedSymbol,
        timeframe,
        data,
        currentPrice: data[data.length - 1]?.close,
      }
      const text = await bybitService.getGeminiAnalysis(payload)
      setGeminiAnswer(text)
    } catch (err: any) {
      setGeminiAnswer('오류: ' + (err.message || 'failed'))
    } finally {
      setIsAsking(false)
    }
  }

  const handlePlaceOrder = async () => {
    if (!amount || (orderType === "Limit" && !price)) {
      setError("수량과 가격을 입력해주세요")
      return
    }

    setIsPlacingOrder(true)
    setError(null)

    try {
      const orderParams = {
        symbol: selectedSymbol,
        side,
        orderType,
        qty: amount,
        price: orderType === "Market" ? undefined : price,
        leverage: Number.parseInt(leverage),
        positionIdx: positionType === "long" ? 1 : 2,
      }

      await placeOrder(orderParams)

      // Reset form
      setAmount("")
      setPrice("")

      // Show success message
      setError(null)
    } catch (error) {
      console.error("Order placement failed:", error)
    } finally {
      setIsPlacingOrder(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Alert variant={isConnected ? "default" : "destructive"}>
        <div className="flex items-center gap-2">
          {isConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          <span>
            {isConnected ? "실시간 데이터 연결됨" : "연결 끊어짐"}({isTestnet ? "테스트 거래" : "실제 거래"})
          </span>
        </div>
      </Alert>

      {/* Symbol Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {SUPPORTED_SYMBOLS.map((coin) => {
          const ticker = tickers[coin.symbol]
          const price = ticker?.lastPrice ? Number.parseFloat(ticker.lastPrice) : 0
          const change = ticker?.price24hPcnt ? Number.parseFloat(ticker.price24hPcnt) : 0

          return (
            <Card
              key={coin.symbol}
              className={`cursor-pointer transition-all ${
                selectedSymbol === coin.symbol ? "ring-2 ring-purple-500" : ""
              }`}
              onClick={() => setSelectedSymbol(coin.symbol)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">{coin.name}</h3>
                    <p className="text-sm text-muted-foreground">{coin.symbol}</p>
                  </div>
                  <Badge variant={change > 0 ? "default" : "destructive"}>
                    {change > 0 ? "+" : ""}
                    {(change * 100).toFixed(2)}%
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  {change > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-lg font-bold">${price.toFixed(price > 1 ? 2 : 6)}</span>
                </div>
                {ticker?.volume24h && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Vol: ${(Number.parseFloat(ticker.volume24h) / 1000000).toFixed(1)}M
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Candlestick Chart */}
        <div className="xl:col-span-3">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>{selectedSymbol} Perpetual</span>
                </CardTitle>
                <div className="flex space-x-2">
                  {[
                    "1m",
                    "5m",
                    "15m",
                    "1h",
                    "4h",
                    "1d",
                  ].map((tf) => (
                    <Button
                      key={tf}
                      variant={timeframe === tf ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimeframe(tf as any)}
                    >
                      {tf}
                    </Button>
                  ))}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleAskGemini}
                    disabled={isAsking}
                  >
                    {isAsking ? "분석 중..." : "Gemini에 이 코인 물어보기"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <WebsocketCandlestickChart
                symbol={selectedSymbol}
                timeframe={timeframe}
              />
              {geminiAnswer && (
                <Alert className="mt-4">
                  <AlertDescription className="whitespace-pre-wrap">
                    {geminiAnswer}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Order Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">주문하기</CardTitle>
              <CardDescription>
                {SUPPORTED_SYMBOLS.find((s) => s.symbol === selectedSymbol)?.name}
                {currentPrice > 0 && ` - $${currentPrice.toFixed(currentPrice > 1 ? 2 : 6)}`}
                {positionQty > 0 && (
                  <> | 보유 수량: {positionQty.toFixed(4)}</>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Buy/Sell Tabs */}
              <Tabs value={side} onValueChange={(value) => setSide(value as "Buy" | "Sell")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="Buy" className="text-green-600">
                    매수
                  </TabsTrigger>
                  <TabsTrigger value="Sell" className="text-red-600">
                    매도
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Position Type */}
              <div className="space-y-2">
                <Label>포지션 타입</Label>
                <Select value={positionType} onValueChange={(value) => setPositionType(value as "long" | "short")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="long">롱 (Long)</SelectItem>
                    <SelectItem value="short">숏 (Short)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Leverage */}
              <div className="space-y-2">
                <Label>레버리지</Label>
                <Select value={leverage} onValueChange={setLeverage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1x</SelectItem>
                    <SelectItem value="2">2x</SelectItem>
                    <SelectItem value="5">5x</SelectItem>
                    <SelectItem value="10">10x</SelectItem>
                    <SelectItem value="20">20x</SelectItem>
                    <SelectItem value="50">50x</SelectItem>
                    <SelectItem value="100">100x</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Order Type */}
              <div className="space-y-2">
                <Label>주문 타입</Label>
                <Select value={orderType} onValueChange={(value) => setOrderType(value as "Market" | "Limit")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Market">시장가</SelectItem>
                    <SelectItem value="Limit">지정가</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Price (for limit orders) */}
              {orderType === "Limit" && (
                <div className="space-y-2">
                  <Label>가격 (USDT)</Label>
                  <Input
                    type="number"
                    placeholder="가격 입력"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
              )}

              {/* Quantity */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>수량</Label>
                  <span className="text-xs text-muted-foreground">
                    잔액: {availableBalance.toFixed(2)} USDT
                  </span>
                </div>
                <Input
                  type="number"
                  placeholder="수량 입력"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <div className="grid grid-cols-4 gap-1">
                  {[10, 25, 50, 100].map((p) => (
                    <Button
                      key={p}
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        if (currentPrice > 0) {
                          const qty =
                            ((availableBalance * (p / 100) * Number.parseFloat(leverage)) / currentPrice).toFixed(4)
                          setAmount(qty)
                        }
                      }}
                      className="text-xs"
                    >
                      {p}%
                    </Button>
                  ))}
                </div>
              </div>

              {/* Order Button */}
              <Button
                className={`w-full ${
                  side === "Buy" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                }`}
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder || !amount || (orderType === "Limit" && !price)}
              >
                {isPlacingOrder ? "주문 중..." : `${side === "Buy" ? "매수" : "매도"} 주문`}
              </Button>

              {/* Risk Warning */}
              {Number.parseInt(leverage) > 10 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>높은 레버리지는 큰 손실 위험이 있습니다.</AlertDescription>
                </Alert>
              )}

              {/* Error Display */}
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Real-time Order Book */}
          <RealTimeOrderBook symbol={selectedSymbol} />
        </div>
      </div>

      {/* Enhanced Position Manager */}
      <EnhancedPositionManager />
    </div>
  )
}
