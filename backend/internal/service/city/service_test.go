package citysvc_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"bimeet/internal/model"
	citysvc "bimeet/internal/service/city"
	"bimeet/internal/service/city/mock"
)

func TestList_ReturnsRepositoryCatalog(t *testing.T) {
	ctrl := gomock.NewController(t)
	repo := mock.NewMockCityRepo(ctrl)
	want := []model.City{{ID: uuid.New(), Name: "Омск", Region: "Омская область"}}
	repo.EXPECT().ListActive(gomock.Any()).Return(want, nil)

	got, err := citysvc.New(repo).List(context.Background())
	require.NoError(t, err)
	require.Equal(t, want, got)
}
