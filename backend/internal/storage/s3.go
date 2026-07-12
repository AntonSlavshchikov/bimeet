package storage

import (
	"context"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// S3Storage uploads files to AWS S3.
type S3Storage struct {
	client    *s3.Client
	presigner *s3.PresignClient
	bucket    string
	publicURL string // e.g. "https://<bucket>.s3.<region>.amazonaws.com"
}

func NewS3(client *s3.Client, bucket, publicURL string) *S3Storage {
	return NewS3WithPresigner(client, s3.NewPresignClient(client), bucket, publicURL)
}

func NewS3WithPresigner(client *s3.Client, presigner *s3.PresignClient, bucket, publicURL string) *S3Storage {
	return &S3Storage{client: client, presigner: presigner, bucket: bucket, publicURL: publicURL}
}

// Upload puts an object at the given key and returns its public URL.
func (s *S3Storage) Upload(ctx context.Context, key, contentType string, body io.Reader) (string, error) {
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(key),
		Body:        body,
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return "", fmt.Errorf("s3 upload %q: %w", key, err)
	}
	return s.publicURL + "/" + key, nil
}

// PresignDownload returns a short-lived URL for a receipt object. The stored
// reference must have been produced by this storage and must point to receipts/.
func (s *S3Storage) PresignDownload(ctx context.Context, storedURL string, ttl time.Duration) (string, error) {
	prefix := strings.TrimRight(s.publicURL, "/") + "/"
	if !strings.HasPrefix(storedURL, prefix) {
		return "", fmt.Errorf("invalid storage URL")
	}
	key := strings.TrimPrefix(storedURL, prefix)
	if !strings.HasPrefix(key, "receipts/") {
		return "", fmt.Errorf("object is not a receipt")
	}

	request, err := s.presigner.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}, func(options *s3.PresignOptions) {
		options.Expires = ttl
	})
	if err != nil {
		return "", fmt.Errorf("presign receipt %q: %w", key, err)
	}
	return request.URL, nil
}

// NoopStorage is used when S3 is not configured.
type NoopStorage struct{}

func (n *NoopStorage) Upload(_ context.Context, _, _ string, _ io.Reader) (string, error) {
	return "", fmt.Errorf("avatar storage is not configured")
}

func (n *NoopStorage) PresignDownload(_ context.Context, _ string, _ time.Duration) (string, error) {
	return "", fmt.Errorf("receipt storage is not configured")
}
