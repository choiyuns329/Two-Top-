# TwoTop Manager - 배포 가이드

## 배포 옵션

### 1. Cloudflare Pages (추천)

**장점:**
- 무료 호스팅
- 자동 HTTPS
- 빠른 글로벌 CDN
- GitHub 연동 자동 배포

**배포 방법:**

1. [Cloudflare Pages](https://pages.cloudflare.com/)에 접속
2. "Create a project" 클릭
3. GitHub 저장소 연결
4. 빌드 설정:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variables: `GEMINI_API_KEY=your_api_key`
5. "Save and Deploy" 클릭

### 2. Vercel

**배포 방법:**

1. [Vercel](https://vercel.com) 접속
2. "Import Project" 클릭
3. GitHub 저장소 선택
4. Environment Variables에 `GEMINI_API_KEY` 추가
5. Deploy 클릭

### 3. Netlify

**배포 방법:**

1. [Netlify](https://netlify.com) 접속
2. "Add new site" > "Import an existing project"
3. GitHub 저장소 선택
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Environment variables에 `GEMINI_API_KEY` 추가
6. Deploy 클릭

### 4. GitHub Pages

**배포 방법:**

```bash
npm run build
npx gh-pages -d dist
```

## 환경 변수 설정

모든 배포 플랫폼에서 다음 환경 변수를 설정해야 합니다:

- `GEMINI_API_KEY`: Google Gemini API 키 (https://aistudio.google.com/apikey)

## 로컬 테스트

배포 전 로컬에서 프로덕션 빌드를 테스트:

```bash
npm run build
npm run preview
```
