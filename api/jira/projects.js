// api/jira/projects.js
// Jira 프로젝트 조회

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

  const { cloudId } = req.query
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
    const jiraClient = new JiraClient(userId, 'jira', cloudId)
    const projects = await jiraClient.getProjects()

    res.status(200).json(projects)
  } catch (err) {
    console.error('Jira projects error:', err)
    res.status(500).json({ error: String(err?.message || err) })
  }
}
