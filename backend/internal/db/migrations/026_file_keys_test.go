// Package migrations has no Go code of its own (the migrations are plain
// SQL, embedded and run by internal/db); this test only exists to pin down
// the regex 026_file_keys.up.sql uses to strip a stored URL down to its S3
// key. There's no DB-integration test harness in this project (every
// repository test mocks its interface instead of hitting Postgres), so this
// is the closest thing to a test of the actual migration without one:
// Postgres's regexp_replace and Go's regexp both implement POSIX/RE2-style
// character classes, and the pattern here only uses that common subset.
package migrations

import (
	"regexp"
	"testing"

	"github.com/stretchr/testify/assert"
)

var stripHostPrefix = regexp.MustCompile(`^https?://[^/]+/`)

func TestStripHostPrefix(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want string
	}{
		{
			"MinIO dev URL",
			"http://localhost:9000/avatars/avatars/u1.jpg",
			"avatars/avatars/u1.jpg",
		},
		{
			"Selectel public base URL",
			"https://bimeet-prod-uploads.s3.ru-9.storage.selcloud.ru/chat/e1/u1-abc",
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
			got := stripHostPrefix.ReplaceAllString(c.in, "")
			assert.Equal(t, c.want, got)
		})
	}
}
