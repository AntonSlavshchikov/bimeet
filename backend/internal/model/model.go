package model

import (
	"time"

	"github.com/google/uuid"
)

// ─── Domain structs ────────────────────────────────────────────────────────

type User struct {
	ID           uuid.UUID `json:"id"`
	Name         string    `json:"name"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"created_at"`
}

type Event struct {
	ID          uuid.UUID `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	DateStart   time.Time `json:"date_start"`
	DateEnd     time.Time `json:"date_end"`
	Location    string    `json:"location"`
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
	ID           uuid.UUID `json:"id"`
	EventID      uuid.UUID `json:"event_id"`
	Title        string    `json:"title"`
	TargetAmount float64   `json:"target_amount"`
	CreatedBy    uuid.UUID `json:"created_by"`
	CreatedAt    time.Time `json:"created_at"`
}

type CollectionContribution struct {
	ID           uuid.UUID  `json:"id"`
	CollectionID uuid.UUID  `json:"collection_id"`
	UserID       uuid.UUID  `json:"user_id"`
	Paid         bool       `json:"paid"`
	PaidAt       *time.Time `json:"paid_at,omitempty"`
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
	ID              uuid.UUID `json:"id"`
	EventID         uuid.UUID `json:"event_id"`
	DriverID        uuid.UUID `json:"driver_id"`
	SeatsAvailable  int       `json:"seats_available"`
	DeparturePoint  string    `json:"departure_point"`
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
	CreatedAt time.Time  `json:"created_at"`
}

// ─── DTOs ──────────────────────────────────────────────────────────────────

type RegisterRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
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
}

type UpdateEventRequest struct {
	Title       *string    `json:"title,omitempty"`
	Description *string    `json:"description,omitempty"`
	DateStart   *time.Time `json:"date_start,omitempty"`
	DateEnd     *time.Time `json:"date_end,omitempty"`
	Location    *string    `json:"location,omitempty"`
}

type InviteParticipantRequest struct {
	Email string `json:"email"`
}

type UpdateParticipantStatusRequest struct {
	Status string `json:"status"` // confirmed | declined
}

type CreateCollectionRequest struct {
	Title        string  `json:"title"`
	TargetAmount float64 `json:"target_amount"`
}

type CollectionSummary struct {
	CollectionID uuid.UUID `json:"collection_id"`
	Title        string    `json:"title"`
	TargetAmount float64   `json:"target_amount"`
	PerPerson    float64   `json:"per_person"`
	PaidCount    int       `json:"paid_count"`
	TotalCount   int       `json:"total_count"`
	TotalPaid    float64   `json:"total_paid"`
	Remaining    float64   `json:"remaining"`
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
	AssignedTo *uuid.UUID `json:"assigned_to"` // null to unassign
}

type CreateCarpoolRequest struct {
	SeatsAvailable int    `json:"seats_available"`
	DeparturePoint string `json:"departure_point"`
}

// ─── Enriched API response types ───────────────────────────────────────────

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

type ContributionInfo struct {
	UserID uuid.UUID  `json:"user_id"`
	Paid   bool       `json:"paid"`
	PaidAt *time.Time `json:"paid_at,omitempty"`
}

type CollectionInfo struct {
	ID            uuid.UUID          `json:"id"`
	Title         string             `json:"title"`
	TargetAmount  float64            `json:"target_amount"`
	CreatedBy     uuid.UUID          `json:"created_by"`
	CreatedAt     time.Time          `json:"created_at"`
	Contributions []ContributionInfo `json:"contributions"`
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
	ID           uuid.UUID         `json:"id"`
	Title        string            `json:"title"`
	Description  string            `json:"description"`
	DateStart    time.Time         `json:"date_start"`
	DateEnd      time.Time         `json:"date_end"`
	Location     string            `json:"location"`
	Organizer    UserInfo          `json:"organizer"`
	InviteToken  uuid.UUID         `json:"invite_token"`
	CreatedAt    time.Time         `json:"created_at"`
	UpdatedAt    time.Time         `json:"updated_at"`
	Participants []ParticipantInfo `json:"participants"`
	Collections  []CollectionInfo  `json:"collections"`
	Polls        []PollInfo        `json:"polls"`
	Items        []ItemInfo        `json:"items"`
	Carpools     []CarpoolInfo     `json:"carpools"`
	ChangeLog    []ChangeLogInfo   `json:"change_log"`
}

type EventListItem struct {
	ID           uuid.UUID         `json:"id"`
	Title        string            `json:"title"`
	Description  string            `json:"description"`
	DateStart    time.Time         `json:"date_start"`
	DateEnd      time.Time         `json:"date_end"`
	Location     string            `json:"location"`
	Organizer    UserInfo          `json:"organizer"`
	InviteToken  uuid.UUID         `json:"invite_token"`
	CreatedAt    time.Time         `json:"created_at"`
	MyStatus     string            `json:"my_status"`
	Participants []ParticipantInfo `json:"participants"`
}
