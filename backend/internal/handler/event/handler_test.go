package eventhandler_test

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	eventhandler "bimeet/internal/handler/event"
	"bimeet/internal/handler/event/mock"
	"bimeet/internal/middleware"
	"bimeet/internal/model"
)

// ─── Helpers ───────────────────────────────────────────────────────────────

func newRouter(t *testing.T) (http.Handler, *mock.MockEventService) {
	t.Helper()
	ctrl := gomock.NewController(t)
	svc := mock.NewMockEventService(ctrl)
	h := eventhandler.New(svc)

	r := chi.NewRouter()
	r.Get("/events", h.List)
	r.Post("/events", h.Create)
	r.Get("/events/public", h.ListPublic)
	r.Get("/events/{id}", h.GetByID)
	r.Put("/events/{id}", h.Update)
	r.Delete("/events/{id}", h.Delete)
	r.Post("/events/{id}/participants", h.InviteParticipant)
	r.Patch("/events/{id}/participants/{userId}", h.UpdateParticipantStatus)
	return r, svc
}

func withAuth(r *http.Request, userID uuid.UUID) *http.Request {
	return r.WithContext(middleware.WithUserID(r.Context(), userID))
}

// ─── List ──────────────────────────────────────────────────────────────────

func TestList_NoAuth(t *testing.T) {
	router, _ := newRouter(t)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/events", nil))
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestList_ReturnsEmptySlice(t *testing.T) {
	router, svc := newRouter(t)

	userID := uuid.New()
	svc.EXPECT().List(gomock.Any(), userID).Return([]model.EventListItem{}, nil)

	req := withAuth(httptest.NewRequest(http.MethodGet, "/events", nil), userID)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var body []interface{}
	require.NoError(t, json.NewDecoder(w.Body).Decode(&body))
	assert.NotNil(t, body) // [] not null
}

func TestList_HappyPath(t *testing.T) {
	router, svc := newRouter(t)

	userID := uuid.New()
	items := []model.EventListItem{{ID: uuid.New(), Title: "Gala"}}
	svc.EXPECT().List(gomock.Any(), userID).Return(items, nil)

	req := withAuth(httptest.NewRequest(http.MethodGet, "/events", nil), userID)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestListPublic_OmitsPrivateFields(t *testing.T) {
	router, svc := newRouter(t)

	userID := uuid.New()
	items := []model.PublicEventListItem{{
		ID:        uuid.New(),
		Title:     "Gala",
		Organizer: model.PublicUserInfo{Name: "Alice"},
		Participants: []model.PublicParticipantInfo{
			{User: model.PublicUserInfo{Name: "Bob"}, Status: "confirmed"},
		},
	}}
	svc.EXPECT().ListPublic(gomock.Any(), userID).Return(items, nil)

	req := withAuth(httptest.NewRequest(http.MethodGet, "/events/public", nil), userID)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var got []map[string]any
	require.NoError(t, json.NewDecoder(w.Body).Decode(&got))
	require.Len(t, got, 1)
	assert.NotContains(t, got[0], "invite_token")
	organizer, ok := got[0]["organizer"].(map[string]any)
	require.True(t, ok)
	assert.NotContains(t, organizer, "email")
	assert.NotContains(t, organizer, "id")
	participants, ok := got[0]["participants"].([]any)
	require.True(t, ok)
	require.Len(t, participants, 1)
	participant, ok := participants[0].(map[string]any)
	require.True(t, ok)
	user, ok := participant["user"].(map[string]any)
	require.True(t, ok)
	assert.NotContains(t, user, "email")
	assert.NotContains(t, user, "id")
}

// ─── GetByID ───────────────────────────────────────────────────────────────

func TestGetByID_InvalidUUID(t *testing.T) {
	router, _ := newRouter(t)

	req := withAuth(httptest.NewRequest(http.MethodGet, "/events/not-a-uuid", nil), uuid.New())
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetByID_Forbidden(t *testing.T) {
	router, svc := newRouter(t)

	userID := uuid.New()
	eventID := uuid.New()
	svc.EXPECT().GetByID(gomock.Any(), eventID, userID).Return(model.EventDetail{}, errors.New("forbidden"))

	req := withAuth(httptest.NewRequest(http.MethodGet, "/events/"+eventID.String(), nil), userID)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestGetByID_HappyPath(t *testing.T) {
	router, svc := newRouter(t)

	userID := uuid.New()
	eventID := uuid.New()
	detail := model.EventDetail{ID: eventID, Title: "Party"}
	svc.EXPECT().GetByID(gomock.Any(), eventID, userID).Return(detail, nil)

	req := withAuth(httptest.NewRequest(http.MethodGet, "/events/"+eventID.String(), nil), userID)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var got model.EventDetail
	require.NoError(t, json.NewDecoder(w.Body).Decode(&got))
	assert.Equal(t, eventID, got.ID)
}

func TestGetByID_OmitsParticipantSecretsFromJSON(t *testing.T) {
	router, svc := newRouter(t)

	userID := uuid.New()
	eventID := uuid.New()
	ownReceipt := "https://cdn.example/receipts/own.pdf"
	detail := model.EventDetail{
		ID:          eventID,
		InviteToken: nil,
		Collections: []model.CollectionInfo{{
			ID: uuid.New(),
			Contributions: []model.ContributionInfo{
				{User: model.UserInfo{Name: "Caller", IsMe: true}, ReceiptURL: &ownReceipt},
				{User: model.UserInfo{Name: "Bob", IsMe: false}, ReceiptURL: nil},
			},
		}},
	}
	svc.EXPECT().GetByID(gomock.Any(), eventID, userID).Return(detail, nil)

	req := withAuth(httptest.NewRequest(http.MethodGet, "/events/"+eventID.String(), nil), userID)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	var got map[string]any
	require.NoError(t, json.NewDecoder(w.Body).Decode(&got))
	assert.NotContains(t, got, "invite_token")

	collections, ok := got["collections"].([]any)
	require.True(t, ok)
	require.Len(t, collections, 1)
	collection, ok := collections[0].(map[string]any)
	require.True(t, ok)
	contributions, ok := collection["contributions"].([]any)
	require.True(t, ok)
	require.Len(t, contributions, 2)
	ownContribution, ok := contributions[0].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, ownReceipt, ownContribution["receipt_url"])
	otherContribution, ok := contributions[1].(map[string]any)
	require.True(t, ok)
	assert.NotContains(t, otherContribution, "receipt_url")
}

// ─── Delete ────────────────────────────────────────────────────────────────

func TestDelete_Forbidden(t *testing.T) {
	router, svc := newRouter(t)

	userID := uuid.New()
	eventID := uuid.New()
	svc.EXPECT().Delete(gomock.Any(), eventID, userID).Return(errors.New("forbidden"))

	req := withAuth(httptest.NewRequest(http.MethodDelete, "/events/"+eventID.String(), nil), userID)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestDelete_HappyPath(t *testing.T) {
	router, svc := newRouter(t)

	userID := uuid.New()
	eventID := uuid.New()
	svc.EXPECT().Delete(gomock.Any(), eventID, userID).Return(nil)

	req := withAuth(httptest.NewRequest(http.MethodDelete, "/events/"+eventID.String(), nil), userID)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNoContent, w.Code)
}

// ─── Create ────────────────────────────────────────────────────────────────

func TestCreate_InvalidBody(t *testing.T) {
	router, _ := newRouter(t)

	req := withAuth(httptest.NewRequest(http.MethodPost, "/events", bytes.NewBufferString("not-json")), uuid.New())
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreate_ValidationError(t *testing.T) {
	router, svc := newRouter(t)

	userID := uuid.New()
	svc.EXPECT().Create(gomock.Any(), gomock.Any(), userID).Return(model.Event{}, errors.New("title is required"))

	body, _ := json.Marshal(model.CreateEventRequest{})
	req := withAuth(httptest.NewRequest(http.MethodPost, "/events", bytes.NewBuffer(body)), userID)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreate_HappyPath(t *testing.T) {
	router, svc := newRouter(t)

	userID := uuid.New()
	eventID := uuid.New()
	svc.EXPECT().Create(gomock.Any(), gomock.Any(), userID).Return(model.Event{ID: eventID, Title: "Party"}, nil)

	body, _ := json.Marshal(model.CreateEventRequest{Title: "Party"})
	req := withAuth(httptest.NewRequest(http.MethodPost, "/events", bytes.NewBuffer(body)), userID)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
	var got model.Event
	require.NoError(t, json.NewDecoder(w.Body).Decode(&got))
	assert.Equal(t, eventID, got.ID)
}
