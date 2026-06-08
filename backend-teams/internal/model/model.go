package model

import (
	"time"

	"github.com/google/uuid"
)

// ─── Domain structs ────────────────────────────────────────────────────────

type Company struct {
	ID         uuid.UUID `json:"id"`
	Name       string    `json:"name"`
	Subdomain  string    `json:"subdomain"`
	BrandColor string    `json:"brand_color"`
	LogoURL    *string   `json:"logo_url"`
	CreatedAt  time.Time `json:"created_at"`
}

type User struct {
	ID        uuid.UUID `json:"id"`
	CompanyID uuid.UUID `json:"company_id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Role      string    `json:"role"` // owner | member
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

type Invitation struct {
	ID         uuid.UUID  `json:"id"`
	CompanyID  uuid.UUID  `json:"company_id"`
	Email      string     `json:"email"`
	TokenHash  string     `json:"-"`
	InvitedBy  uuid.UUID  `json:"invited_by"`
	AcceptedAt *time.Time `json:"accepted_at"`
	ExpiresAt  time.Time  `json:"expires_at"`
	CreatedAt  time.Time  `json:"created_at"`
}

// ─── Request DTOs ──────────────────────────────────────────────────────────

type RegisterCompanyRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	Name        string `json:"name"` // owner display name
	CompanyName string `json:"company_name"`
	// Subdomain is no longer accepted from the client — it is auto-generated
	// from CompanyName (slugified + uniqued) during registration.
}

type LoginRequest struct {
	Subdomain string `json:"subdomain"`
	Email     string `json:"email"`
	Password  string `json:"password"`
}

type InviteRequest struct {
	Email string `json:"email"`
}

type AcceptInviteRequest struct {
	Token    string `json:"token"`
	Name     string `json:"name"`
	Password string `json:"password"`
}

type UpdateCompanyRequest struct {
	Name       *string `json:"name,omitempty"`
	BrandColor *string `json:"brand_color,omitempty"`
	LogoURL    *string `json:"logo_url,omitempty"`
}

// ─── Response DTOs ─────────────────────────────────────────────────────────

// AuthResponse is returned by register/login/accept-invite: a session token
// plus the resolved user and their company (for immediate branding).
type AuthResponse struct {
	Token   string  `json:"token"`
	User    User    `json:"user"`
	Company Company `json:"company"`
}

// MeResponse is the authenticated user together with their company.
type MeResponse struct {
	User    User    `json:"user"`
	Company Company `json:"company"`
}

// PublicCompany is the brand info exposed without auth so the frontend can
// theme the login page from the subdomain.
type PublicCompany struct {
	Name       string  `json:"name"`
	Subdomain  string  `json:"subdomain"`
	BrandColor string  `json:"brand_color"`
	LogoURL    *string `json:"logo_url"`
}

// InviteResponse returns the freshly minted invite token. In the MVP there is
// no email delivery, so the owner gets the token/link back directly.
type InviteResponse struct {
	Email     string    `json:"email"`
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expires_at"`
}

// ─── Events (business meetings) ─────────────────────────────────────────────

