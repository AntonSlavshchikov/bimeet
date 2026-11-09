package storage

import (
	"context"
	"testing"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFileURL(t *testing.T) {
	cases := []struct {
		name string
		key  *string
		want *string
	}{
		{"nil key stays nil", nil, nil},
		{"empty key stays nil", ptr(""), nil},
		{"key becomes a /api/files/ path", ptr("avatars/u1.jpg"), ptr("/api/files/avatars/u1.jpg")},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := FileURL(c.key)
			if c.want == nil {
				assert.Nil(t, got)
				return
			}
			require.NotNil(t, got)
			assert.Equal(t, *c.want, *got)
		})
	}
}

// PresignGetObject only signs a URL locally against the given credentials —
// it makes no network call — so this exercises the real AWS SDK presigner
// with fake static credentials, no S3/MinIO server needed.
func TestS3Storage_PresignGet(t *testing.T) {
	client := s3.New(s3.Options{
		Region:       "us-east-1",
		Credentials:  credentials.NewStaticCredentialsProvider("fake-key", "fake-secret", ""),
		BaseEndpoint: aws.String("http://127.0.0.1:0"),
		UsePathStyle: true,
	})
	store := NewS3(client, "bimeet-uploads", "http://127.0.0.1:0/bimeet-uploads", 5*time.Minute)

	url, err := store.PresignGet(context.Background(), "avatars/u1.jpg")
	require.NoError(t, err)
	assert.Contains(t, url, "avatars/u1.jpg")
	assert.Contains(t, url, "X-Amz-Signature=")
	assert.Contains(t, url, "X-Amz-Expires=300") // 5 minutes
}

func TestNoopStorage_PresignGet(t *testing.T) {
	_, err := (&NoopStorage{}).PresignGet(context.Background(), "avatars/u1.jpg")
	assert.Error(t, err)
}

func ptr(s string) *string { return &s }
