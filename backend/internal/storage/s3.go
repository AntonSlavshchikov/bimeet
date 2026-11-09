package storage

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// FilesRoutePrefix is where the API serves object storage files from — see
// handler/files. The bucket itself is private; every URL the API hands out
// for a stored file points here instead of at S3/the presigned URL directly,
// so a fresh presigned URL (short TTL) gets minted on every request instead
// of one being baked into a response that might be read much later (a
// chat open for hours, a profile page left open).
const FilesRoutePrefix = "/api/files/"

// FileURL turns a stored object key into the stable path the frontend
// already expects in avatar_url/image_url/receipt_url. A nil or empty key
// (no file set) stays nil.
func FileURL(key *string) *string {
	if key == nil || *key == "" {
		return nil
	}
	v := FilesRoutePrefix + *key
	return &v
}

// S3Storage uploads files to, and presigns GETs against, an S3-compatible
// bucket (AWS S3, MinIO, or Selectel Object Storage — path-style for the
// latter two, see cmd/server/main.go).
type S3Storage struct {
	client     *s3.Client
	presign    *s3.PresignClient
	bucket     string
	publicURL  string // e.g. "https://<bucket>.s3.<region>.amazonaws.com" — kept only for the Uploader interface's return value, not used for reads.
	presignTTL time.Duration
}

func NewS3(client *s3.Client, bucket, publicURL string, presignTTL time.Duration) *S3Storage {
	return &S3Storage{
		client:     client,
		presign:    s3.NewPresignClient(client),
		bucket:     bucket,
		publicURL:  publicURL,
		presignTTL: presignTTL,
	}
}

// Upload puts an object at the given key. The returned URL is never stored —
// callers already know the key they uploaded under and that's what goes in
// the DB (see storage.FileURL) — this return value only satisfies the
// Uploader interface shared with callers that historically expected one.
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

// PresignGet returns a time-limited GET URL for key. Called fresh on every
// /api/files/ request (handler/files), so the TTL only needs to outlive one
// redirect-then-fetch round trip, not how long the frontend might keep
// displaying the file.
func (s *S3Storage) PresignGet(ctx context.Context, key string) (string, error) {
	req, err := s.presign.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(s.presignTTL))
	if err != nil {
		return "", fmt.Errorf("presign %q: %w", key, err)
	}
	return req.URL, nil
}

// NoopStorage is used when S3 is not configured.
type NoopStorage struct{}

func (n *NoopStorage) Upload(_ context.Context, _, _ string, _ io.Reader) (string, error) {
	return "", fmt.Errorf("avatar storage is not configured")
}

func (n *NoopStorage) PresignGet(_ context.Context, _ string) (string, error) {
	return "", fmt.Errorf("file storage is not configured")
}