type Event struct {
	ID          uuid.UUID `json:"id"`
	CompanyID   uuid.UUID `json:"company_id"`
	OrganizerID uuid.UUID `json:"organizer_id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	DateStart   time.Time `json:"date_start"`
	DateEnd     time.Time `json:"date_end"`
	Location    string    `json:"location"`
	MeetingURL  string    `json:"meeting_url"`
	Status      string    `json:"status"` // active | completed
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type CreateEventRequest struct {
	Title       string    `json:"title"`
	Description string    `json:"description"`
	DateStart   time.Time `json:"date_start"`
	DateEnd     time.Time `json:"date_end"`
	Location    string    `json:"location"`
	MeetingURL  string    `json:"meeting_url"`
}

type UpdateEventRequest struct {
	Title       *string    `json:"title,omitempty"`
	Description *string    `json:"description,omitempty"`
	DateStart   *time.Time `json:"date_start,omitempty"`
	DateEnd     *time.Time `json:"date_end,omitempty"`
	Location    *string    `json:"location,omitempty"`
	MeetingURL  *string    `json:"meeting_url,omitempty"`
}

type InviteParticipantRequest struct {
	Email string `json:"email"`
}

type UpdateParticipantStatusRequest struct {
	Status string `json:"status"` // confirmed | declined
}

type CreateLinkRequest struct {
	Title string `json:"title"`
	URL   string `json:"url"`
}

type CreatePollRequest struct {
	Question string   `json:"question"`
	Options  []string `json:"options"`
}

type VoteRequest struct {
	OptionID uuid.UUID `json:"option_id"`
}

// ─── Enriched event responses ──────────────────────────────────────────────

type UserInfo struct {
	ID    uuid.UUID `json:"id"`
	Name  string    `json:"name"`
	Email string    `json:"email"`
}

type ParticipantInfo struct {
	ID     uuid.UUID `json:"id"`
	User   UserInfo  `json:"user"`
	Status string    `json:"status"`
}

type LinkInfo struct {
	ID        uuid.UUID `json:"id"`
	Title     string    `json:"title"`
	URL       string    `json:"url"`
	CreatedBy uuid.UUID `json:"created_by"`
	CreatedAt time.Time `json:"created_at"`
}

type PollOptionInfo struct {
	ID    uuid.UUID   `json:"id"`
	Label string      `json:"label"`
	Votes []uuid.UUID `json:"votes"` // voter IDs
}

type PollInfo struct {
	ID        uuid.UUID        `json:"id"`
	Question  string           `json:"question"`
	CreatedBy uuid.UUID        `json:"created_by"`
	CreatedAt time.Time        `json:"created_at"`
	Options   []PollOptionInfo `json:"options"`
}

type ChangeLogInfo struct {
	ID        uuid.UUID `json:"id"`
	ChangedBy UserInfo  `json:"changed_by"`
	FieldName string    `json:"field_name"`
	OldValue  string    `json:"old_value"`
	NewValue  string    `json:"new_value"`
	ChangedAt time.Time `json:"changed_at"`
}

type EventDetail struct {
	ID             uuid.UUID         `json:"id"`
	Title          string            `json:"title"`
	Description    string            `json:"description"`
	DateStart      time.Time         `json:"date_start"`
	DateEnd        time.Time         `json:"date_end"`
	Location       string            `json:"location"`
	MeetingURL     string            `json:"meeting_url"`
	Status         string            `json:"status"`
	ConfirmedCount int               `json:"confirmed_count"`
	Organizer      UserInfo          `json:"organizer"`
	CreatedAt      time.Time         `json:"created_at"`
	UpdatedAt      time.Time         `json:"updated_at"`
	Participants   []ParticipantInfo `json:"participants"`
	Links          []LinkInfo        `json:"links"`
	Polls          []PollInfo        `json:"polls"`
	ChangeLog      []ChangeLogInfo   `json:"change_log"`
}

type EventListItem struct {
	ID             uuid.UUID         `json:"id"`
	Title          string            `json:"title"`
	Description    string            `json:"description"`
	DateStart      time.Time         `json:"date_start"`
	DateEnd        time.Time         `json:"date_end"`
	Location       string            `json:"location"`
	MeetingURL     string            `json:"meeting_url"`
	Status         string            `json:"status"`
	ConfirmedCount int               `json:"confirmed_count"`
	Organizer      UserInfo          `json:"organizer"`
	CreatedAt      time.Time         `json:"created_at"`
	MyStatus       string            `json:"my_status"`
	Participants   []ParticipantInfo `json:"participants"`
}

// Notification is an in-app notification for a Teams user.
type Notification struct {
	ID        uuid.UUID  `json:"id"`
	UserID    uuid.UUID  `json:"user_id"`
	EventID   *uuid.UUID `json:"event_id,omitempty"`
	Type      string     `json:"type"`
	Message   string     `json:"message"`
	IsRead    bool       `json:"is_read"`
	CreatedAt time.Time  `json:"created_at"`
}
