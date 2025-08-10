"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

const SERVER_URL = process.env.NEXT_PUBLIC_TRADING_SERVER || "http://localhost:4000"

interface Strategy {
  id: number
  coin: string
  "Limit the amount used($)": number
  "maxReverage(1x~100x)": number
  "Reliability(%)": number
  "max AI trading count": number
}

const COINS = [
  { symbol: "BTCUSDT", name: "Bitcoin" },
  { symbol: "ETHUSDT", name: "Ethereum" },
  { symbol: "SOLUSDT", name: "Solana" },
  { symbol: "XRPUSDT", name: "Ripple" },
]

export function TradingStrategies() {
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [open, setOpen] = useState(false)
  const [coin, setCoin] = useState("BTCUSDT")
  const [limit, setLimit] = useState("")
  const [leverage, setLeverage] = useState("")
  const [reliability, setReliability] = useState("")
  const [maxAi, setMaxAi] = useState("")

  const user = "user111"

  const loadStrategies = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/strategies?user=${user}`)
      if (res.ok) {
        const data = await res.json()
        setStrategies(data)
      }
    } catch (err) {
      console.error("Failed to load strategies", err)
    }
  }

  useEffect(() => {
    loadStrategies()
  }, [])

  const handleSubmit = async () => {
    try {
      await fetch(`${SERVER_URL}/api/strategies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googleOauth: user,
          coin,
          limitAmount: Number(limit),
          maxReverage: Number(leverage),
          reliability: Number(reliability),
          maxAiTradingCount: Number(maxAi),
        }),
      })
      setCoin("BTCUSDT")
      setLimit("")
      setLeverage("")
      setReliability("")
      setMaxAi("")
      setOpen(false)
      loadStrategies()
    } catch (err) {
      console.error("Failed to save strategy", err)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">거래 전략</h2>
          <p className="text-muted-foreground">AI가 추천하는 거래 전략을 관리하세요</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>새 전략 추가</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>전략 추가</DialogTitle>
              <DialogDescription>새로운 거래 전략을 설정하세요</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>코인</Label>
                <Select value={coin} onValueChange={setCoin}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COINS.map((c) => (
                      <SelectItem key={c.symbol} value={c.symbol}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Limit the amount used ($)</Label>
                  <Input value={limit} onChange={(e) => setLimit(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>maxReverage (1x~100x)</Label>
                  <Input value={leverage} onChange={(e) => setLeverage(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Reliability (%)</Label>
                  <Input value={reliability} onChange={(e) => setReliability(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>max AI trading count</Label>
                  <Input value={maxAi} onChange={(e) => setMaxAi(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleSubmit}>저장</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {strategies.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle>{s.coin}</CardTitle>
              <CardDescription>
                Limit ${s["Limit the amount used($)"]} / Leverage {s["maxReverage(1x~100x)"]}x
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Reliability</p>
                <p className="font-medium">{s["Reliability(%)"]}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Max AI trading count</p>
                <p className="font-medium">{s["max AI trading count"]}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

