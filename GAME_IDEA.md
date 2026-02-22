# 💣 Category Bomb Arena – Game Design Plan

## Overview

**Category Bomb Arena** is a fast-paced, multiplayer, elimination-style word game built for Farcaster.

Players take turns submitting valid answers within a category while a ticking bomb timer accelerates. Constraints increase over time, categories switch on eliminations, and players can predict outcomes before the match begins.

The goal is to create a high-tension, replayable, social-first experience optimized for short rounds and viral engagement.

---

# 🎯 Core Objectives

* Fast-paced tension building
* Multiple valid answers (avoid binary quiz style)
* Social interaction + predictions
* Short match duration (2–5 minutes)
* Scalable into staking / onchain mechanics later

---

# 🧩 Core Mechanics

## 1️⃣ Category-Based Answers

* A category is revealed at the start.
* Players must submit a valid answer within that category.
* No repeated answers allowed.
* Example categories:

  * Crypto tokens
  * Animals that can swim
  * Startup buzzwords
  * Programming languages
  * Things found in a backpack

---

## 2️⃣ Time-Limited Turns

* Each player has limited time to respond.
* Initial timer: 8–10 seconds.
* Timer reduces gradually each full round.

Example progression:

* Round 1: 8s
* Round 2: 7.5s
* Round 3: 7s
* Continues decreasing

If timer hits zero → player explodes (eliminated).

---

## 3️⃣ Banned Letter Constraint

At a certain stage (e.g., when 50% players remain):

* A letter becomes banned.
* Players cannot use that letter in their answer.
* If used → instant elimination.

Example:

* Category: “Animals”
* Banned letter: “E”
* “Zebra” → invalid
* “Lion” → valid

---

## 4️⃣ Blitz Mode (Random Chaos Event)

At random intervals:

⚡ BLITZ MODE ACTIVATED

* Timer drops drastically (e.g., 2–3 seconds).
* Lasts for 2–3 turns.

Purpose:

* Shock factor
* Increase panic
* Clip-worthy moments

---

## 5️⃣ Category Switch on Explosion

When a player explodes:

* Category instantly switches.
* Banned letter may change.
* Timer does NOT fully reset (keeps tension high).

This prevents relaxation after eliminations.

---

## 6️⃣ Acceleration System

Game naturally becomes harder:

* Timer reduces over time.
* Constraints stack.
* Fewer players → more pressure.

Endgame should feel chaotic and fast.

---

# 🪙 Prediction Phase (Pre-Game Meta Layer)

Before match starts (30 sec lobby):

Players can predict:

* 🏆 Who will win
* 💀 Who will explode first

Scoring example:

* Correct winner: +3
* Correct first elimination: +2
* Wrong prediction: -1

Purpose:

* Adds spectator engagement
* Encourages rivalries
* Enables staking later

---

# 🧠 Optional Advanced Features (Future Iterations)

These are NOT required for MVP but can be added later:

### Power Moves (1 per game)

* Skip turn
* Force category change
* Add second banned letter
* Reverse bomb direction

### Chaos Card

* Everyone answers simultaneously.
* Slowest response eliminated.

### Hidden Constraint

* System secretly enforces a rule (e.g., max 7 letters).
* If violated → instant elimination.

---

# 🔒 Anti-Cheat Design

Since game runs on Farcaster:

* Short timers prevent Googling.
* No copy-paste allowed.
* Words must be typed fresh.
* Basic dictionary validation API.

Speed > knowledge.

---

# 🎮 Match Flow Summary

### Phase 1 – Prediction Lobby

* 30 sec
* Players place predictions

### Phase 2 – Normal Mode

* Category revealed
* Standard timer
* No repeats

### Phase 3 – Acceleration

* Timer reduces
* Banned letter introduced

### Phase 4 – Blitz Events

* Random ultra-fast rounds

### Endgame

* Rapid eliminations
* Last player survives
* Prediction rewards calculated

---

# 📈 Design Principles

* High tension
* Low cognitive complexity
* Short match duration
* Social-first interaction
* Replayable
* Spectator-friendly

---

# 🚀 MVP Scope (Hackathon Version)

Must Have:

* Category system
* Timer
* Elimination
* No repeats
* Category switch on explosion

Nice to Have:

* Banned letter
* Blitz mode
* Prediction system

Future:

* Staking
* Leaderboards
* Token rewards
* Power-ups

---

# 🏁 Vision

This is not just a word game.

It is a:

* Social survival arena
* High-pressure micro-competition
* Farcaster-native viral game format
* Expandable into onchain prediction & staking mechanics