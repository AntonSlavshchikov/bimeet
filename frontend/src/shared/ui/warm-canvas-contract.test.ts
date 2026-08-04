import { describe, expect, it } from 'vitest'
import layout from '@/widgets/layout/index.tsx?raw'
import bottomNav from '@/widgets/layout/BottomNav.tsx?raw'
import eventSectionContent from '@/shared/ui/event-section-content.tsx?raw'
import eventSectionNav from '@/shared/ui/event-section-nav.tsx?raw'

const sourceModules = import.meta.glob('/src/**/*.{css,ts,tsx}', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

describe('Warm Canvas structural contract', () => {
  it('defines every referenced brand color variable', () => {
    const source = Object.values(sourceModules).join('\n')
    const referenced = new Set(Array.from(source.matchAll(/var\(--color-(brand-[a-z0-9-]+)\)/g), match => match[1]))
    const defined = new Set(['brand-a', 'brand-b', 'brand-c'])
    expect([...referenced].filter(token => !defined.has(token))).toEqual([])
    expect([...referenced].sort()).toEqual([...defined].sort())
  })

  it('keeps mobile, tablet and desktop shell visibility classes explicit', () => {
    expect(layout).toContain('min-[761px]:flex-row')
    expect(layout).toContain('min-[761px]:w-[200px]')
    expect(layout).toContain('min-[1081px]:w-[220px]')
    expect(layout).toContain('min-[1081px]:w-[276px]')
    expect(layout).toContain('min-[1081px]:flex')
    expect(bottomNav).toContain('min-[761px]:hidden')
  })

  it('keeps modern and dashboard shell variants explicit', () => {
    expect(layout).toContain("design === 'dashboard'")
    expect(layout).toContain("'justify-center p-3 lg:p-5'")
    expect(layout).toContain("'app-shell-shadow rounded-[20px] border border-line'")
    expect(layout).toContain('DASHBOARD_BACKGROUND')
  })

  it('keeps event sections aligned to the 760px reference breakpoint', () => {
    expect(eventSectionNav).toContain('min-[761px]:flex-row')
    expect(eventSectionNav).toContain('min-[761px]:px-6')
    expect(eventSectionContent).toContain('min-[761px]:grid-cols-3')
    expect(eventSectionContent).toContain('min-[761px]:grid-cols-[36px_minmax(0,1fr)_auto]')
  })
})
