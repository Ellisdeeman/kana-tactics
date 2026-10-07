# Kana Tactics

A one-map tactical RPG for learning JLPT N5 Japanese. Fight on an isometric grid, spend your turn on a move plus an attack, an ability, or a wait, and answer a reading prompt whenever you use an ability. It is a static site: no server, no account. Progress stays in the browser.

Play it at **https://ellisdeeman.github.io/kana-tactics/**

## How to play

Ren (Squire), Mina (Chemist), and Sou (Black Mage) face a goblin, an archer, and an imp. Speed fills a turn gauge; the unit who reaches 100 acts, then their gauge drops. On your turn, walk the gold tiles (up to your move), then:

- **Attack** — a basic strike. No Japanese prompt.
- **Ability** — opens a prompt. Pick the reading, or type it in romaji or kana.
- **Wait** — end the turn.

The answer sets the effect:

| Answer | Time | Effect |
| --- | --- | --- |
| Correct | 4 seconds or less | Critical (double) |
| Correct | Slower than 4 seconds | Half strength |
| Wrong, or 30 seconds with no answer | — | The action fizzles |

Defeat every enemy to win. If the party falls, you lose. The same battle can go either way: solid readings finish enemies quickly, and fizzled spells give the enemy free turns.

Phone and desktop both work. Tap tiles and the large action buttons. On a keyboard, 1–4 picks a choice and Enter submits what you typed.

### Jobs

| Hero | Job | Prompts |
| --- | --- | --- |
| レン Ren | Squire | Hiragana (切り込み), and hiragana-only N5 words (号令) |
| ミナ Mina | Chemist | Katakana (カタカナ投げ), and katakana loanwords such as コーヒー (ポーション) |
| ソウ Sou | Black Mage | N5 kanji such as 火 水 木 (火 / 水), and N5 words written with kanji (詠唱) |

A scheduler picks the actual item, so 火 is not always the character 火 — it is whichever kanji is due.

## Spaced repetition

Reviews use [SM-2](https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-obtained-in-working-with-the-supermemo-method). A critical answer is quality 5, a slow correct answer is quality 3, and a miss is quality 1. The ease factor and interval update with the classic formula (1 day, then 6 days, then interval × ease). A miss is due again in 20 seconds so it can return before the battle ends; that short step is the only departure from textbook SM-2.

New kana start with the gojūon, then dakuten, then yōon. Imported **weak** words are five times as likely to appear. **Known** words that are not due yet are much less likely. Weak words are mixed into every vocabulary ability, even when they are outside that job's usual subset.

Everything is stored under the localStorage key `kana-tactics.v1`.

## Word ids

Vocabulary prompts use the JLPT Vocab Quest N5 list, ids **0 through 717**. An id is the index into that app's `data.json` (`jp`, `kana`, `en`), the same order as the list on [n5-vocab-quest](https://github.com/Ellisdeeman/n5-vocab-quest) (live at [ellisdeeman.github.io/n5-vocab-quest](https://ellisdeeman.github.io/n5-vocab-quest)). Id 250 is コーヒー. Kana and kanji ids are the character itself (`あ`, `ア`, `火`), at most 8 characters. The copied list and its licenses are noted in [data/NOTICE.txt](data/NOTICE.txt).

## File formats

### Export results

**Export results** downloads every prompt answered since the previous export. The count next to the button (`42 results since last export`) is that queue. Answers accumulate across battles and stay in `localStorage` (`kana-tactics.v1`, field `results`) when the tab closes or the page reloads. The queue is cleared only after the browser accepts the download. An empty queue does not download a file. One file holds 1–5000 results; anything past 5000 stays queued for the next export. SRS progress is not cleared.

```json
{
  "source": "kana-tactics",
  "date": "2026-10-07T12:00:00.000Z",
  "results": [
    { "id": 250, "type": "vocab", "correct": true, "ms": 1800 },
    { "id": "あ", "type": "kana", "correct": false, "ms": 4200 },
    { "id": "火", "type": "kanji", "correct": true, "ms": 2100 }
  ]
}
```

- `source` is exactly `"kana-tactics"`.
- `date` is an ISO-8601 timestamp, different on every export (a later export in the same millisecond is bumped by 1 ms).
- `results` has 1 to 5000 objects.
- `id` is an integer word id for `vocab` (the `data.json` index), or the kana/kanji character (a string of 1–8 characters).
- `type` is `vocab`, `kana`, or `kanji`.
- `correct` is a boolean. It is true for both critical and slow-but-correct answers. A fizzle is false.
- `ms` is an integer from 0 to 3600000. Faster or slower answers are clamped into that range. A timeout is 30000.

Basic attacks do not add a result.

### Progress import / export

**Export progress** downloads every item that has been reviewed. **Import progress** merges by `type` + `id` and does not delete reviews that are missing from the file.

```json
{
  "version": 1,
  "source": "kana-tactics",
  "exported": "2026-10-07T12:00:00.000Z",
  "items": [
    {
      "id": 250,
      "type": "vocab",
      "japanese": "コーヒー",
      "reading": "コーヒー",
      "meaning": "coffee",
      "srs": {
        "ease": 2.6,
        "intervalDays": 1,
        "reps": 1,
        "due": "2026-10-08T12:00:00.000Z",
        "lapses": 0
      },
      "correct": 1,
      "incorrect": 0
    },
    {
      "id": "あ",
      "type": "kana",
      "japanese": "あ",
      "reading": "a",
      "meaning": "hiragana a",
      "srs": {
        "ease": 2.3,
        "intervalDays": 0,
        "reps": 0,
        "due": "2026-10-07T12:00:20.000Z",
        "lapses": 1
      },
      "correct": 0,
      "incorrect": 1
    }
  ]
}
```

`reading` is romaji for kana, the primary kana reading for kanji, and the dictionary reading for vocabulary. `srs.due` is ISO-8601 (a number of epoch milliseconds is also accepted on import). `correct` and `incorrect` are lifetime counts.

### Import study list

**Import study list** reads the file JLPT Vocab Quest exports for this game and weights prompts toward weak words. It does not overwrite SRS cards. `weak` is a subset of `known`: a weak word is still known, and it is the one that shows up more often. Ids outside 0–717, and anything that is not an integer, are skipped. Any other fields on the object are ignored.

```json
{
  "app": "jlpt-vocab-quest",
  "v": 1,
  "date": "2026-10-07T12:00:00.000Z",
  "known": [0, 1, 12, 48, 250],
  "weak": [12, 48]
}
```

- `app` is exactly `"jlpt-vocab-quest"` and `v` is `1`.
- `date` is an ISO-8601 timestamp from the study app. This game does not use it for scheduling.
- `known` and `weak` are arrays of integer indexes into the app's N5 `data.json` (fields `jp`, `kana`, `en`).

## Develop

```bash
npm test
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173/`. Tests cover romaji, SM-2, the export formats, weak-word weighting, and full battles that can be won or lost.

GitHub Actions deploys the repository root to GitHub Pages on every push to `main` (`.github/workflows/pages.yml`). The first time, set the repository’s Pages source to **GitHub Actions**. After that, the site is https://ellisdeeman.github.io/kana-tactics/.
