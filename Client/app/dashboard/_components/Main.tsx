import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  LogOut,
  Bot,
  Wallet,
  Activity,
  Target,
} from "lucide-react";
import { ProfitChart } from "@/components/profit-chart";
import { TradingStrategies } from "@/components/trading-strategies";
import { RecentTrades } from "@/components/recent-trades";
import { ApiSettings } from "@/components/api-settings";
import { EnhancedLiveTrading } from "@/components/enhanced-live-trading";

export default function Main({
  totalBalance,
  totalProfit,
  profitPercentage,
  activeStrategies,
}: {
  totalBalance: number;
  totalProfit: number;
  profitPercentage: number;
  activeStrategies: number;
}) {
  return (
    <main className="p-6">
      {/* 상단 통계 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 자산</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalBalance.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              +2.1% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 수익</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +${totalProfit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              +{profitPercentage}% 수익률
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">활성 전략</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeStrategies}</div>
            <p className="text-xs text-muted-foreground">2개 전략 실행 중</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">오늘 거래</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">성공률 87.5%</p>
          </CardContent>
        </Card>
      </div>

      {/* 탭 콘텐츠 */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="strategies">전략</TabsTrigger>
          <TabsTrigger value="trades">거래내역</TabsTrigger>
          <TabsTrigger value="live-trading">실제거래</TabsTrigger>
          <TabsTrigger value="settings">설정</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProfitChart />
            <Card>
              <CardHeader>
                <CardTitle>포트폴리오 분석</CardTitle>
                <CardDescription>현재 보유 중인 코인별 비중</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>BTC</span>
                    <span>45%</span>
                  </div>
                  <Progress value={45} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>ETH</span>
                    <span>30%</span>
                  </div>
                  <Progress value={30} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>SOL</span>
                    <span>15%</span>
                  </div>
                  <Progress value={15} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>XRP</span>
                    <span>10%</span>
                  </div>
                  <Progress value={10} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="strategies">
          <TradingStrategies />
        </TabsContent>

        <TabsContent value="trades">
          <RecentTrades />
        </TabsContent>

        <TabsContent value="live-trading">
          <EnhancedLiveTrading />
        </TabsContent>

        <TabsContent value="settings">
          <ApiSettings />
        </TabsContent>
      </Tabs>
    </main>
  );
}
