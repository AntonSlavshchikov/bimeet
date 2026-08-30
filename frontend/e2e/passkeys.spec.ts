import { expect, test } from '@playwright/test'

test('email login → passkey CRUD/login → email fallback', async ({ page, context }) => {
  const cdp = await context.newCDPSession(page)
  await cdp.send('WebAuthn.enable')
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  })

  const email = `passkey-e2e-${Date.now()}@example.com`
  await emailLogin(page, email)

  await page.goto('/profile?tab=security')
  await page.getByRole('button', { name: 'Добавить passkey' }).click()
  await page.getByPlaceholder('Например, MacBook').fill('E2E passkey')
  await page.getByRole('button', { name: 'Сохранить' }).click()
  await expect(page.getByText('E2E passkey', { exact: true })).toBeVisible()

  await logoutThroughAPI(page)
  await page.goto('/login')
  await page.getByRole('button', { name: 'Войти с passkey' }).click()
  await expect(page).toHaveURL(/\/events/)

  await page.goto('/profile?tab=security')
  await page.getByRole('button', { name: 'Переименовать passkey' }).click()
  const nameInput = page.getByPlaceholder('Например, MacBook')
  await nameInput.fill('Chromium CTAP2')
  await page.getByRole('button', { name: 'Сохранить' }).click()
  await expect(page.getByText('Chromium CTAP2', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Удалить passkey' }).click()
  await page.getByRole('button', { name: 'Удалить', exact: true }).click()
  await expect(page.getByText('Passkey пока нет')).toBeVisible()

  await logoutThroughAPI(page)
  await page.goto('/login')
  await emailLogin(page, email)

  await cdp.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId })
})

async function emailLogin(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByRole('button', { name: 'Получить код' }).click()
  const firstCodeCell = page.getByRole('group', { name: 'Код подтверждения' }).locator('input').first()
  await firstCodeCell.focus()
  await page.keyboard.type('120401')
  await expect(page).toHaveURL(/\/events/)
}

async function logoutThroughAPI(page: import('@playwright/test').Page) {
  const apiURL = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:8080'
  await page.evaluate(async backendURL => {
    await fetch(`${backendURL}/api/auth/logout`, { method: 'POST', credentials: 'include' })
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }, apiURL)
}
