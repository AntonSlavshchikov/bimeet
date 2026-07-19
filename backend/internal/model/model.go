package model

import (
	"time"

	"github.com/google/uuid"
)

// ─── Domain structs ────────────────────────────────────────────────────────

type User struct {
	ID        uuid.UUID  `json:"id"`
	Name      string     `json:"name"`
	LastName  string     `json:"last_name"`
	Email     string     `json:"email"`
	BirthDate *time.Time `json:"birth_date"`
	City      string     `json:"city"`
	AvatarURL *string    `json:"avatar_url"`
	CreatedAt time.Time  `json:"created_at"`
}

type UpdateProfileRequest struct {
	Name      string `json:"name"`
	LastName  string `json:"last_name"`
	BirthDate string `json:"birth_date"` // "YYYY-MM-DD", empty = clear
	City      string `json:"city"`
}

type ProfileStats struct {
	Organized    int `json:"organized"`
	Participated int `json:"participated"`
	Completed    int `json:"completed"`
	Upcoming     int `json:"upcoming"`
}

type ReminderEvent struct {
	ID             uuid.UUID
	Title          string
	DateEnd        time.Time
	OrganizerID    uuid.UUID
	ParticipantIDs []uuid.UUID
	Needs3d        bool
	Needs1d        bool
}

type Event struct {
	ID          uuid.UUID `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	DateStart   time.Time `json:"date_start"`
	DateEnd     time.Time `json:"date_end"`
	Location    string    `json:"location"`
	LocationLat *float64  `json:"location_lat,omitempty"`
	LocationLng *float64  `json:"location_lng,omitempty"`
	Category    string    `json:"category"` // ordinary | business
	DressCode   *string   `json:"dress_code,omitempty"`
	Status      string    `json:"status"` // active | completed
	IsPublic    bool      `json:"is_public"`
	MaxGuests   *int      `json:"max_guests,omitempty"`
	OrganizerID uuid.UUID `json:"organizer_id"`
	InviteToken uuid.UUID `json:"invite_token"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type EventParticipant struct {
	ID      uuid.UUID `json:"id"`
	EventID uuid.UUID `json:"event_id"`
	UserID  uuid.UUID `json:"user_id"`
	Status  string    `json:"status"` // invited | confirmed | declined
}

type Collection struct {
	ID              uuid.UUID `json:"id"`
	EventID         uuid.UUID `json:"event_id"`
	Title           string    `json:"title"`
	PerPersonAmount float64   `json:"per_person_amount"`
	CreatedBy       uuid.UUID `json:"created_by"`
	CreatedAt       time.Time `json:"created_at"`
}

type CollectionContribution struct {
	ID           uuid.UUID  `json:"id"`
	CollectionID uuid.UUID  `json:"collection_id"`
	UserID       uuid.UUID  `json:"user_id"`
	Paid         bool       `json:"paid"`
	PaidAt       *time.Time `json:"paid_at,omitempty"`
	Status       string     `json:"status"` // not_paid | pending | paid
	ReceiptURL   *string    `json:"receipt_url,omitempty"`
}

type Poll struct {
	ID        uuid.UUID    `json:"id"`
	EventID   uuid.UUID    `json:"event_id"`
	Question  string       `json:"question"`
	CreatedBy uuid.UUID    `json:"created_by"`
	CreatedAt time.Time    `json:"created_at"`
	Options   []PollOption `json:"options,omitempty"`
}

type PollOption struct {
	ID     uuid.UUID `json:"id"`
	PollID uuid.UUID `json:"poll_id"`
	Label  string    `json:"label"`
	Votes  int       `json:"votes"`
}

type PollVote struct {
	PollOptionID uuid.UUID `json:"poll_option_id"`
	UserID       uuid.UUID `json:"user_id"`
}

type Item struct {
	ID         uuid.UUID  `json:"id"`
	EventID    uuid.UUID  `json:"event_id"`
	Name       string     `json:"name"`
	AssignedTo *uuid.UUID `json:"assigned_to,omitempty"`
}

type Carpool struct {
	ID             uuid.UUID `json:"id"`
	EventID        uuid.UUID `json:"event_id"`
	DriverID       uuid.UUID `json:"driver_id"`
	SeatsAvailable int       `json:"seats_available"`
	DeparturePoint string    `json:"departure_point"`
}

type CarpoolPassenger struct {
	CarpoolID uuid.UUID `json:"carpool_id"`
	UserID    uuid.UUID `json:"user_id"`
}

type EventChangeLog struct {
	ID        uuid.UUID `json:"id"`
	EventID   uuid.UUID `json:"event_id"`
	ChangedBy uuid.UUID `json:"changed_by"`
	FieldName string    `json:"field_name"`
	OldValue  string    `json:"old_value"`
	NewValue  string    `json:"new_value"`
	ChangedAt time.Time `json:"changed_at"`
}

type Notification struct {
	ID        uuid.UUID  `json:"id"`
	UserID    uuid.UUID  `json:"user_id"`
	EventID   *uuid.UUID `json:"event_id,omitempty"`
	Type      string     `json:"type"`
	Message   string     `json:"message"`
	IsRead    bool       `json:"is_read"`
	Count     int        `json:"count"` // collapsed events of the same kind (e.g. chat messages)
	CreatedAt time.Time  `json:"created_at"`
}

// ─── Chat ──────────────────────────────────────────────────────────────────

// Message is a single chat message in an event. A soft-deleted message keeps its
// row (Deleted=true) but its Body is blanked before leaving the repository.
type Message struct {
	ID        uuid.UUID     `json:"id"`
	EventID   uuid.UUID     `json:"event_id"`
	Author    UserInfo      `json:"author"`
	Body      string        `json:"body"`
	ImageURL  *string       `json:"image_url,omitempty"`
	CreatedAt time.Time     `json:"created_at"`
	Deleted   bool          `json:"deleted"`
	IsMine    bool          `json:"is_mine"`
	ReplyTo   *ReplyPreview `json:"reply_to,omitempty"`
}

// ReplyPreview is a lightweight snapshot of the message being replied to.
type ReplyPreview struct {
	ID         uuid.UUID `json:"id"`
	AuthorName string    `json:"author_name"`
	Body       string    `json:"body"`
	Deleted    bool      `json:"deleted"`
}

type PostMessageRequest struct {
	Body      string     `json:"body"`
	ReplyToID *uuid.UUID `json:"reply_to_id,omitempty"`
}

// UnreadCountResponse carries the chat unread badge number.
type UnreadCountResponse struct {
	Count int `json:"count"`
}

// LoginCode is a one-time passwordless login code (hashed) for a given email.
type LoginCode struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	CodeHash  string    `json:"-"`
	ExpiresAt time.Time `json:"expires_at"`
	Attempts  int       `json:"attempts"`
	Used      bool      `json:"used"`
	CreatedAt time.Time `json:"created_at"`
}

