# AMS Wiki - 배포 가이드

## 개요

이 프로젝트는 완벽한 shadcn/ui 컴포넌트 라이브러리 통합을 통해 Vercel로 자동 배포되도록 설정되었습니다. 배포 파이프라인에는 자동 빌드, 린팅 및 환경 변수 관리가 포함됩니다.

## 필수 요구사항

- Node.js 18 이상 설치 필요
- npm 설치 필요
- Vercel 계정 (vercel.com)
- GitHub 계정

## 로컬 개발 환경

### 설정

1. **저장소 복제**
   ```bash
   git clone https://github.com/layr8x/sdij-wiki.git
   cd sdij-wiki
   ```

2. **의존성 설치**
   ```bash
   npm install
   ```

3. **환경 변수 설정**
   ```bash
   cp .env.example .env.local
   ```
   
   Confluence 자격증명으로 `.env.local` 수정:
   - `VITE_CONFLUENCE_EMAIL`: 귀하의 Atlassian 이메일
   - `VITE_CONFLUENCE_TOKEN`: https://id.atlassian.com/manage-profile/security/api-tokens에서 발급받은 API 토큰

4. **개발 서버 시작**
   ```bash
   npm run dev
   ```
   앱이 `http://localhost:5173`에서 사용 가능합니다.

### 사용 가능한 스크립트

- `npm run dev` - HMR을 포함한 개발 서버 시작
- `npm run build` - 프로덕션용 빌드
- `npm run lint` - ESLint 실행
- `npm run preview` - 프로덕션 빌드를 로컬에서 미리보기

## Vercel 배포

### 초기 설정

1. **GitHub 저장소를 Vercel에 연결**
   - https://vercel.com으로 이동
   - "New Project" 클릭
   - GitHub 저장소 선택 (layr8x/sdij-wiki)
   - 프로젝트 설정 구성:
     - Framework: Vite
     - Build command: `npm run build`
     - Output directory: `dist`

2. **Vercel에서 환경 변수 설정**
   - Vercel의 프로젝트로 이동: https://vercel.com/layr8xs-projects/sdij-wiki
   - "Settings" → "Environment Variables" 클릭
   - 다음 환경 변수 추가:
     - **Name**: `VITE_CONFLUENCE_EMAIL` | **Value**: 귀하의 Atlassian 이메일 (예: your-email@hiconsy.com)
     - **Name**: `VITE_CONFLUENCE_TOKEN` | **Value**: https://id.atlassian.com/manage-profile/security/api-tokens에서 발급받은 API 토큰
   - 둘 다 **Production**, **Preview**, **Development**에서 사용 가능하도록 설정
   - "Save" 클릭 후 다시 배포하여 변경사항 적용

