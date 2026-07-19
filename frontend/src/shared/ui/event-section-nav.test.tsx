import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Bell, Users } from 'lucide-react'
import { TooltipProvider } from './tooltip'
import { EventSectionNav } from './event-section-nav'

describe('EventSectionNav', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
  })

  it('renders ARIA state and badge, then switches section', async () => {
    const onChange = vi.fn()
    await act(async () => root.render(
      <TooltipProvider>
        <EventSectionNav
          label="Sections"
          value="people"
          onChange={onChange}
          options={[
            { key: 'people', label: 'People', icon: Users },
            { key: 'chat', label: 'Chat', icon: Bell, badge: 3 },
          ]}
        />
      </TooltipProvider>,
    ))

    const tabs = container.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    expect(tabs).toHaveLength(2)
    expect(tabs[0].getAttribute('aria-selected')).toBe('true')
    expect(tabs[1].getAttribute('aria-pressed')).toBe('false')
    expect(tabs[1].textContent).toContain('3')

    await act(async () => tabs[1].click())
    expect(onChange).toHaveBeenCalledWith('chat')
  })
})
