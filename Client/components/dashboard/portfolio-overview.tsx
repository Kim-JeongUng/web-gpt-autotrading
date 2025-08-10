"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, DollarSign, Activity, Coins, Target } from "lucide-react"

export function PortfolioOverview() {
  const portfolioData = {
    totalBalance: 125430.5,
    totalPnL: 8234.2,
    totalPnLPercent: 7.02,
    activeStrategies: 3,
    winRate: 68.5,
    positions: [
      { symbol: "BTCUSDT", size: 0.5, pnl: 1234.5, pnlPercent: 5.2, side: "LONG" },
      { symbol: "ETHUSDT", size: 2.1, pnl: -234.2, pnlPercent: -1.8, side: "SHORT" },
      { symbol: "XRPUSDT", size: 500, pnl: 456.8, pnlPercent: 3.1, side: "LONG" },
    ],
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* 총 잔고 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">총 잔고</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${portfolioData.totalBalance.toLocaleString()}</div>
          <div className="flex items-center text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
            +2.1% from last month
          </div>
        </CardContent>
      </Card>

      {/* 총 수익/손실 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">총 P&L</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${portfolioData.totalPnL >= 0 ? "text-green-600" : "text-red-600"}`}>
            {portfolioData.totalPnL >= 0 ? "+" : ""}${portfolioData.totalPnL.toLocaleString()}
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            {portfolioData.totalPnLPercent >= 0 ? (
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
            )}
            {portfolioData.totalPnLPercent >= 0 ? "+" : ""}
            {portfolioData.totalPnLPercent}%
          </div>
        </CardContent>
      </Card>

      {/* 활성 전략 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">활성 전략</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{portfolioData.activeStrategies}</div>
          <div className="text-xs text-muted-foreground">AI 추천 전략 실행 중</div>
        </CardContent>
      </Card>

      {/* 승률 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">승률</CardTitle>
          <Coins className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{portfolioData.winRate}%</div>
          <Progress value={portfolioData.winRate} className="mt-2" />
        </CardContent>
      </Card>

      {/* 현재 포지션 */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>현재 포지션</CardTitle>
          <CardDescription>활성 거래 포지션 현황</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {portfolioData.positions.map((position, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div>
                    <div className="font-medium">{position.symbol}</div>
                    <div className="text-sm text-muted-foreground">
                      Size: {position.size} | {position.side}
                    </div>
                  </div>
                  <Badge variant={position.side === "LONG" ? "default" : "secondary"}>{position.side}</Badge>
                </div>
                <div className="text-right">
                  <div className={`font-medium ${position.pnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {position.pnl >= 0 ? "+" : ""}${position.pnl}
                  </div>
                  <div className={`text-sm ${position.pnlPercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {position.pnlPercent >= 0 ? "+" : ""}
                    {position.pnlPercent}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
