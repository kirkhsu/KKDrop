# Repository Guidelines

## Project Structure & Module Organization
- `server.js` hosts the Express + Socket.IO backend, handles file uploads with Multer, and serves the client UI.
- Static assets live in `public/` (`index.html`, client JS/CSS); keep front-end changes here.
- Uploads are written to `uploads/` at runtime; keep it out of commits and clean it when testing large files.
- Build artifacts from `pkg` land in `dist/`; do not edit files there directly.
- Dependencies and packaging settings are defined in `package.json` (see the `pkg` block for binary targets).

## Build, Test, and Development Commands
- `npm install` – install dependencies.
- `npm start` / `npm run dev` – launch the server locally (defaults to port 3000, respects `PORT`).
- `node server.js` – direct start, useful inside packaged environments.
- `pkg .` – produce single-file binaries to `dist/` for the configured platforms.
- `npm test` currently exits with an error placeholder; rely on manual checks until tests are added.

## Coding Style & Naming Conventions
- JavaScript with 4-space indentation; prefer `const`/`let` over `var`.
- Use camelCase for variables, functions, and any new filenames (`fileUploadHandler.js`, not `file_upload_handler.js`).
- Keep server routes and socket events explicit and side-effect free; log meaningful context when handling uploads or messages.
- Document any new environment variables in `README.md` and default them safely.

## Testing Guidelines
- No automated suite yet; perform manual verification: start the server, open two clients, send a file and a message, and download the file.
- If you add tests, co-locate integration tests under `tests/` or `__tests__/`, and name them `*.test.js`.
- For new features, describe manual verification steps in the PR (browsers used, file types, network scenarios).

## Commit & Pull Request Guidelines
- Follow the existing short, imperative style seen in `git log` (e.g., `Fix download logging`, `Add message overlay guard`).
- Keep commits focused (one logical change per commit) and avoid committing files under `uploads/` or `dist/`.
- PRs should include: a concise summary, linked issues, screenshots/GIFs for UI updates, and a checklist of manual tests run.
- Call out any breaking changes, new env vars, or ops impacts (ports, storage paths) in the PR description.

## Security & Configuration Tips
- Filenames are validated server-side; keep any new file operations constrained to `uploads/` and avoid user-controlled paths.
- Do not embed secrets; rely on environment variables for credentials and avoid checking them in.
- When packaging with `pkg`, confirm assets in `public/` remain referenced via relative paths so binaries resolve correctly.
