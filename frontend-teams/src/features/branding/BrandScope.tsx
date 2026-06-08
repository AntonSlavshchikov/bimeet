import type { CSSProperties, ReactNode } from 'react'

// BrandScope confines the company brand accent to its subtree by setting
// --color-accent inline on a wrapper element instead of the global :root.
// Tailwind utilities (bg-accent, text-accent, …) compile to var(--color-accent)
// and resolve to this scoped value inside the company workspace, while neutral
// screens rendered outside it (company registration, not-found) keep the default
// Indigo from @theme. Passing no color leaves the default untouched.
export function BrandScope({ color, children }: { color?: string | null; children: ReactNode }) {
  const valid = color && /^#[0-9a-fA-F]{3,6}$/.test(color) ? color : undefined
  const style = valid ? ({ '--color-accent': valid } as CSSProperties) : undefined
  // No height of its own — the wrapped screen (h-screen shell / min-h-screen auth
  // card) drives sizing, so this stays layout-neutral.
  return <div style={style}>{children}</div>
}