type PushSubscription struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Endpoint  string    `json:"endpoint"`
	P256dh    string    `json:"p256dh"`
	Auth      string    `json:"auth"`
	UserAgent string    `json:"user_agent,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

// PushSubscribeRequest mirrors the browser PushSubscription JSON shape.
type PushSubscribeRequest struct {
	Endpoint string `json:"endpoint"`
	Keys     struct {
		P256dh string `json:"p256dh"`
		Auth   string `json:"auth"`
	} `json:"keys"`
}

type PushUnsubscribeRequest struct {
	Endpoint string `json:"endpoint"`
}

// ─── DTOs ──────────────────────────────────────────────────────────────────

// RequestCodeRequest asks for a one-time login code to be sent to an email.
type RequestCodeRequest struct {
	Email string `json:"email"`
}

// VerifyCodeRequest verifies a one-time login code for an email.
type VerifyCodeRequest struct {
	Email string `json:"email"`
	Code  string `json:"code"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type CreateEventRequest struct {
	Title       string    `json:"title"`
	Description string    `json:"description"`
	DateStart   time.Time `json:"date_start"`
	DateEnd     time.Time `json:"date_end"`
	Location    string    `json:"location"`
	LocationLat *float64  `json:"location_lat,omitempty"`
	LocationLng *float64  `json:"location_lng,omitempty"`
	Category    string    `json:"category"` // ordinary | business; defaults to ordinary
	DressCode   *string   `json:"dress_code,omitempty"`
	IsPublic    bool      `json:"is_public"`
	MaxGuests   *int      `json:"max_guests,omitempty"`
}

type UpdateEventRequest struct {
	Title       *string    `json:"title,omitempty"`
	Description *string    `json:"description,omitempty"`
	DateStart   *time.Time `json:"date_start,omitempty"`
	DateEnd     *time.Time `json:"date_end,omitempty"`
	Location    *string    `json:"location,omitempty"`
	LocationLat *float64   `json:"location_lat,omitempty"`
	LocationLng *float64   `json:"location_lng,omitempty"`
	Category    *string    `json:"category,omitempty"`
	DressCode   *string    `json:"dress_code,omitempty"`
	IsPublic    *bool      `json:"is_public,omitempty"`
	MaxGuests   *int       `json:"max_guests,omitempty"`
}

type InviteParticipantRequest struct {
	Email string `json:"email"`
}

type JoinByInviteTokenRequest struct {
	Action string `json:"action"` // "join" | "decline"; defaults to "join"
}

type UpdateParticipantStatusRequest struct {
	Status string `json:"status"` // confirmed | declined
}

