import { describe, expect, it } from 'vitest'
import { describeUserAgent } from './device'

describe('describeUserAgent', () => {
  it('recognizes Chrome on Windows', () => {
    expect(describeUserAgent('Mozilla/5.0 (Windows NT 10.0) Chrome/124.0 Safari/537.36')).toEqual({
      browser: 'Chrome',
      os: 'Windows',
      kind: 'desktop',
    })
  })

  it('recognizes Safari on iPhone', () => {
    expect(describeUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4) Version/17.4 Mobile/15E148 Safari/604.1')).toEqual({
      browser: 'Safari',
      os: 'iOS',
      kind: 'mobile',
    })
  })

  it('falls back for an absent user agent', () => {
    expect(describeUserAgent('')).toEqual({
      browser: 'Browser',
      os: 'Unknown device',
      kind: 'desktop',
    })
  })
})
