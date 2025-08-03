"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, DollarSign, Activity, Coins, Target } from "lucide-react"
import { useTradingStore } from "@/lib/trading-store"
import { useMemo } from "react"

export function PortfolioOverview() {
  const { balance, positions } = useTradingStore()

  const totalBalance = useMemo(() => {
    if (!balance) return 0
    const list = balance.list || balance.result?.list
    const item = Array.isArray(list) ? list[0] : balance
    return Number.parseFloat(item?.totalEquity || item?.walletBalance || '0')
  }, [balance])

  const totalPnL = useMemo(() => {
    return positions.reduce((sum, pos) => sum + Number.parseFloat(pos.unrealisedPnl || '0'), 0)
  }, [positions])

  const totalPnLPercent = useMemo(() => {
    const base = totalBalance - totalPnL
    if (base === 0) return 0
    return (totalPnL / base) * 100
  }, [totalBalance, totalPnL])

  const activeStrategies = positions.length
  const winRate = useMemo(() => {
    if (positions.length === 0) return 0
    const wins = positions.filter((p) => Number.parseFloat(p.unrealisedPnl || '0') >= 0).length
    return (wins / positions.length) * 100
  }, [positions])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* 총 잔고 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">총 잔고</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${totalBalance.toLocaleString()}</div>
        </CardContent>
      </Card>

      {/* 총 수익/손실 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">총 P&L</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString()}
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            {totalPnLPercent >= 0 ? (
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
            )}
            {totalPnLPercent >= 0 ? '+' : ''}
            {totalPnLPercent.toFixed(2)}%
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
          <div className="text-2xl font-bold">{activeStrategies}</div>
          <div className="text-xs text-muted-foreground">현재 보유 중인 포지션 수</div>
        </CardContent>
      </Card>

      {/* 승률 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">승률</CardTitle>
          <Coins className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{winRate.toFixed(2)}%</div>
          <Progress value={winRate} className="mt-2" />
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
            {positions.map((position, index) => {
              const size = Number.parseFloat(position.size || '0')
              const pnl = Number.parseFloat(position.unrealisedPnl || '0')
              const value = Number.parseFloat(position.positionValue || '0')
              const pnlPercent = value !== 0 ? (pnl / value) * 100 : 0
              return (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div>
                      <div className="font-medium">{position.symbol}</div>
                      <div className="text-sm text-muted-foreground">
                        Size: {size} | {position.side}
                      </div>
                    </div>
                    <Badge variant={position.side === 'Buy' || position.side === 'LONG' ? 'default' : 'secondary'}>
                      {position.side?.toString().toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                    </div>
                    <div className={`text-sm ${pnlPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {pnlPercent >= 0 ? '+' : ''}
                      {pnlPercent.toFixed(2)}%
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
