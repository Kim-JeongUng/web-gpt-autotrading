"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, BarChart3, PieChart } from "lucide-react"

export function PerformanceChart() {
  const performanceData = {
    daily: [
      { date: "01/19", portfolio: 120000, benchmark: 119500 },
      { date: "01/20", portfolio: 122500, benchmark: 120800 },
      { date: "01/21", portfolio: 121800, benchmark: 121200 },
      { date: "01/22", portfolio: 124200, benchmark: 122100 },
      { date: "01/23", portfolio: 125430, benchmark: 123500 },
    ],
    allocation: [
      { asset: "BTC", percentage: 45, value: 56443.5 },
      { asset: "ETH", percentage: 30, value: 37629.15 },
      { asset: "SOL", percentage: 15, value: 18814.58 },
      { asset: "XRP", percentage: 10, value: 12543.27 },
    ],
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">수익률 분석</h2>
        <p className="text-muted-foreground">포트폴리오 성과를 분석하세요</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">전체 현황</TabsTrigger>
          <TabsTrigger value="allocation">자산 배분</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 포트폴리오 성과 차트 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  포트폴리오 성과
                </CardTitle>
                <CardDescription>AI 전략 vs 벤치마크 비교</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">성과 차트 영역</p>
                    <p className="text-xs text-gray-400">실제 구현시 Chart.js 또는 Recharts 사용</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">+7.02%</div>
                    <div className="text-sm text-muted-foreground">AI 포트폴리오</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">+4.85%</div>
                    <div className="text-sm text-muted-foreground">벤치마크</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 주요 지표 */}
            <Card>
              <CardHeader>
                <CardTitle>주요 성과 지표</CardTitle>
                <CardDescription>포트폴리오 리스크 및 수익률 지표</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">총 수익률</div>
                    <div className="text-2xl font-bold text-green-600">+7.02%</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">샤프 비율</div>
                    <div className="text-2xl font-bold">1.34</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">최대 낙폭</div>
                    <div className="text-2xl font-bold text-red-600">-3.8%</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">변동성</div>
                    <div className="text-2xl font-bold">12.5%</div>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">월간 수익률</span>
                    <Badge variant="default">
                      <TrendingUp className="mr-1 h-3 w-3" />
                      +2.1%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">주간 수익률</span>
                    <Badge variant="default">
                      <TrendingUp className="mr-1 h-3 w-3" />
                      +0.8%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="allocation" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 자산 배분 차트 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="mr-2 h-5 w-5" />
                  자산 배분
                </CardTitle>
                <CardDescription>현재 포트폴리오 구성</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                  <div className="text-center">
                    <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">파이 차트 영역</p>
                    <p className="text-xs text-gray-400">실제 구현시 Chart.js 또는 Recharts 사용</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 자산별 상세 */}
            <Card>
              <CardHeader>
                <CardTitle>자산별 상세</CardTitle>
                <CardDescription>각 자산의 비중과 가치</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceData.allocation.map((asset, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full bg-blue-${(index + 1) * 200}`}></div>
                        <div>
                          <div className="font-medium">{asset.asset}</div>
                          <div className="text-sm text-muted-foreground">{asset.percentage}%</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${asset.value.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
