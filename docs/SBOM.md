# SBOM 생성 기준

`docs/SBOM.cdx.json`은 `package-lock.json`을 기준으로 npm 11에서 생성한 CycloneDX 1.5 형식의 애플리케이션 SBOM이다.

```bash
npm sbom --package-lock-only --omit dev --sbom-format cyclonedx --sbom-type application > docs/SBOM.cdx.json
```

현재 파일은 배포 런타임 의존성 기준(`--omit dev`)이다. ESLint·Tailwind 같은 개발 도구까지 포함한 전체 SBOM이 필요하면 로컬 `node_modules`를 lockfile과 동기화한 뒤 `--omit dev`를 제거해 다시 생성한다.

SBOM에는 소스 코드, `.env.local`, Supabase URL·키, DeepSeek 키가 포함되지 않는다. `package-lock.json`이 바뀌면 SBOM도 다시 생성해야 한다.

