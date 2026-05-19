// api/lib/confluence-client.js
// OAuth를 통한 Confluence API v2 클라이언트

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ATLASSIAN_API_URL = 'https://api.atlassian.com'
const TOKEN_URL = 'https://auth.atlassian.com/oauth/token'
const CLIENT_ID = process.env.ATLASSIAN_OAUTH_CLIENT_ID
const CLIENT_SECRET = process.env.ATLASSIAN_OAUTH_CLIENT_SECRET

class ConfluenceClient {
  constructor(userId, cloudId = null) {
    this.userId = userId
    this.cloudId = cloudId
    this.provider = 'confluence'
  }

  // OAuth 토큰 관리 (Jira와 공유)
  async getValidToken() {
    const { data, error } = await supabase
      .from('oauth_integrations')
      .select('*')
      .eq('user_id', this.userId)
      .in('provider', ['jira', 'confluence'])
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
      await supabase
        .from('oauth_integrations')
        .update({ is_active: false })
        .eq('id', integration.id)
      throw err
    }
  }

  // Confluence API v2 요청
  async request(endpoint, options = {}) {
    const token = await this.getValidToken()
    const url = `${ATLASSIAN_API_URL}/wiki/api/v2${endpoint}`

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
      throw new Error(`Confluence API error ${response.status}: ${error}`)
    }

    return response.json()
  }

  // 페이지 검색
  async searchPages(cql, options = {}) {
    const params = new URLSearchParams({
      cql,
      limit: options.limit || 20,
      cursor: options.cursor || '',
      'body-format': 'storage',
    })

    return this.request(`/pages/search?${params}`)
  }

  // 특정 페이지 조회
  async getPage(pageId, options = {}) {
    const params = new URLSearchParams({
      'body-format': options.bodyFormat || 'storage',
      expand: options.expand || 'body.storage,history',
    })

    return this.request(`/pages/${pageId}?${params}`)
  }

  // 페이지 생성
  async createPage(spaceId, title, body, options = {}) {
    return this.request('/pages', {
      method: 'POST',
      body: JSON.stringify({
        spaceId,
        title,
        type: 'page',
        body: {
          representation: options.representation || 'storage',
          value: body,
        },
        ...options,
      }),
    })
  }

  // 페이지 수정
  async updatePage(pageId, title, body, version, options = {}) {
    return this.request(`/pages/${pageId}`, {
      method: 'PUT',
      body: JSON.stringify({
        id: pageId,
        version: {
          number: version,
          minorEdit: false,
        },
        title,
        type: 'page',
        body: {
          representation: options.representation || 'storage',
          value: body,
        },
        ...options,
      }),
    })
  }

  // 페이지 삭제
  async deletePage(pageId) {
    return this.request(`/pages/${pageId}`, {
      method: 'DELETE',
    })
  }

  // 첨부파일 업로드
  async uploadAttachment(pageId, fileName, fileData, options = {}) {
    const token = await this.getValidToken()
    const url = `${ATLASSIAN_API_URL}/wiki/api/v2/attachments?pageId=${pageId}`

    const formData = new FormData()
    const blob = new Blob([fileData], { type: options.mimeType || 'application/octet-stream' })
    formData.append('file', blob, fileName)
    if (options.comment) {
      formData.append('comment', options.comment)
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`)
    }

    return response.json()
  }

  // 스페이스 목록
  async getSpaces(options = {}) {
    const params = new URLSearchParams({
      limit: options.limit || 25,
      cursor: options.cursor || '',
      expand: options.expand || 'icon,homepage',
    })

    return this.request(`/spaces?${params}`)
  }

  // 특정 스페이스 정보
  async getSpace(spaceId, options = {}) {
    const params = new URLSearchParams({
      expand: options.expand || 'icon,homepage,description',
    })

    return this.request(`/spaces/${spaceId}?${params}`)
  }

  // 페이지의 자식 페이지
  async getChildPages(pageId, options = {}) {
    const params = new URLSearchParams({
      limit: options.limit || 25,
      cursor: options.cursor || '',
      'body-format': 'storage',
    })

    return this.request(`/pages/${pageId}/children?${params}`)
  }

  // 코멘트 추가
  async addComment(pageId, body) {
    return this.request('/comments', {
      method: 'POST',
      body: JSON.stringify({
        pageId,
        body: {
          representation: 'storage',
          value: body,
        },
      }),
    })
  }
}

export default ConfluenceClient
