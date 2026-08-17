import { describe, expect, it } from 'vitest'
import { resolveEventTab, withEventTab } from './tab-url'

describe('detail tab query synchronization', () => {
  it('uses a valid deep-linked section and falls back for unavailable sections', () => {
    expect(resolveEventTab('chat', ['participants', 'chat'])).toBe('chat')
    expect(resolveEventTab('changelog', ['participants', 'chat'])).toBe('participants')
  })

  it('writes non-default sections and removes the default section from the URL', () => {
    expect(withEventTab(new URLSearchParams('from=invite'), 'chat').toString()).toBe('from=invite&tab=chat')
    expect(withEventTab(new URLSearchParams('from=invite&tab=chat'), 'participants').toString()).toBe('from=invite')
  })
})
