"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Bot, Settings, Play, Pause } from "lucide-react"

export function TradingStrategies() {
  const strategies = [
    {
      id: 1,
      name: "Gemini Momentum Strategy",
      description: "AI가 분석한 모멘텀 기반 매매 전략",
      status: "active",
      accuracy: 72.5,
      profit: 1234.5,
      profitPercent: 8.2,
      trades: 45,
      winRate: 68.9,
      coins: ["BTC", "ETH", "XRP"],
      leverage: "3x",
      riskLevel: "Medium",
    },
    {
      id: 2,
      name: "Mean Reversion Bot",
      description: "평균 회귀 패턴을 활용한 자동매매",
      status: "active",
      accuracy: 65.8,
      profit: 567.3,
      profitPercent: 4.1,
      trades: 32,
      winRate: 62.5,
      coins: ["ETH", "XRP"],
      leverage: "2x",
      riskLevel: "Low",
    },
    {
      id: 3,
      name: "Breakout Hunter",
      description: "돌파 패턴 감지 및 자동 진입",
      status: "paused",
      accuracy: 58.2,
      profit: -123.4,
      profitPercent: -1.2,
      trades: 28,
      winRate: 57.1,
      coins: ["BTC", "SOL"],
      leverage: "5x",
      riskLevel: "High",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI 거래 전략</h2>
          <p className="text-muted-foreground">Gemini 추천 전략으로 자동매매를 실행하세요</p>
        </div>
        <Button>
          <Bot className="mr-2 h-4 w-4" />새 전략 생성
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {strategies.map((strategy) => (
          <Card key={strategy.id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{strategy.name}</CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant={strategy.status === "active" ? "default" : "secondary"}>
                    {strategy.status === "active" ? "실행중" : "일시정지"}
                  </Badge>
                  <Switch checked={strategy.status === "active"} onCheckedChange={() => {}} />
                </div>
              </div>
              <CardDescription>{strategy.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 수익률 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">수익률</span>
                <div className="text-right">
                  <div className={`font-medium ${strategy.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {strategy.profit >= 0 ? "+" : ""}${strategy.profit}
                  </div>
                  <div className={`text-xs ${strategy.profitPercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {strategy.profitPercent >= 0 ? "+" : ""}
                    {strategy.profitPercent}%
                  </div>
                </div>
              </div>

              {/* 정확도 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">AI 정확도</span>
                  <span className="text-sm font-medium">{strategy.accuracy}%</span>
                </div>
                <Progress value={strategy.accuracy} />
              </div>

              {/* 승률 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">승률</span>
                  <span className="text-sm font-medium">{strategy.winRate}%</span>
                </div>
                <Progress value={strategy.winRate} />
              </div>

              {/* 거래 정보 */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">총 거래</span>
                  <div className="font-medium">{strategy.trades}회</div>
                </div>
                <div>
                  <span className="text-muted-foreground">레버리지</span>
                  <div className="font-medium">{strategy.leverage}</div>
                </div>
              </div>

              {/* 대상 코인 */}
              <div>
                <span className="text-sm text-muted-foreground">대상 코인</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {strategy.coins.map((coin) => (
                    <Badge key={coin} variant="outline" className="text-xs">
                      {coin}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 리스크 레벨 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">리스크</span>
                <Badge
                  variant={
                    strategy.riskLevel === "Low"
                      ? "default"
                      : strategy.riskLevel === "Medium"
                        ? "secondary"
                        : "destructive"
                  }
                >
                  {strategy.riskLevel}
                </Badge>
              </div>

              {/* 액션 버튼 */}
              <div className="flex space-x-2 pt-4">
                <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                  <Settings className="mr-2 h-3 w-3" />
                  설정
                </Button>
                <Button variant={strategy.status === "active" ? "secondary" : "default"} size="sm" className="flex-1">
                  {strategy.status === "active" ? (
                    <>
                      <Pause className="mr-2 h-3 w-3" />
                      일시정지
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-3 w-3" />
                      시작
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
