"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useTradingStore } from "@/lib/trading-store"
import { Key, Shield, AlertTriangle, CheckCircle } from "lucide-react"

export function ApiSettings() {
  const {
    apiKey,
    apiSecret,
    isTestnet,
    isSimulationMode,
    isConnected,
    isCheckingCredentials,
    error,
    setApiCredentials,
    toggleSimulationMode,
  } = useTradingStore()

  const [localApiKey, setLocalApiKey] = useState(apiKey)
  const [localApiSecret, setLocalApiSecret] = useState(apiSecret)
  const [showSecrets, setShowSecrets] = useState(false)

  const handleSaveCredentials = () => {
    setApiCredentials(localApiKey, localApiSecret)
  }

  const maskSecret = (secret: string) => {
    if (!secret) return ""
    return secret.slice(0, 8) + "•".repeat(Math.max(0, secret.length - 8))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API 설정
          </CardTitle>
          <CardDescription>Bybit API 키를 설정하여 실제 거래를 시작하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 모드 선택 */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">거래 모드</h3>
                <Badge variant={isSimulationMode ? "secondary" : "default"}>
                  {isSimulationMode ? "시뮬레이션" : "실제 거래"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {isSimulationMode ? "가상 자금으로 안전하게 거래를 연습하세요" : "실제 자금으로 거래합니다 (주의 필요)"}
              </p>
            </div>
            <Switch checked={!isSimulationMode} onCheckedChange={toggleSimulationMode} />
          </div>

          {/* API 키 설정 */}
          {!isSimulationMode && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showSecrets ? "text" : "password"}
                    placeholder="Bybit API Key 입력"
                    value={localApiKey}
                    onChange={(e) => setLocalApiKey(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowSecrets(!showSecrets)}
                  >
                    {showSecrets ? "숨기기" : "보기"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiSecret">API Secret</Label>
                <Input
                  id="apiSecret"
                  type={showSecrets ? "text" : "password"}
                  placeholder="Bybit API Secret 입력"
                  value={localApiSecret}
                  onChange={(e) => setLocalApiSecret(e.target.value)}
                />
              </div>

              <Button onClick={handleSaveCredentials} disabled={!localApiKey || !localApiSecret} className="w-full">
                <Shield className="h-4 w-4 mr-2" />
                API 키 저장
              </Button>
              {isCheckingCredentials && (
                <p className="text-sm text-muted-foreground mt-2">API 키 확인 중...</p>
              )}
            </div>
          )}

          {/* 연결 상태 */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              )}
              <div>
                <p className="font-medium">
                  {isCheckingCredentials
                    ? "확인 중"
                    : isConnected
                    ? "연결됨"
                    : "연결 안됨"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isSimulationMode ? "시뮬레이션 모드" : isTestnet ? "테스트넷" : "메인넷"}
                </p>
              </div>
            </div>
            <Badge variant={isConnected ? "default" : "secondary"}>{isConnected ? "활성" : "비활성"}</Badge>
          </div>

          {/* 현재 설정 요약 */}
          {(apiKey || isSimulationMode) && (
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <h4 className="font-medium">현재 설정</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>모드:</span>
                  <span>{isSimulationMode ? "시뮬레이션" : "실제 거래"}</span>
                </div>
                <div className="flex justify-between">
                  <span>네트워크:</span>
                  <span>{isTestnet ? "테스트넷" : "메인넷"}</span>
                </div>
                {!isSimulationMode && (
                  <div className="flex justify-between">
                    <span>API Key:</span>
                    <span className="font-mono">{maskSecret(apiKey)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 에러 표시 */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 보안 안내 */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>보안 안내:</strong> API 키는 안전하게 암호화되어 저장됩니다. 실제 거래 시에는 반드시 테스트넷에서
              충분히 테스트한 후 진행하세요.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
