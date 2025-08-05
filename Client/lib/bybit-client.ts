"use client";

const SERVER_URL =
  process.env.NEXT_PUBLIC_TRADING_SERVER || "http://localhost:4000";

export interface BybitConfig {
  testnet?: boolean;
}

export class BybitService {
  constructor(config: BybitConfig = {}) {}

  async setCredentials(
    apiKey: string,
    apiSecret: string,
    testnet = false,
    oauthToken?: string
  ) {
    try {
      await fetch(`${SERVER_URL}/api/set-credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, apiSecret, testnet, oauthToken }),
      });
    } catch (err) {
      console.error("Failed to update server credentials:", err);
    }
  }

  async validateCredentials(
    apiKey: string,
    apiSecret: string,
    testnet = false
  ) {
    try {
      const res = await fetch(`${SERVER_URL}/api/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, apiSecret, testnet }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        throw new Error(data.error || "Invalid credentials");
      }
      return true;
    } catch (err) {
      console.error("API credential validation failed:", err);
      throw err;
    }
  }

  async getKlines(params: {
    symbol: string;
    interval?: string;
    limit?: number;
    category?: string;
    start?: number;
    end?: number;
  }) {
    const query = new URLSearchParams({
      symbol: params.symbol,
      interval: params.interval?.toString() || "1",
      limit: (params.limit || 200).toString(),
      category: params.category || "linear",
    });
    if (params.start) query.set("start", params.start.toString());
    if (params.end) query.set("end", params.end.toString());

    const res = await fetch(`${SERVER_URL}/api/klines?${query.toString()}`);
    if (!res.ok) {
      const message = await res.text();
      throw new Error(`Server error ${res.status}: ${message}`);
    }
    const data = await res.json();
    return data.result?.list || [];
  }

  async getAccountBalance() {
    const res = await fetch(`${SERVER_URL}/api/balance`);
    if (!res.ok) {
      const message = await res.text();
      throw new Error(`Server error ${res.status}: ${message}`);
    }
    const data = await res.json();
    return data;
  }

  async getPositions() {
    const res = await fetch(`${SERVER_URL}/api/positions`);
    if (!res.ok) {
      const message = await res.text();
      throw new Error(`Server error ${res.status}: ${message}`);
    }
    const data = await res.json();
    return data.result?.list || [];
  }

  async placeOrder(orderParams: {
    symbol: string;
    side: "Buy" | "Sell";
    orderType: "Market" | "Limit";
    qty: string;
    price?: string;
    leverage?: number;
    positionIdx?: number;
    takeProfit?: string;
    stopLoss?: string;
  }) {
    const res = await fetch(`${SERVER_URL}/api/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderParams),
    });
    if (!res.ok) {
      const message = await res.text();
      throw new Error(`Server error ${res.status}: ${message}`);
    }
    const data = await res.json();
    return data;
  }

  async cancelOrder(symbol: string, orderId: string) {
    const res = await fetch(`${SERVER_URL}/api/cancel-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, orderId }),
    });
    if (!res.ok) {
      const message = await res.text();
      throw new Error(`Server error ${res.status}: ${message}`);
    }
    const data = await res.json();
    return data.result;
  }

  async getActiveOrders() {
    const res = await fetch(`${SERVER_URL}/api/orders`);
    if (!res.ok) {
      const message = await res.text();
      throw new Error(`Server error ${res.status}: ${message}`);
    }
    const data = await res.json();
    return data.result?.list || [];
  }

  async amendOrder(params: {
    symbol: string;
    orderId: string;
    qty?: string;
    price?: string;
  }) {
    const res = await fetch(`${SERVER_URL}/api/amend-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const message = await res.text();
      throw new Error(`Server error ${res.status}: ${message}`);
    }
    const data = await res.json();
    return data.result;
  }

  async closePosition(params: {
    symbol: string;
    side: "Buy" | "Sell";
    qty: string;
    positionIdx?: number;
  }) {
    const res = await fetch(`${SERVER_URL}/api/close-position`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const message = await res.text();
      throw new Error(`Server error ${res.status}: ${message}`);
    }
    const data = await res.json();
    return data.result;
  }

  async updatePosition(params: {
    symbol: string;
    takeProfit?: string;
    stopLoss?: string;
    positionIdx?: number;
  }) {
    const res = await fetch(`${SERVER_URL}/api/trading-stop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const message = await res.text();
      throw new Error(`Server error ${res.status}: ${message}`);
    }
    const data = await res.json();
    return data.result;
  }
}

export const bybitService = new BybitService();

