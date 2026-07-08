package collectionsvc_test

import (
	"bytes"
	"context"
	"errors"
	"io"
	"mime/multipart"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"bimeet/internal/model"
	collectionsvc "bimeet/internal/service/collection"
	"bimeet/internal/service/collection/mock"
)

// noopUploader — заглушка Uploader для тестов, которые не доходят до загрузки файла
// (List/Create/Delete/Summary). Пути с реальной загрузкой (SubmitContribution)
// здесь не покрываются.
type noopUploader struct{}

func (noopUploader) Upload(_ context.Context, _, _ string, _ io.Reader) (string, error) {
	return "", nil
}

type captureUploader struct {
	contentType string
	body        []byte
}

func (u *captureUploader) Upload(_ context.Context, _, contentType string, body io.Reader) (string, error) {
	u.contentType = contentType
	data, err := io.ReadAll(body)
	if err != nil {
		return "", err
	}
	u.body = data
	return "https://cdn.example/receipt", nil
}

func newService(t *testing.T) (*collectionsvc.Service, *mock.MockCollectionRepo, *mock.MockEventRepo) {
	t.Helper()
	ctrl := gomock.NewController(t)
	cr := mock.NewMockCollectionRepo(ctrl)
	er := mock.NewMockEventRepo(ctrl)
	nr := mock.NewMockNotificationRepo(ctrl)
	return collectionsvc.New(cr, er, nr, noopUploader{}), cr, er
}

func newServiceWithUploader(t *testing.T, uploader collectionsvc.Uploader) (*collectionsvc.Service, *mock.MockCollectionRepo, *mock.MockEventRepo, *mock.MockNotificationRepo) {
	t.Helper()
	ctrl := gomock.NewController(t)
	cr := mock.NewMockCollectionRepo(ctrl)
	er := mock.NewMockEventRepo(ctrl)
	nr := mock.NewMockNotificationRepo(ctrl)
	return collectionsvc.New(cr, er, nr, uploader), cr, er, nr
}

func ptr[T any](v T) *T {
	return &v
}

// ─── List ──────────────────────────────────────────────────────────────────

func TestList_Forbidden(t *testing.T) {
	svc, _, er := newService(t)
	eventID, userID := uuid.New(), uuid.New()
	er.EXPECT().IsParticipant(gomock.Any(), eventID, userID).Return(false, nil)

	_, err := svc.List(context.Background(), eventID, userID)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "forbidden")
}

func TestList_HappyPath(t *testing.T) {
	svc, cr, er := newService(t)
	eventID, userID := uuid.New(), uuid.New()
	er.EXPECT().IsParticipant(gomock.Any(), eventID, userID).Return(true, nil)
	cr.EXPECT().ListByEvent(gomock.Any(), eventID).Return([]model.Collection{}, nil)

	result, err := svc.List(context.Background(), eventID, userID)
	require.NoError(t, err)
	assert.NotNil(t, result)
}

// ─── Create ────────────────────────────────────────────────────────────────

func TestCreate_NotOrganizer(t *testing.T) {
	svc, _, er := newService(t)
	eventID, userID := uuid.New(), uuid.New()
	er.EXPECT().GetByID(gomock.Any(), eventID).Return(model.Event{OrganizerID: uuid.New()}, nil)

	_, err := svc.Create(context.Background(), eventID, userID, model.CreateCollectionRequest{Title: "T"})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "forbidden")
}

func TestCreate_MissingTitle(t *testing.T) {
	svc, _, er := newService(t)
	organizerID := uuid.New()
	eventID := uuid.New()
	er.EXPECT().GetByID(gomock.Any(), eventID).Return(model.Event{OrganizerID: organizerID}, nil)

	_, err := svc.Create(context.Background(), eventID, organizerID, model.CreateCollectionRequest{})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "title is required")
}

func TestCreate_HappyPath(t *testing.T) {
	svc, cr, er := newService(t)
	organizerID := uuid.New()
	eventID := uuid.New()
	req := model.CreateCollectionRequest{Title: "Venue", PerPersonAmount: 500}
	expected := model.Collection{ID: uuid.New(), EventID: eventID, Title: "Venue"}

	er.EXPECT().GetByID(gomock.Any(), eventID).Return(model.Event{OrganizerID: organizerID}, nil)
	cr.EXPECT().Create(gomock.Any(), eventID, req, organizerID).Return(expected, nil)

	result, err := svc.Create(context.Background(), eventID, organizerID, req)
	require.NoError(t, err)
	assert.Equal(t, expected.ID, result.ID)
}

// ─── Delete ────────────────────────────────────────────────────────────────

func TestDelete_WithPaidContributions(t *testing.T) {
	svc, cr, er := newService(t)
	organizerID := uuid.New()
	eventID := uuid.New()
	collectionID := uuid.New()

	er.EXPECT().GetByID(gomock.Any(), eventID).Return(model.Event{OrganizerID: organizerID}, nil)
	cr.EXPECT().GetByID(gomock.Any(), collectionID).Return(model.Collection{ID: collectionID, EventID: eventID}, nil)
	cr.EXPECT().CountPaidContributions(gomock.Any(), collectionID).Return(2, nil)

	err := svc.Delete(context.Background(), eventID, collectionID, organizerID)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "paid contributions")
}

