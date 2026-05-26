# AMS Wiki — 프로젝트 메모리

## 📌 프로젝트 개요
학원 운영 시스템(AMS) 가이드 통합 위키. **shadcn/ui + Supabase + Confluence API** 기반의 엔터프라이즈급 지식 베이스.

## 🛠 기술 스택
- **프레임워크**: React 19 + Vite 8
- **UI/디자인**: Tailwind CSS 4 + shadcn/ui (28개 컴포넌트)
- **라우팅**: React Router v7
- **상태관리**: React Query (TanStack)
- **DB**: Supabase (PostgreSQL + Auth + Realtime)
- **외부 API**: Confluence REST API v2, Jira REST API v3
- **배포**: Vercel (자동 배포) + GitHub Actions CI/CD

## 🏗 핵심 아키텍처

### 데이터 흐름
```
Supabase PostgreSQL (가이드 데이터)
    ↓
React Query (5분 캐시)
    ↓
컴포넌트 렌더 (HomePage, GuideListPage, GuidePage 등)
    ↓
Confluence API (필요시 데이터 동기화)
    ↓
Claude Haiku 4.5 (검색 결과 요약)
```

### 주요 페이지/컴포넌트
- **HomePage** (`/`): 최근 가이드 + 인기 가이드 + 모듈 네비게이션
- **GuideListPage** (`/guides`): 모듈별 가이드 목록 (필터링)
- **GuidePage** (`/guides/:id`): 개별 가이드 상세 보기 + 편집 + 피드백
- **CreateGuidePage** (`/create`): 새 가이드 작성 시작 (템플릿 선택 → 기본정보 입력)
- **EditorPage** (`/editor?id=...`): 가이드 편집 (구조 정의 + 콘텐츠 작성)
- **AdminPage** (`/admin/*`): 관리자 대시보드 (RBAC 기반)
- **SearchOverlay**: ⌘K 명령 팔레트 (shadcn Command)
- **SyncMonitor**: Jira/Confluence 동기화 상태 (Pro 플랜용)

### 데이터 모델
```
guides (id, title, content, type, module, status, created_at, updated_at)
guide_versions (id, guide_id, content, version, created_by, created_at)
guide_feedback (id, guide_id, user_id, helpful, issues, created_at)
sync_logs (id, service, status, completed_at, error_message)
audit_logs (id, user_id, action, resource_type, changes, timestamp)
```

### 역할별 권한 (RBAC)
- **GUEST**: 읽기 전용
- **OPERATOR**: 가이드 조회 + 피드백
- **MANAGER**: 가이드 생성/수정 + 통계 조회
- **ADMIN**: 전체 권한 + 사용자 관리

## 📋 코드 컨벤션

### 파일 구조
```
src/
├── App.jsx                     (라우팅)
├── components/
│   ├── common/                 (공용 컴포넌트)
│   ├── pages/                  (페이지 컴포넌트)
│   ├── search/                 (검색 관련)
│   ├── ui/                     (shadcn/ui)
│   └── admin/                  (관리자 대시보드)
├── hooks/                      (커스텀 훅)
├── lib/
│   ├── db.js                   (Supabase 클라이언트)
│   └── api/                    (API 통합)
├── styles/                     (글로벌 스타일)
└── data/                       (모형 데이터 + 생성된 데이터)

api/
├── confluence-img/             (Confluence 이미지 프록시)
└── search-summary.js          (Claude 요약 + 프롬프트 캐싱)
```

### React Query 패턴
```javascript
// 훅 사용 (mockData 의존성 제거)
const { data: guides } = useGuideList({ module: 'SOP' })
const { data: guide } = useGuide(id)
const { mutateAsync: submit } = useUpdateGuide()
```

### 컴포넌트 패턴
```javascript
// ErrorBoundary로 라우트 격리
<RouteBoundary>
  <GuidePage />
</RouteBoundary>

// Suspense + 스켈레톤 로더
<Suspense fallback={<SkeletonLoader />}>
  <GuideContent />
</Suspense>
```