type CreateCollectionRequest struct {
	Title           string  `json:"title"`
	PerPersonAmount float64 `json:"per_person_amount"`
}

type CollectionSummary struct {
	CollectionID    uuid.UUID `json:"collection_id"`
	Title           string    `json:"title"`
	PerPersonAmount float64   `json:"per_person_amount"`
	ExpectedTotal   float64   `json:"expected_total"`
	PaidCount       int       `json:"paid_count"`
	TotalCount      int       `json:"total_count"`
	TotalPaid       float64   `json:"total_paid"`
	Remaining       float64   `json:"remaining"`
}

type EventCollectionsSummaryResponse struct {
	Collections []CollectionSummary `json:"collections"`
	GrandTotal  float64             `json:"grand_total"`
	TotalPaid   float64             `json:"total_paid"`
	Remaining   float64             `json:"remaining"`
}

type CreatePollRequest struct {
	Question string   `json:"question"`
	Options  []string `json:"options"`
}

type VoteRequest struct {
	OptionID uuid.UUID `json:"option_id"`
}

type CreateItemRequest struct {
	Name string `json:"name"`
}

type UpdateItemRequest struct {
	Assigned bool `json:"assigned"` // true = take for self, false = unassign
}

type CreateCarpoolRequest struct {
	SeatsAvailable int    `json:"seats_available"`
	DeparturePoint string `json:"departure_point"`
}

// ─── Enriched API response types ───────────────────────────────────────────

type InviteEventInfo struct {
	ID             uuid.UUID      `json:"id"`
	Title          string         `json:"title"`
	Description    string         `json:"description"`
	DateStart      time.Time      `json:"date_start"`
	DateEnd        time.Time      `json:"date_end"`
	Location       string         `json:"location"`
	Category       string         `json:"category"`
	DressCode      *string        `json:"dress_code,omitempty"`
	IsPublic       bool           `json:"is_public"`
	Organizer      PublicUserInfo `json:"organizer"`
	ConfirmedCount int            `json:"confirmed_count"`
}

// UserInfo carries display fields for a user shown to other event members.
// It deliberately omits the real user ID so participants cannot enumerate or
// cross-reference each other; IsMe lets the caller recognise their own records.
type UserInfo struct {
	Name  string `json:"name"`
	Email string `json:"email"`
	IsMe  bool   `json:"is_me"`
}

type ParticipantInfo struct {
	User        UserInfo `json:"user"`
	Status      string   `json:"status"`
	IsOrganizer bool     `json:"is_organizer"`
}

type ContributionInfo struct {
	ID         *uuid.UUID `json:"id"` // nil when the member has no contribution row yet
	User       UserInfo   `json:"user"`
	Paid       bool       `json:"paid"`
	PaidAt     *time.Time `json:"paid_at,omitempty"`
	Status     string     `json:"status"`
	ReceiptURL *string    `json:"receipt_url,omitempty"`
}

type CollectionInfo struct {
	ID              uuid.UUID          `json:"id"`
	Title           string             `json:"title"`
	PerPersonAmount float64            `json:"per_person_amount"`
	CreatedBy       uuid.UUID          `json:"created_by"`
	CreatedAt       time.Time          `json:"created_at"`
	Contributions   []ContributionInfo `json:"contributions"`
}

type PollOptionInfo struct {
	ID        uuid.UUID `json:"id"`
	Label     string    `json:"label"`
	VoteCount int       `json:"vote_count"`
	Voted     bool      `json:"voted"` // whether the caller voted for this option
}

type PollInfo struct {
	ID        uuid.UUID        `json:"id"`
	Question  string           `json:"question"`
	CreatedBy uuid.UUID        `json:"created_by"`
	CreatedAt time.Time        `json:"created_at"`
	Options   []PollOptionInfo `json:"options"`
}

type ItemInfo struct {
	ID         uuid.UUID `json:"id"`
	Name       string    `json:"name"`
	AssignedTo *UserInfo `json:"assigned_to,omitempty"`
}

type CarpoolInfo struct {
	ID             uuid.UUID  `json:"id"`
	Driver         UserInfo   `json:"driver"`
	SeatsAvailable int        `json:"seats_available"`
	DeparturePoint string     `json:"departure_point"`
	Passengers     []UserInfo `json:"passengers"`
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
	LocationLat    *float64          `json:"location_lat,omitempty"`
	LocationLng    *float64          `json:"location_lng,omitempty"`
	Category       string            `json:"category"`
	DressCode      *string           `json:"dress_code,omitempty"`
	Status         string            `json:"status"`
	IsPublic       bool              `json:"is_public"`
	MaxGuests      *int              `json:"max_guests,omitempty"`
	ConfirmedCount int               `json:"confirmed_count"`
	Organizer      UserInfo          `json:"organizer"`
	InviteToken    uuid.UUID         `json:"invite_token"`
	CreatedAt      time.Time         `json:"created_at"`
	UpdatedAt      time.Time         `json:"updated_at"`
	Participants   []ParticipantInfo `json:"participants"`
	Collections    []CollectionInfo  `json:"collections"`
	Polls          []PollInfo        `json:"polls"`
	Items          []ItemInfo        `json:"items"`
	Carpools       []CarpoolInfo     `json:"carpools"`
	ChangeLog      []ChangeLogInfo   `json:"change_log"`
}

