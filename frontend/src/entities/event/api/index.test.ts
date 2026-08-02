import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiFetchMock = vi.hoisted(() => vi.fn())

vi.mock('@/shared/api/client', () => ({ apiFetch: apiFetchMock }))

import { eventsReadApi } from './index'

describe('eventsReadApi.listPublic', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
    apiFetchMock.mockResolvedValue([])
  })

  it('requests all public events when city is not selected', async () => {
    await eventsReadApi.listPublic()
    expect(apiFetchMock).toHaveBeenCalledWith('/api/events/public')
  })

  it('passes the selected FIAS city id to the public catalog', async () => {
    const cityID = '6b849aa8-0782-4c58-bc00-c44f3c72f3ef'
    await eventsReadApi.listPublic(cityID)
    expect(apiFetchMock).toHaveBeenCalledWith(`/api/events/public?city_id=${cityID}`)
  })
})
