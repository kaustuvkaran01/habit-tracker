# Project guardrails

The previous M1 implementation was explicitly cancelled and rolled back on 5 November 2026. The retained product and implementation documents are references, not authorisation to restart their tasks. Agree on a fresh, bounded first step with the user before implementing again.

## Scope and approval

- Work inside this project directory. Do not modify the user's system, home configuration or other projects without explicit approval for the specific change.
- Before adding dependencies, state the packages, why they are needed and whether they are local or global. Obtain explicit approval before installing them. Prefer tools already available.
- Never install or upgrade global tools, package managers, SDKs, runtimes, CocoaPods, Java, Homebrew components or emulator images without specific advance approval. Explain expected download/storage impact and alternatives first.
- Do not create, boot or alter simulators/emulators, run native builds, or launch long-running development servers without specific advance approval. A request to implement a milestone is not approval for these actions.
- Do not create accounts, hosted projects, cloud builds, paid services or store records without explicit approval. Do not push or publish without explicit instructions.

## Execution

- Start each agreed step with a short scope: intended files, allowed checks, expected resource use and stopping point.
- Implement only that step. Do not automatically proceed into later milestones or provision missing prerequisites.
- Use lightweight checks with existing tools by default. If a check needs a missing tool or substantial download/build, report that dependency and wait for approval instead of installing it.
- Keep changes reviewable. Do not generate a large scaffold, extra tooling, instruction files or dependencies merely because a generator recommends them.
- At completion, report actual changes, checks run, limitations and running processes. Do not mark a milestone complete when required checks remain unverified.

## Reversibility

- Track every approved external installation/change and its exact location so it can be undone.
- Avoid shared caches and system configuration. Never delete shared directories wholesale as cleanup.
- Stop project-owned background processes when finished unless the user asks to keep them running.
- Preserve existing work. Ask before discarding changes that cannot be confidently attributed to this project/task.
