# Notes

## Agent model assignments (JP, 2026-10-28)

Standing rule for every AI agent working on this project (applies to all RapidMX and RapidREST repositories):

General code and review is to be performed with Sonnet 5.5 (`claude-sonnet-5-5`), with architecture, planning and
investigation performed by Opus 5.5 (`claude-opus-5-5`). The following table details specific sub-categories or
specialties.

When categories overlap, the more specific one wins: for example, Security & Performance (Opus) overrides Code and Code
Review (Sonnet) for security and performance topics.

| Kind of work | Model |
|---|---|
| Design (specs, plans, architecture proposals) | Opus 5.5 (`claude-opus-5-5`) |
| Code (implementation, refactoring, evaluation) | Sonnet 5.5 (`claude-sonnet-5-5`) |
| Code Review (finding and verifying defects in diffs or code) | Sonnet 5.5 (`claude-sonnet-5-5`) |
| Security & Performance (analysis, code review, planning) | Opus 5.5 (`claude-opus-5-5`) |
| Simple operations (bash/terminal commands, file operations, project initialization and similar mechanical tasks) | Haiku 5.5 (`claude-haiku-5-5`) |
