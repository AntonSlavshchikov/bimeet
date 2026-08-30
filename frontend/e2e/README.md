# Passkey E2E

The passkey scenario expects the normal local frontend and backend to be
running. Enable these backend settings in `backend/.env`:

```dotenv
AUTH_TEST=true
PASSKEY_ENABLED=true
WEBAUTHN_RP_ID=localhost
WEBAUTHN_RP_ORIGINS=http://localhost:5173
WEBAUTHN_RP_DISPLAY_NAME=Bimeet
PASSKEY_CREDENTIAL_ENCRYPTION_KEY=<base64-encoded 32-byte key>
```

Generate the encryption key with `openssl rand -base64 32`, install Chromium
once with `npx playwright install chromium`, then run:

```bash
npm run test:e2e:passkeys
```

Use `PLAYWRIGHT_BASE_URL` and `PLAYWRIGHT_API_URL` when the frontend or backend
is served from a different local URL. The test uses Chromium's virtual CTAP2
authenticator and does not open a real platform passkey prompt.
