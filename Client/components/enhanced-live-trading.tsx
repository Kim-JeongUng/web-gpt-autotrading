"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useTradingStore } from "@/lib/trading-store"
import { bybitService } from "@/lib/bybit-client"
import { EnhancedTradingChart } from "@/components/enhanced-trading-chart"
import { RealTimeOrderBook } from "@/components/real-time-order-book"
import { EnhancedPositionManager } from "@/components/enhanced-position-manager"
import { TrendingUp, TrendingDown, AlertTriangle, Wifi, WifiOff } from "lucide-react"

const SUPPORTED_SYMBOLS = [
  { symbol: "BTCUSDT", name: "Bitcoin" },
  { symbol: "ETHUSDT", name: "Ethereum" },
  { symbol: "SOLUSDT", name: "Solana" },
  { symbol: "ADAUSDT", name: "Cardano" },
]

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
  const [position, setPosition] = useState<"long" | "short" | "auto">("long")
  const [amount, setAmount] = useState("")
  const [price, setPrice] = useState("")
  const [leverage, setLeverage] = useState("1")
  const [triggerPrice, setTriggerPrice] = useState("")
  const [triggerBy, setTriggerBy] = useState<"LastPrice" | "MarkPrice" | "IndexPrice">("LastPrice")
  const [timeInForce, setTimeInForce] = useState<"GTC" | "IOC" | "FOK" | "PostOnly">("GTC")
  const [enableTpSl, setEnableTpSl] = useState(false)
  const [takeProfit, setTakeProfit] = useState("")
  const [stopLoss, setStopLoss] = useState("")
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)

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

  const handlePlaceOrder = async () => {
    if (!amount || (orderType === "Limit" && !price)) {
      setError("수량과 가격을 입력해주세요")
      return
    }

    setIsPlacingOrder(true)
    setError(null)

    try {
      const computedSide = position === 'short' ? 'Sell' : 'Buy'
      const positionIdx = position === 'auto' ? 0 : position === 'long' ? 1 : 2

      const orderParams: any = {
        symbol: selectedSymbol,
        side: computedSide,
        orderType,
        qty: amount,
        positionIdx,
        leverage: Number.parseInt(leverage),
        timeInForce,
      }

      if (orderType === 'Limit') {
        orderParams.price = price
      }
      if (triggerPrice) {
        orderParams.triggerPrice = triggerPrice
        orderParams.triggerBy = triggerBy
      }
      if (enableTpSl) {
        if (takeProfit) orderParams.takeProfit = takeProfit
        if (stopLoss) orderParams.stopLoss = stopLoss
      }

      await placeOrder(orderParams)

      // Reset form
      setAmount("")
      setPrice("")
      setTriggerPrice("")
      setTakeProfit("")
      setStopLoss("")
      setEnableTpSl(false)

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
        {/* Enhanced Chart */}
        <div className="xl:col-span-3">
          <EnhancedTradingChart symbol={selectedSymbol} />
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
              {/* Position Selection */}
              <div className="space-y-2">
                <Label>포지션 선택</Label>
                <Select value={position} onValueChange={(v) => setPosition(v as "long" | "short" | "auto")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="long">롱 포지션</SelectItem>
                    <SelectItem value="short">숏 포지션</SelectItem>
                    <SelectItem value="auto">자동 포지션</SelectItem>
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

              {/* Trigger Price */}
              <div className="space-y-2">
                <Label>트리거 가격</Label>
                <Input
                  type="number"
                  placeholder="트리거 가격"
                  value={triggerPrice}
                  onChange={(e) => setTriggerPrice(e.target.value)}
                />
                <Select value={triggerBy} onValueChange={(v) => setTriggerBy(v as "LastPrice" | "MarkPrice" | "IndexPrice")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LastPrice">마지막 체결가</SelectItem>
                    <SelectItem value="MarkPrice">마크 가격</SelectItem>
                    <SelectItem value="IndexPrice">지수 가격</SelectItem>
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

              {/* Take Profit / Stop Loss */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>TP/SL 설정</Label>
                  <input
                    type="checkbox"
                    checked={enableTpSl}
                    onChange={(e) => setEnableTpSl(e.target.checked)}
                  />
                </div>
                {enableTpSl && (
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Take Profit"
                      value={takeProfit}
                      onChange={(e) => setTakeProfit(e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Stop Loss"
                      value={stopLoss}
                      onChange={(e) => setStopLoss(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Time In Force */}
              <div className="space-y-2">
                <Label>주문 조건</Label>
                <Select value={timeInForce} onValueChange={(v) => setTimeInForce(v as "GTC" | "IOC" | "FOK" | "PostOnly")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GTC">Good-Till-Canceled</SelectItem>
                    <SelectItem value="IOC">Immediate-Or-Cancel</SelectItem>
                    <SelectItem value="FOK">Fill-Or-Kill</SelectItem>
                    <SelectItem value="PostOnly">Post-Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Order Button */}
              <Button
                className="w-full bg-purple-600 hover:bg-purple-700"
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder || !amount || (orderType === 'Limit' && !price)}
              >
                {isPlacingOrder ? '주문 중...' : '주문 실행'}
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
