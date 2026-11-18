// Package migrations has no Go code of its own (the migrations are plain
// SQL, embedded and run by internal/db); this test only exists to pin down
// the regex 026_file_keys.up.sql uses to strip a stored URL down to its S3
// key, including the bucket segment of path-style MinIO URLs. There's no
// DB-integration test harness in this project (every repository test mocks its interface instead of hitting Postgres), so this
// is the closest thing to a test of the actual migration without one:
// Postgres's regexp_replace and Go's regexp both implement POSIX/RE2-style
// character classes, and the pattern here only uses that common subset.
package migrations

import (
	"regexp"
	"testing"

	"github.com/stretchr/testify/assert"
)

// Must stay identical to the pattern in 026_file_keys.up.sql. Postgres's
// "\1" back-reference is "${1}" in Go's ReplaceAllString.
var urlToKey = regexp.MustCompile(`^https?://.*/((avatars|chat|receipts)/)`)

func TestURLToKey(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want string
	}{
		{
			"prod MinIO avatar, bucket also named avatars",
			"https://s3.bimeet.pro/avatars/avatars/u1.jpg",
			"avatars/u1.jpg",
		},
		{
			"dev MinIO chat image",
			"http://localhost:9000/avatars/chat/e1/u1-1700000000000",
			"chat/e1/u1-1700000000000",
		},
		{
			"prod MinIO receipt",
			"https://s3.bimeet.pro/avatars/receipts/c1/u1/1700000000000",
			"receipts/c1/u1/1700000000000",
		},
		{
			"virtual-host style URL without bucket segment",
			"https://bucket.s3.example.com/chat/e1/u1-abc",
			"chat/e1/u1-abc",
		},
		{
			"already a bare key — no-op",
			"receipts/c1/u1/abc-123",
			"receipts/c1/u1/abc-123",
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := urlToKey.ReplaceAllString(c.in, "${1}")
			assert.Equal(t, c.want, got)
		})
	}
}
