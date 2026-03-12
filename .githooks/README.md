# Local Git Hooks

This repository uses a local hook path at `.githooks/`.

To enable hooks in your local clone:

```bash
git config --local core.hooksPath .githooks
```

The `pre-commit` hook blocks committing generated/local artifact paths such as:

- `tmp-smoke/`
- `server/uploads/`
- `client/build/`
- `admin-desktop/dist/`
- any `node_modules/` path
