# Sandbox Ark — Non-Pushed Data

## Unpushed Commits

### 8eb4fa9 docs(config): clarify singular/plural precedence wording

**File:** `packages/web/src/content/docs/config.mdx`

```diff
@@ -55,7 +55,7 @@ Config sources are loaded in this order (later sources override earlier ones):
 This means project configs can override global defaults, and global configs can override remote organizational defaults. Managed settings override everything.

 :::note
-The `.opencode` and `~/.config/opencode` directories use **plural names** for subdirectories: `agents/`, `commands/`, `modes/`, `plugins/`, `skills/`, `tools/`, and `themes/`. Legacy singular names (for example, `agent/`) are still supported. If the same-named item exists in both singular and plural locations in the same source directory, the plural location wins.
+The `.opencode` and `~/.config/opencode` directories use **plural names** for subdirectories: `agents/`, `commands/`, `modes/`, `plugins/`, `skills/`, `tools/`, and `themes/`. Singular names (e.g., `agent/`) are also supported for backwards compatibility.
 :::
```

## Unstaged Changes (not committed)

**File:** `AGENTS.md`

```diff
@@ -4,6 +4,19 @@
 - Local `main` ref may not exist; use `dev` or `origin/dev` for diffs.
 - Prefer automation: execute requested actions without confirmation unless blocked by missing info or safety/irreversibility.

+## Git Worktree Gotchas
+
+- Use `git worktree add` (not `create`) — older git versions only have `add`.
+- Worktree branch refs are shared across all worktrees. `git update-ref` in one affects all.
+- Worktree directories can become "prunable zombies" — `git worktree list` shows them but the directory doesn't exist. Always verify with `stat` or `ls -d`.
+- `git update-ref` does NOT update a worktree's HEAD. The worktree stays on the old branch silently. Use `git symbolic-ref HEAD refs/heads/<branch>` to fix, then `git reset --hard`.
+- After manipulating refs, run `git checkout HEAD -- .` in the worktree to sync working files.
+
+## Execution
+
+- `bun test` in a fresh worktree fails with `preload not found "@opentui/solid/preload"` until `bun install` is run.
+- HTTPS git push fails with `could not read Username` — use SSH or pre-authenticated remotes.
+
 ## Style Guide
```

## Project Learnings (AGENTS.md additions)

### Git Worktree Gotchas

- Use `git worktree add` (not `create`) — older git versions only have `add`.
- Worktree branch refs are shared across all worktrees. `git update-ref` in one affects all.
- Worktree directories can become "prunable zombies" — `git worktree list` shows them but the directory doesn't exist. Always verify with `stat` or `ls -d`.
- `git update-ref` does NOT update a worktree's HEAD. The worktree stays on the old branch silently. Use `git symbolic-ref HEAD refs/heads/<branch>` to fix, then `git reset --hard`.
- After manipulating refs, run `git checkout HEAD -- .` in the worktree to sync working files.

### Execution Quirks

- `bun test` in a fresh worktree fails with `preload not found "@opentui/solid/preload"` until `bun install` is run.
- HTTPS git push fails with `could not read Username` — use SSH or pre-authenticated remotes.

## Summary of Paths

1. `packages/opencode/test/tool/write.test.ts` — umask fix (pushed to origin/write-test-umask)
2. `packages/web/src/content/docs/config.mdx` — committed (8eb4fa9), not pushed
3. `AGENTS.md` — unstaged, not committed, not pushed
4. `sandbox-ark.md` — this file, untracked
