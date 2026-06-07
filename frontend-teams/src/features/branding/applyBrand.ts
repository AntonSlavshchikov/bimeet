// applyBrandColor overrides the global --color-accent CSS variable at runtime.
// Tailwind v4 utilities (bg-accent, text-accent, …) compile to var(--color-accent),
// so flipping this single variable re-themes the whole app to the company brand.
export function applyBrandColor(color: string | undefined | null) {
  const value = color && /^#[0-9a-fA-F]{3,6}$/.test(color) ? color : null
  if (value) {
    document.documentElement.style.setProperty('--color-accent', value)
  } else {
    document.documentElement.style.removeProperty('--color-accent')
  }
}
