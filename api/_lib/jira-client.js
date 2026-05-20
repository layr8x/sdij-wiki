// api/lib/jira-client.js
// OAuth를 통한 Jira API 클라이언트
// 토큰 리프레시 및 에러 핸들링 포함

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ATLASSIAN_API_URL = 'https://api.atlassian.com'
const TOKEN_URL = 'https://auth.atlassian.com/oauth/token'
const CLIENT_ID = process.env.ATLASSIAN_OAUTH_CLIENT_ID
const CLIENT_SECRET = process.env.ATLASSIAN_OAUTH_CLIENT_SECRET

class JiraClient {
  constructor(userId, provider = 'jira', cloudId = null) {
    this.userId = userId
    this.provider = provider
    this.cloudId = cloudId
  }

  // 유효한 OAuth 토큰 조회 (필요시 리프레시)
  async getValidToken() {
    const { data, error } = await supabase
      .from('oauth_integrations')
      .select('*')
      .eq('user_id', this.userId)
      .eq('provider', this.provider)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      throw new Error('No OAuth integration found')
    }

    // 토큰 만료 확인 및 리프레시
    if (data.expires_at && new Date(data.expires_at) <= new Date()) {
      if (!data.refresh_token) {
        throw new Error('Token expired and no refresh token available')
      }
      return this.refreshToken(data)
    }

    return data.access_token
  }

  // 토큰 리프레시
  async refreshToken(integration) {
    if (!integration.refresh_token) {
      throw new Error('No refresh token available')
    }

    try {
      const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          refresh_token: integration.refresh_token,
        }),
      })

      if (!response.ok) {
        throw new Error('Token refresh failed')
      }

      const { access_token, expires_in } = await response.json()
      const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString()

      // DB에 새 토큰 저장
      const { error } = await supabase
        .from('oauth_integrations')
        .update({
          access_token,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', integration.id)

      if (error) throw error

      return access_token
    } catch (err) {
      // 리프레시 실패시 통합 비활성화
      await supabase
        .from('oauth_integrations')
        .update({ is_active: false })
        .eq('id', integration.id)
      throw err
    }
  }

  // Jira API 요청
  async request(endpoint, options = {}) {
    const token = await this.getValidToken()
    const url = `${ATLASSIAN_API_URL}/ex/jira/${this.cloudId}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (response.status === 401) {
      throw new Error('Unauthorized - token may be revoked')
    }

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Jira API error ${response.status}: ${error}`)
    }

    return response.json()
  }

  // 이슈 검색
  async searchIssues(jql, options = {}) {
    const params = new URLSearchParams({
      jql,
      maxResults: options.maxResults || 20,
      startAt: options.startAt || 0,
      expand: options.expand || 'changelog',
    })

    return this.request(`/rest/api/3/search?${params}`)
  }

  // 특정 이슈 조회
  async getIssue(issueIdOrKey) {
    return this.request(`/rest/api/3/issues/${issueIdOrKey}`)
  }

  // 이슈 생성
  async createIssue(fields) {
    return this.request('/rest/api/3/issues', {
      method: 'POST',
      body: JSON.stringify({ fields }),
    })
  }

  // 이슈 수정
  async updateIssue(issueIdOrKey, fields) {
    return this.request(`/rest/api/3/issues/${issueIdOrKey}`, {
      method: 'PUT',
      body: JSON.stringify({ fields }),
    })
  }

  // 댓글 추가
  async addComment(issueIdOrKey, text) {
    return this.request(`/rest/api/3/issues/${issueIdOrKey}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        body: {
          version: 1,
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text,
                },
              ],
            },
          ],
        },
      }),
    })
  }

  // 프로젝트 목록
  async getProjects() {
    return this.request('/rest/api/3/projects')
  }

  // 보드 목록 (Agile)
  async getBoards(projectKey) {
    return this.request(`/rest/api/3/boards?projectKeyOrId=${projectKey}`)
  }
}

export default JiraClient
