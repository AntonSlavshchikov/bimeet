---
name: i18n-sync
description: Add, update, or audit i18n strings in the bimeet frontend, keeping ru.json and en.json structurally identical. Use when adding user-facing text, introducing a new translation key, or checking for missing/untranslated keys ("добавь перевод", "новый i18n ключ", "локализуй строку", "find missing translations", "ru/en рассинхрон"). Library: i18next + react-i18next.
---

# i18n sync

Two locale files must stay structurally identical (same keys, same nesting):
- `frontend/src/shared/i18n/locales/ru.json`
- `frontend/src/shared/i18n/locales/en.json`

Keys are grouped by domain section: `common`, `auth`, `nav`, `layout`, `events`, `eventCard`, `eventForm`, `eventInfo`, `notifications`, `invite`, `tabs`, `participants`, `collections`, `polls`, `items`, `carpools`, `links`, `profile`, …

## Adding a key
1. Decide the section (reuse an existing one; create a new section only for a genuinely new domain).
2. Add the key to **both** files at the same path — RU value in Russian, EN value in English. Never add to only one file.
3. Use it in the component via `const { t } = useTranslation()` → `t('section.key')`. No hardcoded literals in JSX.

## Auditing sync (find drift)
Compare the key sets of both files. Quick check from `frontend/`:
```bash
diff <(jq -r 'paths(scalars) | join(".")' src/shared/i18n/locales/ru.json | sort) \
     <(jq -r 'paths(scalars) | join(".")' src/shared/i18n/locales/en.json | sort)
```
Lines with `<` exist only in ru, `>` only in en. Reconcile every difference. Also flag EN values that are still Russian (copy-paste leftovers) and vice-versa.

## Verify
`cd frontend && npm run build` (and visually confirm both languages render via the RU↔EN toggle in the layout TopBar).
