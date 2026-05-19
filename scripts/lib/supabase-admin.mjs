// scripts/lib/supabase-admin.mjs
// service_role 키로 동작하는 Supabase 클라이언트 (스크립트 전용).
// 절대 브라우저 코드에 노출하지 말 것.

import { createClient } from '@supabase/supabase-js';

export function getAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error('SUPABASE_URL not set');
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
