// slugify mirrors the backend's company-name → subdomain rule (see
// service/auth/service.go) so the registration form can preview the address the
// company will get. The backend stays the source of truth and may append a
// numeric suffix on collision, so this is a best-effort preview of the base.
const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh',
  з: 'z', и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c',
  ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

const MAX_BASE_LEN = 24

export function slugify(name: string): string {
  const lower = name.toLowerCase().trim()
  let out = ''
  for (const ch of lower) {
    if (ch in TRANSLIT) {
      out += TRANSLIT[ch]
    } else if (/[a-z0-9]/.test(ch)) {
      out += ch
    } else {
      out += '-'
    }
  }
  const slug = out.split('-').filter(Boolean).join('-')
  return slug.length > MAX_BASE_LEN ? slug.slice(0, MAX_BASE_LEN).replace(/-+$/, '') : slug
}
