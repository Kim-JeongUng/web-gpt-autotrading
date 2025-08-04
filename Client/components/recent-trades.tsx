"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useTradingStore } from "@/lib/trading-store"
import { bybitService } from "@/lib/bybit-client"

interface Execution {
  execId: string
  symbol: string
  side: string
  execQty: string
  execPrice: string
  execTime: string
}

export function RecentTrades() {
  const { selectedSymbol } = useTradingStore()
  const [trades, setTrades] = useState<Execution[]>([])

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const list = await bybitService.getExecutions({ symbol: selectedSymbol, limit: 20 })
        setTrades(list as Execution[])
      } catch (err) {
        console.error('Error fetching executions:', err)
      }
    }
    fetchTrades()
    const id = setInterval(fetchTrades, 5000)
    return () => clearInterval(id)
  }, [selectedSymbol])

  return (
    <Card>
      <CardHeader>
        <CardTitle>최근 거래 내역</CardTitle>
        <CardDescription>Bybit에서 체결된 최신 주문</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>시간</TableHead>
              <TableHead>심볼</TableHead>
              <TableHead>방향</TableHead>
              <TableHead>수량</TableHead>
              <TableHead>가격</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((trade) => (
              <TableRow key={trade.execId}>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(Number(trade.execTime)).toLocaleString()}
                </TableCell>
                <TableCell className="font-medium">{trade.symbol}</TableCell>
                <TableCell>
                  <Badge variant={trade.side === 'Buy' ? 'default' : 'secondary'}>
                    {trade.side}
                  </Badge>
                </TableCell>
                <TableCell>{Number.parseFloat(trade.execQty).toFixed(4)}</TableCell>
                <TableCell>${Number.parseFloat(trade.execPrice).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

