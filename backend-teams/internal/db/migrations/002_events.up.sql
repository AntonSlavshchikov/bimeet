-- Bimeet for Teams — деловые встречи (docs/company.md, Этап 34).
-- Всё скоупится по company_id: встречи видят только сотрудники своей компании.
-- Без сборов/попуток/«что принести» — только B2B-набор.

CREATE TABLE events (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    date_start   TIMESTAMPTZ NOT NULL,
    date_end     TIMESTAMPTZ NOT NULL,
    location     TEXT NOT NULL DEFAULT '',
    meeting_url  TEXT NOT NULL DEFAULT '',
    status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_events_company ON events(company_id);
CREATE INDEX idx_events_organizer ON events(organizer_id);

CREATE TABLE event_participants (
    id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status   TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'confirmed', 'declined')),
    UNIQUE (event_id, user_id)
);
CREATE INDEX idx_event_participants_event ON event_participants(event_id);
CREATE INDEX idx_event_participants_user ON event_participants(user_id);

CREATE TABLE event_links (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    url        TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_event_links_event ON event_links(event_id);

CREATE TABLE polls (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    question   TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_polls_event ON polls(event_id);

CREATE TABLE poll_options (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    label   TEXT NOT NULL
);
CREATE INDEX idx_poll_options_poll ON poll_options(poll_id);

CREATE TABLE poll_votes (
    poll_option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    poll_id        UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    PRIMARY KEY (poll_id, user_id)
);

CREATE TABLE event_change_logs (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    old_value  TEXT NOT NULL DEFAULT '',
    new_value  TEXT NOT NULL DEFAULT '',
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_event_change_logs_event ON event_change_logs(event_id);

CREATE TABLE notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id   UUID REFERENCES events(id) ON DELETE CASCADE,
    type       TEXT NOT NULL,
    message    TEXT NOT NULL,
    is_read    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id);
