"use client";

import { useEffect, useMemo, useState } from "react";
import { useTradingStore } from "@/lib/trading-store";

import Header from "./Header";
import Main from "./Main";

export function Dashboard() {
  const { balance, positions, refreshAccountData } = useTradingStore();

  useEffect(() => {
    refreshAccountData();
    const id = setInterval(refreshAccountData, 5000);
    return () => clearInterval(id);
  }, [refreshAccountData]);

  const totalBalance = useMemo(() => {
    if (!balance) return 0;
    if (typeof balance.totalAvailableBalance === 'string') {
      return Number.parseFloat(balance.totalAvailableBalance);
    }
    const list = balance.list || balance.result?.list;
    const item = Array.isArray(list) ? list[0] : null;
    if (item && typeof item.totalAvailableBalance === 'string') {
      return Number.parseFloat(item.totalAvailableBalance);
    }
    const coins = item?.coin || balance.coin;
    if (Array.isArray(coins)) {
      const usdt = coins.find((c: any) => c.coin === 'USDT');
      if (usdt?.walletBalance) {
        return Number.parseFloat(usdt.walletBalance);
      }
    }
    return 0;
  }, [balance]);

  const totalProfit = useMemo(() => {
    return positions.reduce(
      (sum: number, p: any) => sum + Number.parseFloat(p.unrealisedPnl || '0'),
      0,
    );
  }, [positions]);

  const profitPercentage = useMemo(() => {
    return totalBalance ? (totalProfit / totalBalance) * 100 : 0;
  }, [totalProfit, totalBalance]);

  const activeStrategies = positions.length;

  const [user, setUser] = useState<{ name: string; email: string } | null>(
    null
  );
  const onLogout = () => setUser(null);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header user={user} onLogout={onLogout} />
      <Main
        totalBalance={totalBalance}
        totalProfit={totalProfit}
        profitPercentage={profitPercentage}
        activeStrategies={activeStrategies}
      />
    </div>
  );
}