func TestDelete_HappyPath(t *testing.T) {
	svc, cr, er := newService(t)
	organizerID := uuid.New()
	eventID := uuid.New()
	collectionID := uuid.New()

	er.EXPECT().GetByID(gomock.Any(), eventID).Return(model.Event{OrganizerID: organizerID}, nil)
	cr.EXPECT().GetByID(gomock.Any(), collectionID).Return(model.Collection{ID: collectionID, EventID: eventID}, nil)
	cr.EXPECT().CountPaidContributions(gomock.Any(), collectionID).Return(0, nil)
	cr.EXPECT().Delete(gomock.Any(), collectionID).Return(nil)

	require.NoError(t, svc.Delete(context.Background(), eventID, collectionID, organizerID))
}

// ─── SubmitContribution ───────────────────────────────────────────────────

func TestSubmitContribution_RejectsSVGDespiteMultipartContentType(t *testing.T) {
	uploader := &captureUploader{}
	svc, cr, er, _ := newServiceWithUploader(t, uploader)

	eventID, collectionID, userID := uuid.New(), uuid.New(), uuid.New()
	er.EXPECT().GetByID(gomock.Any(), eventID).Return(model.Event{ID: eventID, OrganizerID: uuid.New()}, nil)
	er.EXPECT().IsConfirmedParticipant(gomock.Any(), eventID, userID).Return(true, nil)
	cr.EXPECT().GetByID(gomock.Any(), collectionID).Return(model.Collection{ID: collectionID, EventID: eventID}, nil)
	cr.EXPECT().GetContribution(gomock.Any(), collectionID, userID).Return(model.CollectionContribution{}, errors.New("not found"))

	header := &multipart.FileHeader{Header: map[string][]string{"Content-Type": {"image/png"}}}
	file := bytes.NewReader([]byte(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`))
	_, err := svc.SubmitContribution(context.Background(), eventID, collectionID, userID, file, header)

	require.Error(t, err)
	assert.Contains(t, err.Error(), "unsupported file type")
	assert.Empty(t, uploader.contentType)
}

func TestSubmitContribution_UploadsSniffedPNG(t *testing.T) {
	uploader := &captureUploader{}
	svc, cr, er, nr := newServiceWithUploader(t, uploader)

	eventID, collectionID, userID, organizerID := uuid.New(), uuid.New(), uuid.New(), uuid.New()
	er.EXPECT().GetByID(gomock.Any(), eventID).Return(model.Event{ID: eventID, OrganizerID: organizerID}, nil)
	er.EXPECT().IsConfirmedParticipant(gomock.Any(), eventID, userID).Return(true, nil)
	cr.EXPECT().GetByID(gomock.Any(), collectionID).Return(model.Collection{ID: collectionID, EventID: eventID, Title: "Cake"}, nil)
	cr.EXPECT().GetContribution(gomock.Any(), collectionID, userID).Return(model.CollectionContribution{}, errors.New("not found"))
	cr.EXPECT().SubmitContribution(gomock.Any(), collectionID, userID, "https://cdn.example/receipt").
		Return(model.CollectionContribution{CollectionID: collectionID, UserID: userID, ReceiptURL: ptr("https://cdn.example/receipt")}, nil)
	nr.EXPECT().Create(gomock.Any(), organizerID, &eventID, "collection_contribution_pending", gomock.Any()).AnyTimes()

	png := []byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n', 0, 0, 0, 0, 'I', 'E', 'N', 'D'}
	header := &multipart.FileHeader{Header: map[string][]string{"Content-Type": {"image/svg+xml"}}}
	_, err := svc.SubmitContribution(context.Background(), eventID, collectionID, userID, bytes.NewReader(png), header)

	require.NoError(t, err)
	assert.Equal(t, "image/png", uploader.contentType)
	assert.Equal(t, png, uploader.body)
}

// ─── Summary ───────────────────────────────────────────────────────────────

func TestSummary_Forbidden(t *testing.T) {
	svc, _, er := newService(t)
	eventID, userID := uuid.New(), uuid.New()
	er.EXPECT().IsParticipant(gomock.Any(), eventID, userID).Return(false, nil)

	_, err := svc.Summary(context.Background(), eventID, userID)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "forbidden")
}

func TestSummary_HappyPath(t *testing.T) {
	svc, cr, er := newService(t)
	eventID, userID := uuid.New(), uuid.New()
	colID := uuid.New()

	er.EXPECT().IsParticipant(gomock.Any(), eventID, userID).Return(true, nil)
	er.EXPECT().CountConfirmedParticipants(gomock.Any(), eventID).Return(4, nil)
	cr.EXPECT().ListByEvent(gomock.Any(), eventID).Return([]model.Collection{
		{ID: colID, EventID: eventID, Title: "Cake", PerPersonAmount: 200},
	}, nil)
	// Paid counts батчем по событию (1 запрос вместо N).
	cr.EXPECT().PaidCountsByEvent(gomock.Any(), eventID).Return(map[uuid.UUID]int{colID: 2}, nil)

	result, err := svc.Summary(context.Background(), eventID, userID)
	require.NoError(t, err)
	assert.Len(t, result.Collections, 1)
	// 4 подтверждённых × 200 = 800 ожидается; 2 оплатили × 200 = 400 собрано.
	assert.InEpsilon(t, 800, result.GrandTotal, 0.001)
	assert.InEpsilon(t, 400, result.TotalPaid, 0.001)
}
