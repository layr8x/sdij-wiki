// src/components/integrations/JiraConfluenceSettings.jsx
// Jira/Confluence OAuth 통합 설정 UI

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { AlertCircle, CheckCircle, Loader } from 'lucide-react'

export function JiraConfluenceSettings() {
  const [integrations, setIntegrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState(null)

  // 현재 사용자 및 통합 로드
  const loadData = useCallback(async () => {
    try {
      // loading 초기값이 true 라 mount 시점 setLoading(true) 는 불필요
      // (effect 내 동기 setState 경고 회피).
      const { data: sessionData, error: authError } = await supabase.auth.getSession()

      if (authError || !sessionData.session) {
        setError('로그인이 필요합니다')
        return
      }

      // OAuth 통합 조회
      const { data, error: dbError } = await supabase
        .from('oauth_integrations')
        .select('*')
        .eq('user_id', sessionData.session.user.id)

      if (dbError) throw dbError
      setIntegrations(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // mount 시 1회 비동기 데이터 페치 — setState 는 모두 await 이후 발생.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [loadData])

  // OAuth 연결 시작
  async function startConnect() {
    try {
      setConnecting(true)
      setError(null)

      const response = await fetch('/api/oauth/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'jira' }),
      })

      if (!response.ok) {
        throw new Error('Failed to start OAuth')
      }

      const { authUrl } = await response.json()
      // Atlassian OAuth 페이지로 리다이렉트
      window.location.href = authUrl
    } catch (err) {
      setError(err.message)
      setConnecting(false)
    }
  }

  // 통합 연결 해제
  async function disconnect(provider, cloudId) {
    if (!confirm('정말로 이 통합을 해제하시겠습니까?')) return

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) return

      const response = await fetch('/api/oauth/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ provider, cloudId }),
      })

      if (!response.ok) throw new Error('Disconnect failed')

      // UI 업데이트
      setIntegrations(integrations.filter(
        i => !(i.provider === provider && i.cloud_id === cloudId)
      ))
    } catch (err) {
      setError(err.message)
    }
  }

  // 통합별 그룹화
  const groupedIntegrations = integrations.reduce((acc, integration) => {
    const key = `${integration.provider}-${integration.cloud_id}`
    if (!acc[key]) {
      acc[key] = { ...integration, count: 1 }
    } else {
      acc[key].count++
    }
    return acc
  }, {})

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Jira & Confluence</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader className="animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Jira & Confluence 연동</CardTitle>
        <CardDescription>
          Atlassian 계정으로 안전하게 연결합니다. API 키나 토큰 입력이 필요 없습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-900 dark:text-red-100">오류 발생</p>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* 연결된 통합 목록 */}
        {Object.keys(groupedIntegrations).length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">연결된 계정</h3>
            {Object.values(groupedIntegrations).map(integration => (
              <div
                key={`${integration.provider}-${integration.cloud_id}`}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="font-medium capitalize">{integration.provider}</span>
                    <Badge variant="outline" className="capitalize">
                      {integration.provider === 'jira' ? 'Jira' : 'Confluence'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    계정: {integration.atlassian_email}
                  </p>
                  {integration.site_url && (
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      사이트: {new URL(integration.site_url).hostname}
                    </p>
                  )}
                  {integration.expires_at && (
                    <p className="text-xs text-gray-500">
                      토큰 갱신: {new Date(integration.expires_at).toLocaleDateString('ko-KR')}
                    </p>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => disconnect(integration.provider, integration.cloud_id)}
                >
                  해제
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* 연결 버튼 */}
        <div className="space-y-3">
          <h3 className="font-semibold">새 계정 추가</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Atlassian 계정으로 로그인하여 Jira 및 Confluence에 접근합니다.
          </p>
          <Button
            onClick={startConnect}
            disabled={connecting}
            className="w-full"
            size="lg"
          >
            {connecting ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                연결 중...
              </>
            ) : (
              'Atlassian 계정으로 연결'
            )}
          </Button>
        </div>

        {/* 안내 */}
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 space-y-2">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">💡 안내</p>
          <ul className="text-sm text-blue-800 dark:text-blue-200 list-disc list-inside space-y-1">
            <li>API 키 노출 없이 안전한 OAuth 인증</li>
            <li>Jira 이슈 검색 및 생성 가능</li>
            <li>Confluence 페이지 검색 및 편집 가능</li>
            <li>토큰은 자동으로 갱신됩니다</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
