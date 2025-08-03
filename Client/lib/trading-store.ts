"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { bybitService } from "./bybit-client";

interface TradingState {
  // API Configuration
  apiKey: string;
  apiSecret: string;
  isTestnet: boolean;
  testApiKey: string;
  testApiSecret: string;
  liveApiKey: string;
  liveApiSecret: string;

  // Market Data
  tickers: Record<string, any>;
  orderbooks: Record<string, any>;

  // Account Data
  balance: any;
  positions: any[];
  orders: any[];

  // UI State
  selectedSymbol: string;
  isConnected: boolean;
  error: string | null;

  isCheckingCredentials: boolean;

  // Actions
  setApiCredentials: (apiKey: string, apiSecret: string) => Promise<void>;
  toggleTradingMode: () => void;
  setSelectedSymbol: (symbol: string) => void;
  updateTicker: (symbol: string, data: any) => void;
  updateOrderbook: (symbol: string, data: any) => void;
  refreshAccountData: () => Promise<void>;
  placeOrder: (orderParams: any) => Promise<any>;
  closePosition: (params: any) => Promise<any>;
  updatePosition: (params: any) => Promise<any>;
  setError: (error: string | null) => void;
}

export const useTradingStore = create<TradingState>()(
  persist(
    (set, get) => ({
  // Initial state
  apiKey: "",
  apiSecret: "",
  isTestnet: false,
  testApiKey: "",
  testApiSecret: "",
  liveApiKey: "",
  liveApiSecret: "",
  tickers: {},
  orderbooks: {},
  balance: null,
  positions: [],
  orders: [],
  selectedSymbol: "BTCUSDT",
  isConnected: false,
  isCheckingCredentials: false,
  error: null,

  // Actions
  setApiCredentials: async (apiKey: string, apiSecret: string) => {
    const isTestnet = get().isTestnet;
    set({
      apiKey,
      apiSecret,
      isCheckingCredentials: true,
      ...(isTestnet
        ? { testApiKey: apiKey, testApiSecret: apiSecret }
        : { liveApiKey: apiKey, liveApiSecret: apiSecret }),
    });
    await bybitService.setCredentials(apiKey, apiSecret, isTestnet);

    try {
      await bybitService.validateCredentials(apiKey, apiSecret, isTestnet);
      set({ isConnected: true, isCheckingCredentials: false, error: null });
    } catch (err) {
      set({
        isConnected: false,
        isCheckingCredentials: false,
        error: err instanceof Error ? err.message : "Invalid credentials",
      });
    }
  },

  toggleTradingMode: () => {
    const useTestnet = !get().isTestnet;
    const apiKey = useTestnet ? get().testApiKey : get().liveApiKey;
    const apiSecret = useTestnet ? get().testApiSecret : get().liveApiSecret;
    set({
      isTestnet: useTestnet,
      apiKey,
      apiSecret,
    });
    if (apiKey && apiSecret) {
      get().setApiCredentials(apiKey, apiSecret);
    } else {
      bybitService.setCredentials(apiKey, apiSecret, useTestnet);
      set({ isConnected: false });
    }
  },

  setSelectedSymbol: (symbol: string) => {
    set({ selectedSymbol: symbol });
  },

  updateTicker: (symbol: string, data: any) => {
    set((state) => {
      // Ignore updates that contain an empty price which can occur when
      // the websocket momentarily fails to provide data. Keeping the
      // previous ticker prevents the UI from showing zero values.
      const lastPrice = Number(data?.lastPrice);
      if (!data || !data.lastPrice || lastPrice === 0) {
        return { tickers: { ...state.tickers } };
      }

      return {
        tickers: { ...state.tickers, [symbol]: data },
      };
    });
  },

  updateOrderbook: (symbol: string, data: any) => {
    set((state) => ({
      orderbooks: { ...state.orderbooks, [symbol]: data },
    }));
  },

  refreshAccountData: async () => {
    try {
      const { balance, positions, orders } = await bybitService.getAccountOverview();
      set({ balance, positions, orders, error: null });
      console.log('Loaded', orders.length, 'active orders');
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  placeOrder: async (orderParams: any) => {
    try {
      const result = await bybitService.placeOrder(orderParams);
      get().refreshAccountData(); // Refresh after order
      return result;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Order failed" });
      throw error;
    }
  },

  closePosition: async (params: any) => {
    try {
      const result = await bybitService.closePosition(params);
      get().refreshAccountData();
      return result;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Close failed' });
      throw error;
    }
  },

  updatePosition: async (params: any) => {
    try {
      const result = await bybitService.setTradingStop(params);
      get().refreshAccountData();
      return result;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Update failed' });
      throw error;
    }
  },

  setError: (error: string | null) => {
    set({ error });
  },
    }),
    {
      name: "trading-store",
      partialize: (state) => ({
        apiKey: state.apiKey,
        apiSecret: state.apiSecret,
        isTestnet: state.isTestnet,
        testApiKey: state.testApiKey,
        testApiSecret: state.testApiSecret,
        liveApiKey: state.liveApiKey,
        liveApiSecret: state.liveApiSecret,
        selectedSymbol: state.selectedSymbol,
      }),
    },
  ),
);
