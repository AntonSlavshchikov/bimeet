package db

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"log"
	"log/slog"
	"sort"
	"strings"

	"github.com/exaring/otelpgx"
	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

func Connect(dsn string) (*pgxpool.Pool, error) {
	// ParseConfig (instead of pgxpool.New) so we can attach the otelpgx tracer:
	// every query becomes a child span under the request span. When tracing is
	// disabled the global provider is a no-op, so this adds negligible overhead.
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("pgxpool.ParseConfig: %w", err)
	}
	cfg.ConnConfig.Tracer = otelpgx.NewTracer()

	pool, err := pgxpool.NewWithConfig(context.Background(), cfg)
	if err != nil {
		return nil, fmt.Errorf("pgxpool.NewWithConfig: %w", err)
	}
	if err := pool.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("ping: %w", err)
	}
	return pool, nil
}

func Migrate(ctx context.Context, pool *pgxpool.Pool) {
	_, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		log.Fatalf("create schema_migrations: %v", err)
	}

	entries, err := fs.ReadDir(migrationsFS, "migrations")
	if err != nil {
		log.Fatalf("read migrations dir: %v", err)
	}

	// collect only .up.sql files
	var upFiles []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".up.sql") {
			upFiles = append(upFiles, e.Name())
		}
	}
	sort.Strings(upFiles)

	for _, name := range upFiles {
		version := strings.TrimSuffix(name, ".up.sql")

		var exists bool
		err := pool.QueryRow(ctx,
			"SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version=$1)", version,
		).Scan(&exists)
		if err != nil {
			log.Fatalf("check migration %s: %v", version, err)
		}
		if exists {
			continue
		}

		data, err := migrationsFS.ReadFile("migrations/" + name)
		if err != nil {
			log.Fatalf("read migration file %s: %v", name, err)
		}

		tx, err := pool.Begin(ctx)
		if err != nil {
			log.Fatalf("begin tx for migration %s: %v", version, err)
		}

		if _, err := tx.Exec(ctx, string(data)); err != nil {
			_ = tx.Rollback(ctx)
			log.Fatalf("apply migration %s: %v", version, err)
		}

		if _, err := tx.Exec(ctx,
			"INSERT INTO schema_migrations(version) VALUES($1)", version,
		); err != nil {
			_ = tx.Rollback(ctx)
			log.Fatalf("record migration %s: %v", version, err)
		}

		if err := tx.Commit(ctx); err != nil {
			log.Fatalf("commit migration %s: %v", version, err)
		}

		slog.Info("applied migration", "version", version)
	}
}
