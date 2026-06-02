# AMS Wiki 개발 가이드

## 프로젝트 개요

AMS Wiki는 학원 운영 관리 시스템(AMS) 가이드 및 운영 매뉴얼을 제공하는 웹 애플리케이션입니다.

## 기술 스택

- **React 19.2.4**: UI 라이브러리
- **React Router v7**: 클라이언트 사이드 라우팅 (SPA)
- **Vite 8**: 빌드 도구
- **Tailwind CSS v4**: 스타일링 (Vite 플러그인)
- **shadcn/ui**: 디자인 시스템 (15개 컴포넌트, Radix UI 기반)
- **Playwright**: E2E 테스트
- **ESLint**: 코드 품질 검사

## 프로젝트 구조

```
src/
├── components/
│   ├── common/          # 공용 컴포넌트
│   │   ├── Layout.jsx   # 3-column 레이아웃
│   │   ├── Sidebar.jsx  # 사이드바 (최근, 즐겨찾기)
│   │   ├── GlobalHeader.jsx
│   │   ├── ThemeToggle.jsx
│   │   ├── LanguageSelector.jsx
│   │   ├── AIChat.jsx
│   │   ├── LoadingSpinner.jsx
│   │   ├── SkeletonLoader.jsx
│   │   └── Pagination.jsx
│   ├── search/
│   │   └── SearchOverlay.jsx    # 동의어 검색 통합
│   └── ui/              # shadcn/ui 컴포넌트
├── pages/
│   ├── HomePage.jsx
│   ├── GuideListPage.jsx        # 필터, 정렬, 검색
│   ├── GuidePage.jsx            # 상세 페이지
│   ├── FaqPage.jsx
│   ├── UpdatesPage.jsx
│   ├── EditorPage.jsx
│   └── ErrorPage.jsx
├── store/               # 상태 관리
│   ├── authStore.jsx    # 인증 (RBAC)
│   ├── authConstants.js # 권한 상수
│   ├── searchStore.jsx  # 검색 오버레이
│   ├── i18nStore.jsx    # 국제화
│   └── i18nContext.js   # i18n 컨텍스트
├── hooks/               # 커스텀 훅
│   ├── useDarkMode.js   # 다크 모드
│   ├── useI18n.js       # 국제화
│   ├── useMediaQuery.js # 반응형 디자인
│   ├── useGuideFilter.js # 필터링
│   └── usePagination.js # 페이지네이션
├── utils/
│   ├── performance.js    # 성능 최적화
│   └── __tests__/        # 유닛 테스트
├── data/
│   └── mockData.js      # 16개 운영 가이드 (메타데이터 포함)
├── locales/             # 번역 파일
│   ├── ko.json         # 한글
│   └── en.json         # 영문
├── App.jsx             # 메인 앱 (라우팅)
└── main.jsx
```

## 주요 기능

### 1. 가이드 관리
- **16개 종합 가이드**: SOP, DECISION, TROUBLE, REFERENCE, RESPONSE, POLICY
- **메타데이터**: 조회수, 유용성, 버전, 작성자, 태그
- **검색**: 동의어 기반 자동 확장 (예: "돈 돌려받기" → "환불")
- **필터링**: 모듈, 유형, 태그별 필터링
- **정렬**: 최신순, 인기순, 도움순, 제목순
- **페이지네이션**: 페이지당 항목 수 커스터마이징

### 2. 사용자 경험
- **다크 모드**: localStorage 지속성 + 시스템 설정 감지
- **국제화 (i18n)**: 한글, 영문 지원
- **반응형 디자인**: 모바일, 태블릿, 데스크톱
- **로딩 상태**: Spinner, Skeleton 컴포넌트
- **AI 챗봇**: 플로팅 UI + 메시지 처리

### 3. 권한 관리 (RBAC)
- **ADMIN**: 모든 기능
- **MANAGER**: 편집, 발행
- **OPERATOR**: 조회만
- **GUEST**: 조회만 (비로그인)

### 4. 성능 최적화
- **Intersection Observer**: 지연 로딩
- **캐시 관리**: 버전 기반 캐시 키
- **번들 분석**: 개발 환경 최적화 도구

## 개발 워크플로우

### 설치
```bash
npm install
```

### 개발 서버 실행
```bash
npm run dev
```
http://localhost:5173에서 접근 가능

### 린트 확인
```bash
npm run lint
```

### 빌드
```bash
npm run build
```

### E2E 테스트
```bash
# 모든 테스트 실행
npm run test:e2e

# UI 모드 (시각적 디버깅)
npx playwright test --ui

# 특정 브라우저
npx playwright test --project=chromium
npx playwright test --project='Mobile Chrome'
```

