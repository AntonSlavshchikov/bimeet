package eventsvc

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"bimeet-teams/internal/model"
)

// ─── fakes (stdlib only) ────────────────────────────────────────────────────

type fakeEventRepo struct {
	event   model.Event
	getErr  error
	created bool
}

func (f *fakeEventRepo) Create(_ context.Context, companyID, organizerID uuid.UUID, req model.CreateEventRequest) (model.Event, error) {
	f.created = true
	return model.Event{ID: uuid.New(), CompanyID: companyID, OrganizerID: organizerID, Title: req.Title}, nil
}
func (f *fakeEventRepo) GetByID(_ context.Context, _ uuid.UUID) (model.Event, error) {
	return f.event, f.getErr
}
func (f *fakeEventRepo) GetDetail(_ context.Context, _ uuid.UUID) (model.EventDetail, error) {
	return model.EventDetail{}, nil
}
func (f *fakeEventRepo) ListForUser(_ context.Context, _, _ uuid.UUID) ([]model.EventListItem, error) {
	return nil, nil
}
func (f *fakeEventRepo) Update(_ context.Context, _ uuid.UUID, _ model.UpdateEventRequest) (model.Event, error) {
	return f.event, nil
}
func (f *fakeEventRepo) Delete(_ context.Context, _ uuid.UUID) error   { return nil }
func (f *fakeEventRepo) Complete(_ context.Context, _ uuid.UUID) error { return nil }
func (f *fakeEventRepo) AddParticipant(_ context.Context, _, _ uuid.UUID) (bool, error) {
	return true, nil
}
func (f *fakeEventRepo) UpdateParticipantStatus(_ context.Context, _, _ uuid.UUID, _ string) error {
	return nil
}
func (f *fakeEventRepo) IsParticipant(_ context.Context, _, _ uuid.UUID) (bool, error) {
	return false, nil
}
func (f *fakeEventRepo) ParticipantUserIDs(_ context.Context, _ uuid.UUID) ([]uuid.UUID, error) {
	return nil, nil
}
func (f *fakeEventRepo) AddChangeLog(_ context.Context, _, _ uuid.UUID, _, _, _ string) error {
	return nil
}

type fakeUserRepo struct{}

func (fakeUserRepo) GetByID(_ context.Context, _ uuid.UUID) (model.User, error) {
	return model.User{}, nil
}
func (fakeUserRepo) GetByCompanyAndEmail(_ context.Context, _ uuid.UUID, _ string) (model.User, string, error) {
	return model.User{}, "", nil
}

type fakeNotifyRepo struct{}

func (fakeNotifyRepo) Create(_ context.Context, _ uuid.UUID, _ *uuid.UUID, _, _ string) (model.Notification, error) {
	return model.Notification{}, nil
}

func validCreateReq() model.CreateEventRequest {
	now := time.Now()
	return model.CreateEventRequest{
		Title: "Sync", DateStart: now, DateEnd: now.Add(time.Hour), MeetingURL: "https://meet/x",
	}
}

// ─── tests ──────────────────────────────────────────────────────────────────

func TestCreate_RequiresLocationOrLink(t *testing.T) {
	svc := New(&fakeEventRepo{}, fakeUserRepo{}, fakeNotifyRepo{})
	req := validCreateReq()
	req.MeetingURL = ""
	req.Location = ""
	_, err := svc.Create(context.Background(), uuid.New(), uuid.New(), req)
	var verr ValidationError
	if !errors.As(err, &verr) {
		t.Fatalf("expected ValidationError, got %v", err)
	}
}

func TestCreate_HappyPath(t *testing.T) {
	repo := &fakeEventRepo{}
	svc := New(repo, fakeUserRepo{}, fakeNotifyRepo{})
	_, err := svc.Create(context.Background(), uuid.New(), uuid.New(), validCreateReq())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !repo.created {
		t.Fatal("expected repo.Create to be called")
	}
}

func TestUpdate_ForbiddenForNonOrganizer(t *testing.T) {
	company := uuid.New()
	repo := &fakeEventRepo{event: model.Event{ID: uuid.New(), CompanyID: company, OrganizerID: uuid.New()}}
	svc := New(repo, fakeUserRepo{}, fakeNotifyRepo{})

	title := "x"
	_, err := svc.Update(context.Background(), repo.event.ID, company, uuid.New(), model.UpdateEventRequest{Title: &title})
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden, got %v", err)
	}
}

func TestGetDetail_CrossCompanyIsNotFound(t *testing.T) {
	repo := &fakeEventRepo{event: model.Event{ID: uuid.New(), CompanyID: uuid.New(), OrganizerID: uuid.New()}}
	svc := New(repo, fakeUserRepo{}, fakeNotifyRepo{})

	// Caller's company differs from the event's company.
	_, err := svc.GetDetail(context.Background(), repo.event.ID, uuid.New(), uuid.New())
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound for cross-company access, got %v", err)
	}
}
