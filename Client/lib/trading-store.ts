"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { bybitService } from "./bybit-client";

interface TradingState {
  // API Configuration
  isTestnet: boolean;

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
  refreshAccountData: (includeOrders?: boolean) => Promise<void>;
  placeOrder: (orderParams: any) => Promise<any>;
  closePosition: (params: any) => Promise<any>;
  updatePosition: (params: any) => Promise<any>;
  setError: (error: string | null) => void;
}

export const useTradingStore = create<TradingState>()(
  persist(
    (set, get) => ({
  // Initial state
  isTestnet: false,
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
    set({ isCheckingCredentials: true });
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
    set({ isTestnet: useTestnet, isConnected: false });
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

  refreshAccountData: async (includeOrders = false) => {
    try {
      const [balance, positions, orders] = await Promise.all([
        bybitService.getAccountBalance(),
        bybitService.getPositions(),
        includeOrders ? bybitService.getActiveOrders() : Promise.resolve(get().orders),
      ]);

      set({ balance, positions, orders, error: null });
      if (includeOrders) {
        console.log('Loaded', orders.length, 'active orders');
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  placeOrder: async (orderParams: any) => {
    try {
      const result = await bybitService.placeOrder(orderParams);
      get().refreshAccountData(true); // Refresh after order and fetch orders
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
        isTestnet: state.isTestnet,
        selectedSymbol: state.selectedSymbol,
      }),
    },
  ),
);
