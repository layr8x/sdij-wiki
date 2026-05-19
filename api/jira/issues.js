// api/jira/issues.js
// Jira 이슈 생성/수정 프록시

import { createClient } from '@supabase/supabase-js'
import JiraClient from '../_lib/jira-client.js'

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
      // 이슈 생성
      const { cloudId, fields } = req.body

      if (!fields) {
        return res.status(400).json({ error: 'Missing fields' })
      }

      const jiraClient = new JiraClient(userId, 'jira', cloudId)
      const result = await jiraClient.createIssue(fields)

      return res.status(201).json(result)
    } else if (req.method === 'PUT') {
      // 이슈 수정
      const { cloudId, issueKey, fields } = req.body

      if (!issueKey || !fields) {
        return res.status(400).json({ error: 'Missing issueKey or fields' })
      }

      const jiraClient = new JiraClient(userId, 'jira', cloudId)
      const result = await jiraClient.updateIssue(issueKey, fields)

      return res.status(200).json(result)
    } else if (req.method === 'GET') {
      // 이슈 조회
      const { cloudId, issueKey } = req.query

      if (!issueKey) {
        return res.status(400).json({ error: 'Missing issueKey' })
      }

      const jiraClient = new JiraClient(userId, 'jira', cloudId)
      const result = await jiraClient.getIssue(issueKey)

      return res.status(200).json(result)
    } else {
      return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (err) {
    console.error('Jira issues error:', err)
    res.status(500).json({ error: String(err?.message || err) })
  }
}