3. **배포 브랜치 구성**
   - 프로덕션 배포: main (vercel.json에서 비활성화됨)
   - 프리뷰/개발: claude/* 브랜치 (활성화됨)

### 자동 배포

프로젝트는 `vercel.json`을 사용하여 자동 배포를 구성합니다:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "git": {
    "deploymentEnabled": {
      "main": false,
      "claude/*": true
    }
  }
}
```

**다음 브랜치로 푸시 시 배포:**
- `claude/*`와 일치하는 브랜치 (예: `claude/setup-deployment-shadcn-Kx1RH`)

**다음의 경우 건너뜀:**
- `main` 브랜치 (프로덕션으로의 제어된 병합)

### 수동 배포

Vercel에 브랜치를 수동으로 배포하려면:

```bash
npm install -g vercel
vercel --prod
```

### 프로덕션 배포

main 브랜치에 프로덕션 배포:

1. feature 브랜치에서 main으로 풀 요청 생성
2. 검토 및 승인 후 main으로 병합
3. 릴리스 태그 생성:
   ```bash
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```

## GitHub Actions CI/CD

프로젝트는 GitHub Actions를 통한 자동화된 CI/CD를 포함합니다 (`.github/workflows/deploy.yml`):

### 워크플로우 트리거

- `claude/*` 브랜치로 푸시
- `claude/*` 브랜치로의 풀 요청

### 워크플로우 단계

1. **코드 체크아웃** - 저장소 가져오기
2. **Node.js 설정** - Node 18을 npm 캐싱으로 설치
3. **의존성 설치** - `npm ci` 실행
4. **린팅 실행** - ESLint 실행 (차단하지 않음)
5. **프로젝트 빌드** - 환경 변수와 함께 `npm run build` 실행
6. **Vercel로 배포** - Vercel로 자동 배포

### 필수 GitHub 시크릿

GitHub 저장소 설정에서 다음 시크릿 설정:

- `VERCEL_TOKEN` - https://vercel.com/account/tokens의 토큰
- `VERCEL_ORG_ID` - Vercel의 조직 ID
- `VERCEL_PROJECT_ID` - Vercel의 프로젝트 ID
- `VITE_CONFLUENCE_EMAIL` - Atlassian 이메일 (선택사항, Vercel 환경 변수에도 설정 가능)
- `VITE_CONFLUENCE_TOKEN` - API 토큰 (선택사항, Vercel 환경 변수에도 설정 가능)

### Vercel 자격증명 얻기

1. **VERCEL_TOKEN**
   - https://vercel.com/account/tokens로 이동
   - "Create Token" 클릭
   - 적절한 범위 선택
   - 토큰 복사

2. **VERCEL_ORG_ID & VERCEL_PROJECT_ID**
   - Vercel의 프로젝트로 이동
   - "Settings" 로 이동
   - "Project ID" 찾아 복사
   - Settings > General에서 "Org ID" 찾기

## 컴포넌트 라이브러리

프로젝트는 포괄적인 shadcn/ui 컴포넌트 라이브러리를 포함합니다:

### 사용 가능한 컴포넌트

- **Button** - 변형 가능한 버튼
- **Card** - 호버 상태를 가진 컨테이너 컴포넌트
- **Badge** - 여러 변형을 가진 레이블 컴포넌트
- **Input** - 텍스트 입력 필드
- **Textarea** - 다중 라인 텍스트 입력
- **Checkbox** - 체크박스 입력
- **Radio** - 라디오 버튼 입력
- **Select** - 드롭다운 선택
- **Label** - 폼 레이블
- **Dialog** - 모달 다이얼로그 (Radix UI)
- **Tabs** - 탭 네비게이션 (Radix UI)
- **Tooltip** - 툴팁 컴포넌트 (Radix UI)
- **ScrollArea** - 스크롤 가능한 영역 (Radix UI)
- **Alert** - 알림 메시지 컴포넌트
- **Separator** - 구분선

### 컴포넌트 사용

컴포넌트 라이브러리에서 임포트:

```jsx
import { Button, Input, Dialog, DialogContent } from '@/components/ui'

function MyComponent() {
  return (
    <div>
      <Input placeholder="텍스트 입력" />
      <Button variant="primary">클릭하기</Button>
    </div>
  )
}
```

## 보안

### API 토큰 관리

- 자격증명이 포함된 `.env.local` 또는 유사 파일을 **절대 커밋하지 마세요**
- 템플릿으로 `.env.example` 사용
- 시크릿을 Vercel 환경 변수에 저장
- CI/CD 파이프라인에는 GitHub 시크릿 사용

### 모범 사례

1. API 토큰을 정기적으로 회전
2. 최소 권한의 원칙 사용
3. API 사용 및 접근 로그 모니터링
4. 의존성 최신 상태 유지

## 문제 해결

### 빌드 실패

1. Node 버전 확인: `node --version` (18 이상이어야 함)
2. 캐시 정리: `rm -rf node_modules package-lock.json && npm install`
3. `.env.local`에서 환경 변수 확인
4. Vercel 대시보드에서 빌드 로그 검토

### 배포 문제

1. Vercel 프로젝트 설정 확인
2. Vercel 대시보드에서 환경 변수 확인
3. GitHub Actions 워크플로우 로그 검토
4. 브랜치 보호 규칙 확인

### 환경 변수가 로드되지 않음

1. 로컬에서 `.env.local` 존재 확인
2. Vercel 대시보드에서 변수명 확인
3. 변수명의 오타 확인
4. 새 변수 추가 후 재배포

## 유용한 링크

- [Vercel 문서](https://vercel.com/docs)
- [Vite 문서](https://vitejs.dev/)
- [shadcn/ui 문서](https://ui.shadcn.com/)
- [Tailwind CSS 문서](https://tailwindcss.com/)
- [GitHub Actions 문서](https://docs.github.com/en/actions)

## 지원

문제 또는 질문이 있을 경우:
1. Vercel 또는 GitHub Actions의 배포 로그 확인
2. 오류 메시지 주의 깊게 검토
3. 위의 문서 링크 참조
4. 개발팀에 문의
