-- Bimeet for Teams — изолированная схема (docs/company.md, Этап 33).
-- Компания — граница всего: учётки, бренд, инвайты живут внутри company_id.

CREATE TABLE companies (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    subdomain   TEXT NOT NULL UNIQUE,
    brand_color TEXT NOT NULL DEFAULT '#4F46E5',
    logo_url    TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Один email может существовать в разных компаниях независимо — поэтому
-- уникальность по паре (company_id, email), а не по email глобально.
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email         TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    name          TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('owner', 'member')),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, email)
);

CREATE INDEX idx_users_company ON users(company_id);

-- Приглашения сотрудников: owner создаёт запись, сотрудник по токену ставит пароль.
CREATE TABLE invitations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    token_hash  TEXT NOT NULL,
    invited_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    accepted_at TIMESTAMPTZ,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invitations_company ON invitations(company_id);
CREATE INDEX idx_invitations_token ON invitations(token_hash);
