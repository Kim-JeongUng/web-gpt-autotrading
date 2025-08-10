"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TrendingUp, TrendingDown, ExternalLink } from "lucide-react"

export function RecentTrades() {
  const trades = [
    {
      id: "1",
      timestamp: "2024-01-23 14:30:25",
      symbol: "BTCUSDT",
      side: "BUY",
      type: "MARKET",
      quantity: 0.5,
      price: 42350.5,
      pnl: 234.5,
      pnlPercent: 1.1,
      strategy: "Gemini Momentum",
      status: "FILLED",
    },
    {
      id: "2",
      timestamp: "2024-01-23 13:45:12",
      symbol: "ETHUSDT",
      side: "SELL",
      type: "LIMIT",
      quantity: 2.1,
      price: 2580.3,
      pnl: -45.2,
      pnlPercent: -0.8,
      strategy: "Mean Reversion",
      status: "FILLED",
    },
    {
      id: "3",
      timestamp: "2024-01-23 12:15:08",
      symbol: "XRPUSDT",
      side: "BUY",
      type: "MARKET",
      quantity: 500,
      price: 0.527,
      pnl: 15.6,
      pnlPercent: 3.2,
      strategy: "Breakout Hunter",
      status: "FILLED",
    },
    {
      id: "4",
      timestamp: "2024-01-23 11:20:45",
      symbol: "SOLUSDT",
      side: "SELL",
      type: "STOP_MARKET",
      quantity: 5.0,
      price: 98.75,
      pnl: -78.3,
      pnlPercent: -1.5,
      strategy: "Gemini Momentum",
      status: "FILLED",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">거래 내역</h2>
          <p className="text-muted-foreground">최근 AI 자동매매 거래 현황</p>
        </div>
        <Button variant="outline">
          <ExternalLink className="mr-2 h-4 w-4" />
          전체 내역 보기
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>최근 거래</CardTitle>
          <CardDescription>지난 24시간 동안의 거래 내역</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>시간</TableHead>
                <TableHead>심볼</TableHead>
                <TableHead>타입</TableHead>
                <TableHead>수량</TableHead>
                <TableHead>가격</TableHead>
                <TableHead>P&L</TableHead>
                <TableHead>전략</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell className="text-sm text-muted-foreground">{trade.timestamp}</TableCell>
                  <TableCell className="font-medium">{trade.symbol}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Badge variant={trade.side === "BUY" ? "default" : "secondary"} className="text-xs">
                        {trade.side}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{trade.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>{trade.quantity}</TableCell>
                  <TableCell>${trade.price.toLocaleString()}</TableCell>
                  <TableCell>
                    {trade.pnl !== 0 ? (
                      <div className="flex items-center space-x-1">
                        {trade.pnl > 0 ? (
                          <TrendingUp className="h-3 w-3 text-green-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        )}
                        <span className={trade.pnl >= 0 ? "text-green-600" : "text-red-600"}>
                          {trade.pnl >= 0 ? "+" : ""}${trade.pnl}
                        </span>
                        <span className={`text-xs ${trade.pnlPercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                          ({trade.pnlPercent >= 0 ? "+" : ""}
                          {trade.pnlPercent}%)
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {trade.strategy}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        trade.status === "FILLED" ? "default" : trade.status === "PENDING" ? "secondary" : "destructive"
                      }
                      className="text-xs"
                    >
                      {trade.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
