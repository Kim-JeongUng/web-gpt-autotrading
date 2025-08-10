"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TrendingUp, TrendingDown } from "lucide-react"

const trades = [
  {
    id: 1,
    symbol: "BTC/USDT",
    type: "BUY",
    amount: 0.5,
    price: 43250.0,
    profit: 234.5,
    time: "2024-01-15 14:30:25",
  },
  {
    id: 2,
    symbol: "ETH/USDT",
    type: "SELL",
    amount: 2.3,
    price: 2580.0,
    profit: -45.2,
    time: "2024-01-15 13:45:12",
  },
  {
    id: 3,
    symbol: "SOL/USDT",
    type: "BUY",
    amount: 10.0,
    price: 98.5,
    profit: 156.8,
    time: "2024-01-15 12:20:08",
  },
  {
    id: 4,
    symbol: "BTC/USDT",
    type: "SELL",
    amount: 0.3,
    price: 43180.0,
    profit: 89.4,
    time: "2024-01-15 11:15:33",
  },
  {
    id: 5,
    symbol: "ETH/USDT",
    type: "BUY",
    amount: 1.8,
    price: 2595.0,
    profit: 67.3,
    time: "2024-01-15 10:30:45",
  },
]

export function RecentTrades() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>최근 거래 내역</CardTitle>
        <CardDescription>AI 전략에 따른 최근 거래 결과를 확인하세요</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>심볼</TableHead>
              <TableHead>타입</TableHead>
              <TableHead>수량</TableHead>
              <TableHead>가격</TableHead>
              <TableHead>수익</TableHead>
              <TableHead>시간</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((trade) => (
              <TableRow key={trade.id}>
                <TableCell className="font-medium">{trade.symbol}</TableCell>
                <TableCell>
                  <Badge variant={trade.type === "BUY" ? "default" : "secondary"}>{trade.type}</Badge>
                </TableCell>
                <TableCell>{trade.amount}</TableCell>
                <TableCell>${trade.price.toLocaleString()}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {trade.profit > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span className={trade.profit > 0 ? "text-green-600" : "text-red-600"}>
                      ${Math.abs(trade.profit).toFixed(2)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{trade.time}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
