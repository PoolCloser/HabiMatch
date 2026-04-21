# HabiMatch — Questionnaire Design Overview

> A high-level reference for how the lifestyle questionnaire is structured, what it measures, and how answers feed into the compatibility score.

---

## The core idea

Instead of asking users to label themselves ("are you clean?", "are you social?"), every question is grounded in **real behaviors and scenarios**. This gives us more honest, accurate data to match on.

Each lifestyle domain is measured twice:
- **Behavior** — what the user actually does
- **Tolerance** — what they can live with in a roommate

Both are stored as integers (1–5) and cross-matched in the scoring algorithm. A high behavior score alone isn't enough — the roommate's tolerance also has to align.

---

## Questionnaire structure

The questionnaire has **5 lifestyle domains** plus a short section of hard filters and logistics. Total: ~14 questions.

---

### 1. Sleep & schedule
*2 questions*

- What time do you typically go to sleep on a weeknight? *(behavior)*
- How bothered would you be if a roommate made noise at 1am? *(tolerance)*

**What it reveals:** Natural sleep schedule and sensitivity to nighttime disruption.

---

### 2. Cleanliness
*2 questions*

- How often do you clean shared spaces without being asked? *(behavior)*
- If dishes sat in the sink for 3 days, what would you do? *(tolerance)*

**What it reveals:** Actual cleaning frequency (not self-image) and reaction to mess — two people who both clean infrequently can still be compatible if neither is bothered by it.

---

### 3. Noise & environment
*2 questions*

- What does your home environment usually look like on a Saturday afternoon? *(behavior)*
- How do you feel if a roommate plays music while you're trying to focus? *(tolerance)*

**What it reveals:** Baseline noise level and sensitivity to others' noise. Gets a small scoring bonus when both users work or study from home.

---

### 4. Guests & social
*2 questions*

- How often do you have friends or guests over in a typical month? *(behavior)*
- How would you feel if your roommate had people over 3–4 nights a week? *(tolerance)*

**What it reveals:** How active the shared space tends to be, and how much a roommate's social life would affect daily comfort.

---

### 5. Conflict style
*2 questions*

- If something was bothering you, what would you do? *(direct question)*
- How would a friend describe you as a roommate? *(third-person framing)*

**What it reveals:** How someone handles friction. Matched by similarity — two avoidant people work fine together; a direct + avoidant pairing tends to cause the most issues.

---

### Hard filters & logistics
*~6 questions*

Quick yes/no questions asked upfront — mismatches here disqualify a pair before any scoring runs.

- Do you smoke? / OK living with a smoker?
- Do you have pets? / OK living with pets?
- Do you work or study from home regularly?
- What's your monthly rent budget?
- What's your target move-in date?

---

## How answers become a score

```
Hard filters → if mismatch: score = 0, stop

Otherwise:
  Each domain score = how well A's behavior fits B's tolerance (and vice versa)
  Final score = weighted average across all domains + budget adjustment
```

| Domain | Weight |
|--------|--------|
| Sleep | 25% |
| Cleanliness | 25% |
| Noise | 20% |
| Guests | 20% |
| Conflict style | 10% |

The final score (0.0–1.0) is shown to users with a per-domain breakdown — so a match card can say *"great on sleep and cleanliness, slight difference on guests"* rather than just a number.