## 🔑 환경변수
```
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
VITE_CONFLUENCE_DOMAIN=hiconsy.atlassian.net
VITE_CONFLUENCE_SPACE_KEY=FVSOL
CRON_SECRET=random_secret (Vercel Cron용)
ANTHROPIC_API_KEY=sk-ant-... (Claude API)
```

## 🎯 핵심 워크플로우

### 1. 가이드 조회
- React Query로 5분 캐시 (staleTime)
- Supabase 미설정 시 mockData 폴백
- Confluence 연동 (필요시)

### 2. Jira/Confluence 동기화
- **Hobby 플랜**: 1회/일 (자정 UTC, 오전 9시 한국)
- **Pro 플랜**: 6시간마다
- Vercel Cron Jobs + React Query 조합

### 3. 검색 + AI 요약
- ⌘K 명령 팔레트로 검색
- Claude Haiku 4.5 (프롬프트 캐싱)
- 검색 결과 2~3문장 자동 요약

### 4. 관리자 대시보드
- 가이드 생성/수정/삭제
- Jira/Confluence 동기화 모니터링
- 감사 로그 조회
- 사용자 역할 관리

## ⚠️ 하지 말 것
- **mockData 직접 참조 금지** — 항상 React Query 훅 사용
- **try-catch 없이 API 호출 금지** — 에러 바운더리 또는 에러 상태 처리 필수
- **환경변수 하드코딩 금지** — `.env.example` 참조 후 `.env.local` 사용
- **Supabase RLS 정책 없이 데이터 노출 금지** — 항상 `auth.uid()` 필터링
- **프롬프트 캐싱 설정 변경 금지** — `api/search-summary.js`의 `cache_control` 유지
- **pageSize 임의 변경 금지** — 기본 20, 최대 100 (Rate Limit 준수)

## 🔐 보안 체크리스트
- ✅ RBAC으로 페이지 접근 제어 (RequireRole 컴포넌트)
- ✅ Supabase RLS 정책 활성화
- ✅ CSRF 방어 (State Token in OAuth)
- ✅ HttpOnly 쿠키로 토큰 저장
- ✅ 민감한 정보는 서버에서만 처리
- ✅ API 비용 제어 (Rate Limit + Cron Secret)

## 🚀 실행 명령어
```bash
npm install                     # 의존성 설치
npm run dev                    # 개발 서버 (HMR)
npm run build                  # 프로덕션 빌드
npm run preview                # 빌드 미리보기
npm run lint                   # ESLint 실행
npm run test                   # Vitest 단위 테스트
npm run test:e2e              # Playwright E2E 테스트
npm run db:seed               # Supabase 시드 재생성
npm run sync:confluence       # Confluence 동기화
```

## 📊 배포

### Vercel 자동 배포
- **프로덕션**: https://sdij-wiki.vercel.app
- **프리뷰**: Vercel 브랜치별 자동 생성 (`ams-wiki-<hash>-layr8xs-projects.vercel.app`)
- main 브랜치 푸시 → GitHub Actions → Vercel 자동 배포
- 환경변수는 Vercel 프로젝트 설정에서 관리
- Cron Jobs는 vercel.json에서 정의

### 플랜별 Cron 스케줄
```json
// Hobby (무료)
{"path": "/api/sync/jira", "schedule": "0 0 * * *"}

// Pro ($20/월)
{"path": "/api/sync/jira", "schedule": "0 */6 * * *"}
{"path": "/api/sync/confluence", "schedule": "0 1,7,13,19 * * *"}
```

## 🔄 다음 개선 항목
- [ ] Elasticsearch 통합 (고급 검색)
- [ ] 웹훅 (실시간 동기화)
- [ ] 증분 동기화 (API 비용 절감)
- [ ] Slack 알림 통합
- [ ] 감사 로그 UI 개선
