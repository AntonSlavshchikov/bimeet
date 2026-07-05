package pushsvc_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	pushsvc "bimeet/internal/service/push"
	"bimeet/internal/service/push/mock"
)

func TestUnsubscribeDeletesOnlyCallerEndpoint(t *testing.T) {
	ctrl := gomock.NewController(t)
	repo := mock.NewMockSubscriptionRepo(ctrl)
	svc := pushsvc.New(repo, pushsvc.Config{})

	userID := uuid.New()
	endpoint := "https://push.example/sub/1"
	repo.EXPECT().DeleteByEndpoint(gomock.Any(), userID, endpoint).Return(nil)

	require.NoError(t, svc.Unsubscribe(context.Background(), userID, endpoint))
}
