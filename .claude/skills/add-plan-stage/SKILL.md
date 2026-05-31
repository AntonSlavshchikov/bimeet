---
name: add-plan-stage
description: Append a new numbered stage ("Этап N") to docs/plan.md for the bimeet project, continuing the sequential numbering and matching the existing stage format. Use when the user says "запиши этап", "попланируем этап N", "добавь этап в план", "new plan stage", or asks to record a planned piece of work in the roadmap.
---

# Add plan stage

Project work is tracked as sequentially numbered stages in `docs/plan.md`.

## Steps
1. **Find the next number**: `grep -n '^## Этап' docs/plan.md`. Take `max(N) + 1`. The file is **not** strictly ordered and has a duplicate (Этап 17 twice) — rely on the maximum, not the last line.
2. **Append to the END** of `docs/plan.md` a new section in this shape:
   ```markdown
   ---

   ## Этап N — <Краткое название>

   ### Контекст

   <Зачем это нужно: проблема/потребность и желаемый результат.>

   ### <Разделы по сути>

   <Таблицы «файл → изменение», блоки Backend/Frontend, дизайн-решения — как в соседних этапах.>

   ### Чеклист

   - [ ] пункт
   - [ ] пункт
   ```
3. **Match the surrounding style**: Russian prose, `## Этап N — Title` header, a «Контекст» subsection, file-change tables (`| Файл | Изменение |`), and a `- [ ]` checklist. Skim the previous 2–3 stages for tone and granularity before writing.
4. Keep it scannable but executable: name the concrete files to touch and reuse existing utilities/patterns.

## Note
This is a planning artifact, not implementation — only edit `docs/plan.md` unless the user also asks to implement. See the project memory note `plan-stages-convention` for the numbering quirk.
