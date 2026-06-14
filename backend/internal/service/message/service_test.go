package messagesvc_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"bimeet/internal/model"
	messagesvc "bimeet/internal/service/message"
	"bimeet/internal/service/message/mock"
)

func newService(t *testing.T) (*messagesvc.Service, *mock.MockMessageRepo, *mock.MockEventRepo, *mock.MockNotifier) {
	t.Helper()
	ctrl := gomock.NewController(t)
	mr := mock.NewMockMessageRepo(ctrl)
	er := mock.NewMockEventRepo(ctrl)
	nf := mock.NewMockNotifier(ctrl)
	return messagesvc.New(mr, er, nf), mr, er, nf
}

func TestList_Forbidden(t *testing.T) {
	svc, _, er, _ := newService(t)
	eventID, userID := uuid.New(), uuid.New()
	er.EXPECT().IsParticipant(gomock.Any(), eventID, userID).Return(false, nil)

	_, err := svc.List(context.Background(), eventID, userID, 0)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "forbidden")
}

func TestList_HappyPath(t *testing.T) {
	svc, mr, er, _ := newService(t)
	eventID, userID := uuid.New(), uuid.New()
	er.EXPECT().IsParticipant(gomock.Any(), eventID, userID).Return(true, nil)
	mr.EXPECT().ListByEvent(gomock.Any(), eventID, userID, gomock.Nil(), 50).Return([]model.Message{}, nil)

	_, err := svc.List(context.Background(), eventID, userID, 0)
	require.NoError(t, err)
}

func TestPost_EmptyBody(t *testing.T) {
	svc, _, er, _ := newService(t)
	eventID, userID := uuid.New(), uuid.New()
	er.EXPECT().IsParticipant(gomock.Any(), eventID, userID).Return(true, nil)

	_, err := svc.Post(context.Background(), eventID, userID, model.PostMessageRequest{Body: "   "})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "required")
}

func TestPost_Forbidden(t *testing.T) {
	svc, _, er, _ := newService(t)
	eventID, userID := uuid.New(), uuid.New()
	er.EXPECT().IsParticipant(gomock.Any(), eventID, userID).Return(false, nil)

	_, err := svc.Post(context.Background(), eventID, userID, model.PostMessageRequest{Body: "hi"})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "forbidden")
}

func TestDelete_ByAuthor(t *testing.T) {
	svc, mr, _, _ := newService(t)
	eventID, userID, msgID := uuid.New(), uuid.New(), uuid.New()
	mr.EXPECT().GetByID(gomock.Any(), msgID, userID).Return(model.Message{ID: msgID, EventID: eventID, IsMine: true}, nil)
	mr.EXPECT().SoftDelete(gomock.Any(), msgID).Return(nil)

	require.NoError(t, svc.Delete(context.Background(), eventID, msgID, userID))
}

func TestDelete_ByOrganizer(t *testing.T) {
	svc, mr, er, _ := newService(t)
	eventID, organizerID, msgID := uuid.New(), uuid.New(), uuid.New()
	mr.EXPECT().GetByID(gomock.Any(), msgID, organizerID).Return(model.Message{ID: msgID, EventID: eventID, IsMine: false}, nil)
	er.EXPECT().GetByID(gomock.Any(), eventID).Return(model.Event{ID: eventID, OrganizerID: organizerID}, nil)
	mr.EXPECT().SoftDelete(gomock.Any(), msgID).Return(nil)

	require.NoError(t, svc.Delete(context.Background(), eventID, msgID, organizerID))
}

func TestDelete_Forbidden(t *testing.T) {
	svc, mr, er, _ := newService(t)
	eventID, strangerID, msgID := uuid.New(), uuid.New(), uuid.New()
	mr.EXPECT().GetByID(gomock.Any(), msgID, strangerID).Return(model.Message{ID: msgID, EventID: eventID, IsMine: false}, nil)
	er.EXPECT().GetByID(gomock.Any(), eventID).Return(model.Event{ID: eventID, OrganizerID: uuid.New()}, nil)

	err := svc.Delete(context.Background(), eventID, msgID, strangerID)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "forbidden")
}
