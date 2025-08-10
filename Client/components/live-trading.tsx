"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { TradingChart } from "@/components/trading-chart"
import { PositionManager } from "@/components/position-manager"
import { OrderBook } from "@/components/order-book"
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react"

interface CoinData {
  symbol: string
  name: string
  price: number
  change24h: number
  volume: number
}

const initialCoins: CoinData[] = [
  { symbol: "BTCUSDT", name: "Bitcoin", price: 43250.5, change24h: 2.34, volume: 1234567890 },
  { symbol: "ETHUSDT", name: "Ethereum", price: 2580.75, change24h: -1.23, volume: 987654321 },
  { symbol: "SOLUSDT", name: "Solana", price: 98.45, change24h: 5.67, volume: 456789123 },
  { symbol: "XRPUSDT", name: "Ripple", price: 0.527, change24h: -0.89, volume: 234567890 },
]

export function LiveTrading() {
  const [selectedCoin, setSelectedCoin] = useState("BTCUSDT")
  const [coins, setCoins] = useState<CoinData[]>(initialCoins)
  const [orderType, setOrderType] = useState<"market" | "limit">("limit")
  const [side, setSide] = useState<"buy" | "sell">("buy")
  const [amount, setAmount] = useState("")
  const [price, setPrice] = useState("")
  const [leverage, setLeverage] = useState("1")
  const [positionType, setPositionType] = useState<"long" | "short">("long")

  // 실시간 가격 업데이트 시뮬레이션
  useEffect(() => {
    const interval = setInterval(() => {
      setCoins((prevCoins) =>
        prevCoins.map((coin) => ({
          ...coin,
          price: coin.price * (1 + (Math.random() - 0.5) * 0.002), // ±0.1% 변동
          change24h: coin.change24h + (Math.random() - 0.5) * 0.1,
        })),
      )
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const currentCoin = coins.find((coin) => coin.symbol === selectedCoin)

  const handlePlaceOrder = () => {
    // 주문 실행 로직
    console.log("주문 실행:", {
      symbol: selectedCoin,
      side,
      orderType,
      amount,
      price: orderType === "market" ? currentCoin?.price : price,
      leverage,
      positionType,
    })
  }

  return (
    <div className="space-y-6">
      {/* 상단 코인 선택 및 가격 정보 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {coins.map((coin) => (
          <Card
            key={coin.symbol}
            className={`cursor-pointer transition-all ${selectedCoin === coin.symbol ? "ring-2 ring-purple-500" : ""}`}
            onClick={() => setSelectedCoin(coin.symbol)}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold">{coin.name}</h3>
                  <p className="text-sm text-muted-foreground">{coin.symbol}</p>
                </div>
                <Badge variant={coin.change24h > 0 ? "default" : "destructive"}>
                  {coin.change24h > 0 ? "+" : ""}
                  {coin.change24h.toFixed(2)}%
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                {coin.change24h > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <span className="text-lg font-bold">${coin.price.toFixed(coin.price > 1 ? 2 : 6)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Vol: ${(coin.volume / 1000000).toFixed(1)}M</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* 차트 영역 */}
        <div className="xl:col-span-3">
          <TradingChart symbol={selectedCoin} />
        </div>

        {/* 주문 패널 */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">주문하기</CardTitle>
              <CardDescription>
                {currentCoin?.name} 현재가: ${currentCoin?.price.toFixed(currentCoin.price > 1 ? 2 : 6)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 매수/매도 선택 */}
              <Tabs value={side} onValueChange={(value) => setSide(value as "buy" | "sell")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="buy" className="text-green-600">
                    매수
                  </TabsTrigger>
                  <TabsTrigger value="sell" className="text-red-600">
                    매도
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* 포지션 타입 */}
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

              {/* 레버리지 */}
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

              {/* 주문 타입 */}
              <div className="space-y-2">
                <Label>주문 타입</Label>
                <Select value={orderType} onValueChange={(value) => setOrderType(value as "market" | "limit")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="market">시장가</SelectItem>
                    <SelectItem value="limit">지정가</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 가격 (지정가일 때만) */}
              {orderType === "limit" && (
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

              {/* 수량 */}
              <div className="space-y-2">
                <Label>수량</Label>
                <Input
                  type="number"
                  placeholder="수량 입력"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              {/* 주문 실행 버튼 */}
              <Button
                className={`w-full ${side === "buy" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
                onClick={handlePlaceOrder}
                disabled={!amount || (orderType === "limit" && !price)}
              >
                {side === "buy" ? "매수" : "매도"} 주문
              </Button>

              {/* 위험 경고 */}
              {Number.parseInt(leverage) > 10 && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm text-yellow-800">높은 레버리지는 큰 손실 위험이 있습니다.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 호가창 */}
          <OrderBook symbol={selectedCoin} />
        </div>
      </div>

      {/* 포지션 관리 */}
      <PositionManager />
    </div>
  )
}
