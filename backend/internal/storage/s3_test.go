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
func newFakeClient(endpoint string) *s3.Client {
	return s3.New(s3.Options{
		Region:       "us-east-1",
		Credentials:  credentials.NewStaticCredentialsProvider("fake-key", "fake-secret", ""),
		BaseEndpoint: aws.String(endpoint),
		UsePathStyle: true,
	})
}

func TestS3Storage_PresignGet(t *testing.T) {
	client := newFakeClient("http://internal-only:9000")
	store := NewS3(client, client, "bimeet-uploads", "http://internal-only:9000/bimeet-uploads", 5*time.Minute)

	url, err := store.PresignGet(context.Background(), "avatars/u1.jpg")
	require.NoError(t, err)
	assert.Contains(t, url, "avatars/u1.jpg")
	assert.Contains(t, url, "X-Amz-Signature=")
	assert.Contains(t, url, "X-Amz-Expires=300") // 5 minutes
}

// A regression test for exactly the bug this split is meant to prevent:
// presigning must use the endpoint passed as presignClient, never the one
// the regular client (for PutObject etc.) was built with.
func TestS3Storage_PresignGet_UsesPresignEndpoint(t *testing.T) {
	internal := newFakeClient("http://minio:9000")   // only reachable inside the backend's network
	public := newFakeClient("https://s3.bimeet.pro") // what the browser needs
	store := NewS3(internal, public, "bimeet-uploads", "https://s3.bimeet.pro/bimeet-uploads", 5*time.Minute)

	url, err := store.PresignGet(context.Background(), "avatars/u1.jpg")
	require.NoError(t, err)
	assert.Contains(t, url, "s3.bimeet.pro")
	assert.NotContains(t, url, "minio")
}

func TestNoopStorage_PresignGet(t *testing.T) {
	_, err := (&NoopStorage{}).PresignGet(context.Background(), "avatars/u1.jpg")
	assert.Error(t, err)
}

func ptr(s string) *string { return &s }
