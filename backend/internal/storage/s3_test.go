package storage_test

import (
	"context"
	"net/url"
	"testing"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"bimeet/internal/storage"
)

func newTestStorage() *storage.S3Storage {
	client := s3.New(s3.Options{
		Region:       "us-east-1",
		Credentials:  credentials.NewStaticCredentialsProvider("access", "secret", ""),
		BaseEndpoint: aws.String("http://localhost:9000"),
		UsePathStyle: true,
	})
	return storage.NewS3(client, "avatars", "http://localhost:9000/avatars")
}

func TestPresignDownload_SignsReceiptForFiveMinutes(t *testing.T) {
	store := newTestStorage()

	signed, err := store.PresignDownload(
		context.Background(),
		"http://localhost:9000/avatars/receipts/collection/user/receipt.pdf",
		5*time.Minute,
	)
	require.NoError(t, err)

	parsed, err := url.Parse(signed)
	require.NoError(t, err)
	assert.Equal(t, "/avatars/receipts/collection/user/receipt.pdf", parsed.Path)
	assert.Equal(t, "300", parsed.Query().Get("X-Amz-Expires"))
	assert.NotEmpty(t, parsed.Query().Get("X-Amz-Signature"))
}

func TestPresignDownload_RejectsURLOutsideConfiguredStorage(t *testing.T) {
	store := newTestStorage()

	_, err := store.PresignDownload(
		context.Background(),
		"https://attacker.example/receipts/private.pdf",
		5*time.Minute,
	)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid storage URL")
}

func TestPresignDownload_RejectsNonReceiptObject(t *testing.T) {
	store := newTestStorage()

	_, err := store.PresignDownload(
		context.Background(),
		"http://localhost:9000/avatars/avatars/user/avatar.png",
		5*time.Minute,
	)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "not a receipt")
}

func TestPresignDownload_UsesPublicPresignEndpoint(t *testing.T) {
	uploadClient := s3.New(s3.Options{
		Region:       "us-east-1",
		Credentials:  credentials.NewStaticCredentialsProvider("access", "secret", ""),
		BaseEndpoint: aws.String("http://minio:9000"),
		UsePathStyle: true,
	})
	publicClient := s3.New(s3.Options{
		Region:       "us-east-1",
		Credentials:  credentials.NewStaticCredentialsProvider("access", "secret", ""),
		BaseEndpoint: aws.String("https://s3.example.com"),
		UsePathStyle: true,
	})
	store := storage.NewS3WithPresigner(
		uploadClient,
		s3.NewPresignClient(publicClient),
		"avatars",
		"https://s3.example.com/avatars",
	)

	signed, err := store.PresignDownload(
		context.Background(),
		"https://s3.example.com/avatars/receipts/private.pdf",
		5*time.Minute,
	)
	require.NoError(t, err)
	parsed, err := url.Parse(signed)
	require.NoError(t, err)
	assert.Equal(t, "s3.example.com", parsed.Host)
}