type EventListItem struct {
	ID             uuid.UUID         `json:"id"`
	Title          string            `json:"title"`
	Description    string            `json:"description"`
	DateStart      time.Time         `json:"date_start"`
	DateEnd        time.Time         `json:"date_end"`
	Location       string            `json:"location"`
	Category       string            `json:"category"`
	DressCode      *string           `json:"dress_code,omitempty"`
	Status         string            `json:"status"`
	IsPublic       bool              `json:"is_public"`
	MaxGuests      *int              `json:"max_guests,omitempty"`
	ConfirmedCount int               `json:"confirmed_count"`
	Organizer      UserInfo          `json:"organizer"`
	InviteToken    uuid.UUID         `json:"invite_token"`
	CreatedAt      time.Time         `json:"created_at"`
	MyStatus       string            `json:"my_status"`
	Participants   []ParticipantInfo `json:"participants"`
}

type PublicUserInfo struct {
	Name string `json:"name"`
	IsMe bool   `json:"is_me"`
}

type PublicParticipantInfo struct {
	User        PublicUserInfo `json:"user"`
	Status      string         `json:"status"`
	IsOrganizer bool           `json:"is_organizer"`
}

type PublicEventListItem struct {
	ID             uuid.UUID               `json:"id"`
	Title          string                  `json:"title"`
	Description    string                  `json:"description"`
	DateStart      time.Time               `json:"date_start"`
	DateEnd        time.Time               `json:"date_end"`
	Location       string                  `json:"location"`
	LocationLat    *float64                `json:"location_lat,omitempty"`
	LocationLng    *float64                `json:"location_lng,omitempty"`
	Category       string                  `json:"category"`
	DressCode      *string                 `json:"dress_code,omitempty"`
	Status         string                  `json:"status"`
	IsPublic       bool                    `json:"is_public"`
	MaxGuests      *int                    `json:"max_guests,omitempty"`
	ConfirmedCount int                     `json:"confirmed_count"`
	Organizer      PublicUserInfo          `json:"organizer"`
	CreatedAt      time.Time               `json:"created_at"`
	MyStatus       string                  `json:"my_status"`
	Participants   []PublicParticipantInfo `json:"participants"`
	IsParticipant  bool                    `json:"is_participant"`
}

// ─── Admin DTOs ────────────────────────────────────────────────────────────

type AdminOverview struct {
	TotalUsers       int     `json:"total_users"`
	UsersActive7d    int     `json:"users_active_7d"`
	UsersActive30d   int     `json:"users_active_30d"`
	TotalEvents      int     `json:"total_events"`
	EventsActive     int     `json:"events_active"`
	EventsCompleted  int     `json:"events_completed"`
	TotalCollections int     `json:"total_collections"`
	TotalCollected   float64 `json:"total_collected"`
}

type AdminTimeseriesPoint struct {
	Date   string `json:"date"` // YYYY-MM-DD
	Users  int    `json:"users"`
	Events int    `json:"events"`
}

type AdminTimeseries struct {
	Points []AdminTimeseriesPoint `json:"points"`
}

type AdminDistributionItem struct {
	Key   string `json:"key"`
	Count int    `json:"count"`
}

type AdminDistribution struct {
	ByCategory   []AdminDistributionItem `json:"by_category"`
	ByStatus     []AdminDistributionItem `json:"by_status"`
	ByVisibility []AdminDistributionItem `json:"by_visibility"`
}

type OrganizerStat struct {
	UserID     uuid.UUID `json:"user_id"`
	Name       string    `json:"name"`
	Email      string    `json:"email"`
	EventCount int       `json:"event_count"`
}

type AdminUserRow struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	LastName  string    `json:"last_name"`
	Email     string    `json:"email"`
	City      string    `json:"city"`
	CreatedAt time.Time `json:"created_at"`
}

type AdminEventRow struct {
	ID             uuid.UUID `json:"id"`
	Title          string    `json:"title"`
	Category       string    `json:"category"`
	Status         string    `json:"status"`
	IsPublic       bool      `json:"is_public"`
	OrganizerID    uuid.UUID `json:"organizer_id"`
	OrganizerEmail string    `json:"organizer_email"`
	DateStart      time.Time `json:"date_start"`
	CreatedAt      time.Time `json:"created_at"`
}
