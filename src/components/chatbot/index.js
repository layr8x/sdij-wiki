// src/components/chatbot/index.js
// Barrel export — 외부에서는 이 한 줄만 사용
//   import { Chatbot, useChatbot } from '@/components/chatbot'

export { Chatbot, ChatbotPopupPage, default } from './Chatbot'
export { useChatbot, CHATBOT_STAGES, MSG_TYPES } from './useChatbot'
export {
  INTENT_RULES,
  CONFIDENCE_THRESHOLD,
  detectIntent,
  getQuickRepliesForContext,
  generateRagResponse,
  NL2SQL_SAMPLES,
  // v4 신규
  CONFIDENCE_BANDS,
  getConfidenceBand,
  CITATION_SOURCES,
  getCitation,
  SUGGESTION_TEMPLATES,
  searchSuggestions,
  CASE_BRANCHES,
  getCaseBranches,
  FULL_GUIDES,
  getFullGuide,
} from './intents'
