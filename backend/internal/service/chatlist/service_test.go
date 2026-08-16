package chatlistsvc_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"bimeet/internal/model"
	chatlistsvc "bimeet/internal/service/chatlist"
	"bimeet/internal/service/chatlist/mock"
)

func newService(t *testing.T) (*chatlistsvc.Service, *mock.MockChatListRepo) {
	t.Helper()
	ctrl := gomock.NewController(t)
	repo := mock.NewMockChatListRepo(ctrl)
	return chatlistsvc.New(repo), repo
}

func TestList_PassesThroughToRepo(t *testing.T) {
	svc, repo := newService(t)
	userID := uuid.New()
	eventID := uuid.New()
	expected := []model.ChatSummary{{EventID: eventID, EventTitle: "Standing chat"}}
	repo.EXPECT().ListForUser(gomock.Any(), userID).Return(expected, nil)

	result, err := svc.List(context.Background(), userID)
	require.NoError(t, err)
	assert.Equal(t, expected, result)
}

func TestList_RepoError(t *testing.T) {
	svc, repo := newService(t)
	userID := uuid.New()
	repo.EXPECT().ListForUser(gomock.Any(), userID).Return(nil, assert.AnError)

	_, err := svc.List(context.Background(), userID)
	require.Error(t, err)
}
