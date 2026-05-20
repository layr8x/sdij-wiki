// api/confluence/pages.js
// Confluence 페이지 생성/수정 프록시

import { createClient } from '@supabase/supabase-js'
import ConfluenceClient from '../_lib/confluence-client.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  try {
    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: jwtError } = await supabase.auth.getUser(token)

    if (jwtError || !userData?.user?.id) {
      return res.status(401).json({ error: 'Invalid authentication' })
    }

    const userId = userData.user.id

    if (req.method === 'POST') {
      // 페이지 생성
      const { cloudId, spaceId, title, body } = req.body

      if (!spaceId || !title || !body) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      const confluenceClient = new ConfluenceClient(userId, cloudId)
      const result = await confluenceClient.createPage(spaceId, title, body)

      return res.status(201).json(result)
    } else if (req.method === 'PUT') {
      // 페이지 수정
      const { cloudId, pageId, title, body, version } = req.body

      if (!pageId || !title || !body || !version) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      const confluenceClient = new ConfluenceClient(userId, cloudId)
      const result = await confluenceClient.updatePage(pageId, title, body, version)

      return res.status(200).json(result)
    } else if (req.method === 'GET') {
      // 페이지 조회
      const { cloudId, pageId } = req.query

      if (!pageId) {
        return res.status(400).json({ error: 'Missing pageId' })
      }

      const confluenceClient = new ConfluenceClient(userId, cloudId)
      const result = await confluenceClient.getPage(pageId)

      return res.status(200).json(result)
    } else if (req.method === 'DELETE') {
      // 페이지 삭제
      const { cloudId, pageId } = req.body

      if (!pageId) {
        return res.status(400).json({ error: 'Missing pageId' })
      }

      const confluenceClient = new ConfluenceClient(userId, cloudId)
      await confluenceClient.deletePage(pageId)

      return res.status(204).end()
    } else {
      return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (err) {
    console.error('Confluence pages error:', err)
    res.status(500).json({ error: String(err?.message || err) })
  }
}
