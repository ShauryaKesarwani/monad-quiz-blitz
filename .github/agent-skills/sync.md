---
name: sync-md
description: Automatically maintain and update TODO.md and GAME_IDEA based on repository changes, completed work and idea changes.
---

# Skill: Automatic TODO Sync

## Purpose

Continuously maintain the root-level `TODO.md` file so it always reflects:

1. Current implementation status
2. Completed tasks
3. Newly added features
4. Architecture or scope changes
5. Updated site plan

This should happen automatically whenever:
- Code is added
- Features are implemented
- Files are modified
- Architecture changes
- Smart contracts are added/updated
- Game mechanics change
- UI pages are created

No explicit prompt should be required.

---

## Project Context

Project: Category Bomb Arena  
Stack:
- Next.js (App Router)
- Bun
- wagmi + viem
- Monad Testnet (EVM-compatible)
- Smart contracts for predictions
- Real-time multiplayer logic (server authoritative)

---

## Responsibilities

### 1. Detect Feature Completion

If implementation exists for a task listed in `TODO.md`:
- Move task to "Completed"
- Add date completed
- Remove from pending list

Completion is determined by:
- Presence of relevant files
- Working integration
- Contract deployed
- API implemented
- UI wired to logic

---

### 2. Detect New Features

If new files or logic introduce:
- New game mechanics
- New pages
- New contract logic
- New backend endpoints
- New validation rules

Then:
- Add corresponding tasks to `TODO.md`
- Place under appropriate section (Frontend / Backend / Smart Contract / Game Logic)

---

### 3. Maintain Structured TODO Format

`TODO.md` must always contain:

- Project Overview
- Current Architecture Summary
- Active Tasks
- Completed Tasks
- Known Technical Debt
- Next Milestone

Do not allow TODO.md to become unstructured or messy.

---

### 4. Update Site Plan

If routing structure changes (Next.js pages / app routes):
- Update Site Structure section in TODO.md

If smart contract interfaces change:
- Update Contract Integration section

If prediction logic changes:
- Reflect in Game Mechanics section

---

### 5. Never Remove Historical Record

Completed tasks should:
- Be moved to "Completed"
- Not deleted entirely
- Include short summary of what was implemented

---

### 6. Keep MVP Clearly Defined

Always maintain an updated:

## MVP Scope

Mark clearly:
- Implemented
- In progress
- Not started

---

## Formatting Rules

- Use markdown checkboxes for active tasks
- Use dated bullet list for completed tasks
- Keep sections consistent
- No emojis
- Keep professional formatting

---

## Behavior Constraints

- Do not refactor code unless requested.
- Only update TODO.md and planning documentation.
- Do not rewrite unrelated files.
- Keep changes minimal and focused.
- Avoid duplication.

---

## Trigger Conditions

This skill should run automatically when:

- Commits are analyzed
- Pull requests are reviewed
- Files are added or modified
- Game logic changes
- Smart contracts change
- Frontend routes change

---

## Goal

Ensure the repository always has an accurate, up-to-date TODO.md reflecting:

- Current development status
- Project roadmap
- Architecture evolution
- Completed features
- Remaining work

The team should never need to manually update TODO.md.