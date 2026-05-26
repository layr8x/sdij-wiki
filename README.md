# AMS Wiki

학원 운영 시스템(AMS) 가이드 통합 위키. **shadcn/ui + Supabase + Confluence API** 기반의 엔터프라이즈급 지식 베이스.

## 기술 스택

- **프레임워크**: React 19 + Vite 8
- **UI/디자인**: Tailwind CSS 4 (CSS-first `@theme`) + shadcn/ui 표준
- **컴포넌트**: 설치 28개 (Accordion, Avatar, Badge, Breadcrumb, Button, Card, Chart, Checkbox, Collapsible, Dialog, Drawer, DropdownMenu, Input, Label, ScrollArea, Select, Separator, Sheet, Sidebar, Skeleton, Sonner, Table, Tabs, Textarea, Toast, Toggle, ToggleGroup, Tooltip)
- **라우팅**: React Router v7
- **상태 관리**: React Query (TanStack Query)
- **데이터베이스**: Supabase (PostgreSQL + Auth + Realtime)
- **외부 연동**: Confluence REST API v2
- **배포**: Vercel (자동 배포) + GitHub Actions CI/CD

## 빠른 시작

### 1. 로컬 개발 환경

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 열어 Supabase/Confluence 자격증명 입력

# 개발 서버 시작
npm run dev
```

브라우저에서 [http://localhost:5173](http://localhost:5173) 접속.

### 2. Supabase 설정 (선택)

Supabase 미설정 시 `src/data/mockData.js`의 로컬 데이터로 자동 폴백됩니다.

```bash
# (1) https://supabase.com 에서 프로젝트 생성
# (2) SQL Editor에 아래 순서로 실행:
#     - supabase/schema.sql  (테이블·인덱스·RLS 정책)
#     - supabase/seed.sql    (24개 가이드 시드 데이터)
# (3) Project Settings > API 에서 URL + anon key 복사하여 .env 에 설정

# (4) 시드 SQL 재생성 (mockData.js 변경 시)
npm run db:seed
```

### 3. 사용 가능한 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev`       | 개발 서버 시작 (HMR) |
| `npm run build`     | 프로덕션 빌드 |
| `npm run preview`   | 빌드 미리보기 |
| `npm run lint`      | ESLint 실행 |
| `npm run test`      | Vitest 단위 테스트 |
| `npm run test:e2e`  | Playwright E2E 테스트 |
| `npm run db:seed`   | Supabase 시드 SQL 재생성 |

## 주요 기능

### 🎯 가이드 시스템 (6유형)
- **SOP**: 절차형 단계별 가이드 (이미지 포함)
- **DECISION**: 판단분기 테이블 (조건/처리/상태)
- **REFERENCE**: 용어 사전 (검색 가능)
- **TROUBLE**: 트러블슈팅 (오류/원인/해결/심각도)
- **RESPONSE**: CS 대응 매뉴얼 스크립트
- **POLICY**: 정책 변경 전/후 비교

### 🔐 인증 시스템 (Supabase Auth)
- **구글 OAuth** 원클릭 로그인
- **이메일/비밀번호** 로그인 + 회원가입
- 역할 기반 권한 (OPERATOR, ADMIN, MANAGER, GUEST)
- 세션 자동 동기화

### 📚 Confluence API 연동
- 페이지 조회/생성/수정
- 첨부파일 관리 (이미지 업로드)
- CQL 전문 검색
- 스페이스 트리 네비게이션

### 🔍 검색 & 네비게이션
- **⌘K 명령 팔레트** (shadcn/ui Command)
- 동의어 확장 검색 (예: "병합" → 계정통합)
- On This Page 자동 목차 (IntersectionObserver)
- 최근 조회 / 인기 가이드

### 🎨 UI/UX
- **shadcn/ui 표준** 컴포넌트 28개 설치 (Sidebar/Dashboard 블록 포함; 확장은 `npx shadcn@latest add <name>`)
- 다크모드 (CSS 변수 기반, `@theme` + `html.dark`)
- Pretendard 한글 최적화 폰트
- 반응형 디자인 (모바일·태블릿·데스크톱)
- Toast 알림