### 유닛 테스트
```bash
npm run test
```

## 훅 사용 가이드

### useI18n - 국제화
```javascript
import { useI18n, useTranslation, useLanguage } from '@/hooks/useI18n';

function MyComponent() {
  const { t, setLanguage, language } = useI18n();
  // const t = useTranslation(); // 짧은 버전
  
  return (
    <div>
      <p>{t('common.appName')}</p>
      <button onClick={() => setLanguage('en')}>English</button>
    </div>
  );
}
```

### useGuideFilter - 필터링
```javascript
import { useGuideFilter } from '@/hooks/useGuideFilter';

function GuideList({ guides }) {
  const {
    filteredGuides,
    setSearchQuery,
    toggleModule,
    setSortBy,
    clearFilters,
    isFiltered
  } = useGuideFilter(guides);
  
  return (
    <div>
      <input onChange={e => setSearchQuery(e.target.value)} />
      <button onClick={() => toggleModule('회원관리')}>회원관리</button>
      {guides.map(guide => <GuideCard key={guide.id} guide={guide} />)}
    </div>
  );
}
```

### usePagination - 페이지네이션
```javascript
import { usePagination } from '@/hooks/usePagination';

function PaginatedList({ items }) {
  const pagination = usePagination(items, 10); // 10개씩
  
  return (
    <div>
      {pagination.currentItems.map(item => <Item key={item.id} item={item} />)}
      <Pagination pagination={pagination} />
    </div>
  );
}
```

### useDarkMode - 다크 모드
```javascript
import { useDarkMode } from '@/hooks/useDarkMode';

function ThemeToggle() {
  const { isDark, toggle } = useDarkMode();
  return <button onClick={toggle}>{isDark ? '☀️' : '🌙'}</button>;
}
```

## 컴포넌트 개발 체크리스트

새로운 컴포넌트를 추가할 때:

- [ ] Korean 주석 추가
- [ ] Props 검증 (필요시)
- [ ] 다크 모드 지원 (CSS variables 사용)
- [ ] 반응형 디자인 고려
- [ ] 접근성 (a11y) 검사
- [ ] E2E 테스트 추가
- [ ] Storybook 스토리 (선택사항)

## 스타일링 가이드

Tailwind CSS v4 + OKLCH 색상 공간 사용:

### CSS 변수 (index.css)
```css
--color-primary: oklch(...)
--color-surface: oklch(...)
--color-text: oklch(...)
--color-divider: oklch(...)
```

### 다크 모드
```css
/* light mode */
:root {
  --color-text: oklch(...);
}

/* dark mode */
html.dark {
  --color-text: oklch(...);
}
```

## 라우팅 구조

| 경로 | 컴포넌트 | 설명 |
|------|---------|------|
| `/` | HomePage | 홈페이지 (모듈 카드) |
| `/guides` | GuideListPage | 가이드 목록 (필터, 정렬) |
| `/guides/:id` | GuidePage | 가이드 상세 페이지 |
| `/faq` | FaqPage | FAQ |
| `/updates` | UpdatesPage | 업데이트 |
| `/editor` | EditorPage | 에디터 (새 가이드 작성) |
| `/404` | ErrorPage | 404 에러 페이지 |

## 환경 변수

### .env.example
```env
VITE_ENABLE_ANALYTICS=true
VITE_ENV=development
VITE_API_BASE_URL=http://localhost:5173
VITE_APP_VERSION=1.0.0
VITE_CONFLUENCE_EMAIL=your-email
VITE_CONFLUENCE_TOKEN=your-token
```

## 배포

### Vercel (권장)
```bash
vercel deploy
```

### GitHub Pages
`vercel.json` 설정 후 Vercel 자동 배포

## 다음 단계

- [ ] Real LLM 통합 (Claude API)
- [ ] WebSocket 실시간 협업 편집
- [ ] 버전 관리 및 롤백
- [ ] Google Analytics 통합
- [ ] React Native 모바일 앱
- [ ] 다국어 추가 지원 (중문, 일문 등)
- [ ] 시각적 회귀 테스트
- [ ] 성능 모니터링 대시보드

## 문제 해결

### 모듈을 찾을 수 없음
```bash
npm install
npm run build
```

### 포트 5173이 이미 사용 중
```bash
npm run dev -- --port 3000
```

### 린트 에러
```bash
npm run lint -- --fix
```

## 참고 자료

- [React 공식 문서](https://react.dev)
- [Vite 공식 문서](https://vitejs.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Playwright 문서](https://playwright.dev)

---

**Last Updated**: 2026-04-16
**Maintained by**: AMS Wiki Team
