// api/jira/search.js
// Jira 이슈 검색 프록시

import { createClient } from '@supabase/supabase-js'
import JiraClient from '../_lib/jira-client.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { jql, cloudId, maxResults } = req.query
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  if (!jql) {
    return res.status(400).json({ error: 'Missing JQL query' })
  }

  try {
    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: jwtError } = await supabase.auth.getUser(token)

    if (jwtError || !userData?.user?.id) {
      return res.status(401).json({ error: 'Invalid authentication' })
    }

    const userId = userData.user.id
    const jiraClient = new JiraClient(userId, 'jira', cloudId)

    const results = await jiraClient.searchIssues(jql, {
      maxResults: Math.min(parseInt(maxResults) || 20, 100),
    })

    res.status(200).json(results)
  } catch (err) {
    console.error('Jira search error:', err)
    res.status(500).json({ error: String(err?.message || err) })
  }
}
