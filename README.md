# CodeCoach

A public, no-login DSA practice tool. Paste a problem statement, generate a Java starter template, write your solution, and evaluate it with targeted tests.

## Architecture

- `frontend/`: React + TypeScript + Vite + Monaco Editor; deployed to GitHub Pages.
- `backend/`: Java 21 + Spring Boot API; deployed separately.
- Execution: a separately hosted Judge0 CE instance or equivalent isolated sandbox.
- Problem parsing: a server-side AI provider that returns a validated structured problem specification.

**GitHub Pages is static hosting. It cannot run Spring Boot or compile submitted Java.** The backend and execution service must be deployed separately before Compile/Run can work online.

## Run locally

Frontend:
```bash
cd frontend
npm install
npm run dev
```

Backend (Java 21 and Maven):
```bash
cd backend
mvn spring-boot:run
```

Set `VITE_API_BASE_URL` for the frontend build to the public HTTPS backend URL.

Backend environment variables:
- `AI_BASE_URL`
- `AI_API_KEY`
- `AI_MODEL`
- `JUDGE0_BASE_URL`
- `JUDGE0_AUTH_TOKEN` (if required)

Never put API keys in frontend code or GitHub Pages variables prefixed with `VITE_`.

## Deploy frontend to GitHub Pages

1. In repository Settings → Pages, select **GitHub Actions** as the build and deployment source.
2. Add repository variable `VITE_API_BASE_URL` with the deployed backend URL.
3. Push to `main`; the workflow in `.github/workflows/pages.yml` builds and deploys the frontend.

## MVP status

The first commit provides the website shell, Monaco editor, problem paste workflow, Spring Boot API contracts, and GitHub Pages workflow. AI parsing and sandboxed execution are deliberately not faked: they return clear configuration errors until a real AI provider and Judge0 service are connected.

## Safety and correctness

- Never execute untrusted code inside the Spring Boot process.
- Run all submissions in a sandbox with CPU, wall-time, memory, process, output and network limits.
- Keep hidden tests and expected outputs server-side.
- Validate AI-generated problem specifications and driver templates before execution.
- Use independent reference implementations and differential/property-based tests where possible.
- A finite test suite cannot guarantee every possible edge case.
- Add rate limiting and abuse monitoring before public launch.