### 📊 통계 & 피드백
- 조회수 자동 추적 (Supabase RPC)
- 가이드별 피드백 수집 (도움됨/보완필요)
- 검색 로그 기록

## 환경 변수

필수 (Supabase):
- `VITE_SUPABASE_URL` - Supabase 프로젝트 URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon 공개 키

선택 (Confluence):
- `VITE_CONFLUENCE_EMAIL` - Atlassian 이메일
- `VITE_CONFLUENCE_TOKEN` - [API 토큰](https://id.atlassian.com/manage-profile/security/api-tokens)
- `VITE_CONFLUENCE_DOMAIN` - 도메인 (기본: hiconsy.atlassian.net)
- `VITE_CONFLUENCE_SPACE_KEY` - 스페이스 키 (기본: FVSOL)

## 컴포넌트 라이브러리

shadcn/ui 컴포넌트 **28개**가 `src/components/ui/` 에 설치되어 있습니다 (sidebar-07 / dashboard-01 블록 적용 포함). 자주 쓰는 9개는 barrel 익스포트(`@/components/ui`)로, 그 외는 개별 파일에서 직접 import합니다.

```jsx
// 배럴 익스포트 (Badge, Button, Card, Input, Separator, Skeleton, Table, Textarea, Toast)
import { Badge, Button, Card, CardHeader, CardContent } from '@/components/ui'

// 개별 import (그 외 19개)
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sidebar, SidebarContent } from '@/components/ui/sidebar'
```

설치된 전체 목록: `accordion`, `avatar`, `badge`, `breadcrumb`, `button`, `card`, `chart`, `checkbox`, `collapsible`, `dialog`, `drawer`, `dropdown-menu`, `input`, `label`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `sonner`, `table`, `tabs`, `textarea`, `toast`, `toggle`, `toggle-group`, `tooltip`.

```bash
# 새 컴포넌트 추가 (예: calendar, popover, form)
npx shadcn@latest add calendar popover form
```

shadcn/ui 전반(철학·CLI·테마·레지스트리·MCP·Tailwind v4)은 [`docs/shadcn-ui/`](./docs/shadcn-ui/README.md) 참조.

## 프로젝트 구조

```
src/
├── components/
│   ├── common/      # Layout, Header, Sidebar, UserMenu 등
│   ├── search/      # SearchOverlay (⌘K 팔레트)
│   └── ui/          # shadcn/ui 9개 컴포넌트 (실사용 기반)
├── pages/           # 8개 페이지 (Home, Guide, List, FAQ, etc.)
├── hooks/           # useGuides (React Query 훅)
├── lib/
│   ├── supabase.js  # Supabase 클라이언트
│   ├── db.js        # DB 데이터 레이어 (폴백 포함)
│   ├── confluence.js# Confluence API 클라이언트
│   └── utils.js     # cn() 등 유틸리티
├── store/           # AuthStore, SearchStore, I18nStore
├── data/            # mockData (폴백용)
└── locales/         # 다국어 (ko.json, en.json)

supabase/
├── schema.sql       # PostgreSQL 테이블·인덱스·RPC·RLS
├── seed.sql         # 24개 가이드 시드 데이터
└── generate-seed.mjs # mockData → SQL 자동 생성 스크립트
```

## 프로젝트 링크

- [라이브 데모](https://sdij-wiki.vercel.app)
- [Vercel 대시보드](https://vercel.com/layr8xs-projects/ams-wiki)
- [shadcn/ui 문서](https://ui.shadcn.com)
- [Supabase 문서](https://supabase.com/docs)

## 도움말

- **shadcn/ui 완전 학습 가이드**: [docs/shadcn-ui/README.md](./docs/shadcn-ui/README.md) — 철학·CLI·테마·컴포넌트·레지스트리·MCP·v4 마이그레이션 등 17개 주제
- **배포 이슈**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **기여 가이드**: [CONTRIBUTING.md](./CONTRIBUTING.md)
- **린팅 규칙**: [ESLint 문서](https://eslint.org)
- **빌드 설정**: [Vite 문서](https://vitejs.dev)
