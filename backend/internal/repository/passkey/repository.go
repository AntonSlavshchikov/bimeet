package passkeyrepo

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"math"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"bimeet/internal/model"
	"bimeet/internal/secret"
)

type Repository struct {
	pool   *pgxpool.Pool
	cipher *secret.PasskeyCipher
}

var ErrCredentialLimit = errors.New("passkey credential limit reached")

func New(pool *pgxpool.Pool, cipher *secret.PasskeyCipher) *Repository {
	return &Repository{pool: pool, cipher: cipher}
}

func (r *Repository) GetOrCreateHandle(ctx context.Context, userID uuid.UUID, rpID string) ([]byte, error) {
	handle := make([]byte, 32)
	if _, err := rand.Read(handle); err != nil {
		return nil, fmt.Errorf("generate passkey user handle: %w", err)
	}
	var stored []byte
	err := r.pool.QueryRow(ctx, `
		INSERT INTO webauthn_users (rp_id, user_id, handle)
		VALUES ($1, $2, $3)
		ON CONFLICT (rp_id, user_id) DO UPDATE SET user_id = EXCLUDED.user_id
		RETURNING handle
	`, rpID, userID, handle).Scan(&stored)
	if err != nil {
		return nil, fmt.Errorf("get or create passkey user: %w", err)
	}
	return stored, nil
}

func (r *Repository) FindUserID(ctx context.Context, rpID string, credentialID, handle []byte) (uuid.UUID, error) {
	var userID uuid.UUID
	err := r.pool.QueryRow(ctx, `
		SELECT pc.user_id
		FROM passkey_credentials pc
		JOIN webauthn_users wu ON wu.user_id=pc.user_id AND wu.rp_id=pc.rp_id
		WHERE pc.rp_id=$1 AND pc.credential_id=$2 AND wu.handle=$3
	`, rpID, credentialID, handle).Scan(&userID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("find passkey user: %w", err)
	}
	return userID, nil
}

func (r *Repository) ListCredentials(ctx context.Context, userID uuid.UUID, rpID string) ([]model.PasskeyCredential, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, rp_id, credential_id, name, credential_data,
		       sign_count, clone_warning, created_at, last_used_at
		FROM passkey_credentials
		WHERE user_id=$1 AND rp_id=$2
		ORDER BY created_at
	`, userID, rpID)
	if err != nil {
		return nil, fmt.Errorf("list passkey credentials: %w", err)
	}
	defer rows.Close()

	credentials := make([]model.PasskeyCredential, 0)
	for rows.Next() {
		record, err := scanCredential(rows)
		if err != nil {
			return nil, fmt.Errorf("scan passkey credential: %w", err)
		}
		credentials = append(credentials, record)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate passkey credentials: %w", err)
	}
	return credentials, nil
}

func (r *Repository) DecodeCredentials(records []model.PasskeyCredential) ([]webauthn.Credential, error) {
	credentials := make([]webauthn.Credential, 0, len(records))
	for _, record := range records {
		plaintext, err := r.cipher.Decrypt(record.CredentialData)
		if err != nil {
			return nil, fmt.Errorf("decrypt passkey %s: %w", record.ID, err)
		}
		var credential webauthn.Credential
		if err := json.Unmarshal(plaintext, &credential); err != nil {
			return nil, fmt.Errorf("decode passkey %s: %w", record.ID, err)
		}
		credential.Authenticator.SignCount = record.SignCount
		credential.Authenticator.CloneWarning = credential.Authenticator.CloneWarning || record.CloneWarning
		credentials = append(credentials, credential)
	}
	return credentials, nil
}

func (r *Repository) CreateCredential(ctx context.Context, userID uuid.UUID, rpID, name string, credential webauthn.Credential) (model.Passkey, error) {
	encoded, err := json.Marshal(credential)
	if err != nil {
		return model.Passkey{}, fmt.Errorf("encode passkey credential: %w", err)
	}
	encrypted, err := r.cipher.Encrypt(encoded)
	if err != nil {
		return model.Passkey{}, err
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return model.Passkey{}, fmt.Errorf("begin passkey credential transaction: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	// Serialize registrations per account/RP so concurrent ceremonies cannot
	// cross the ten-credential limit.
	if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1::text || ':' || $2, 0))`, userID, rpID); err != nil {
		return model.Passkey{}, fmt.Errorf("lock passkey account: %w", err)
	}
	var count int
	if err := tx.QueryRow(ctx, `SELECT count(*) FROM passkey_credentials WHERE user_id=$1 AND rp_id=$2`, userID, rpID).Scan(&count); err != nil {
		return model.Passkey{}, fmt.Errorf("count passkeys before create: %w", err)
	}
	if count >= 10 {
		return model.Passkey{}, ErrCredentialLimit
	}

	var passkey model.Passkey
	err = tx.QueryRow(ctx, `
		INSERT INTO passkey_credentials
		    (user_id, rp_id, credential_id, name, credential_data, sign_count, clone_warning)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, name, created_at, last_used_at
	`, userID, rpID, credential.ID, name, encrypted, credential.Authenticator.SignCount, credential.Authenticator.CloneWarning).Scan(
		&passkey.ID, &passkey.Name, &passkey.CreatedAt, &passkey.LastUsedAt,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return model.Passkey{}, fmt.Errorf("credential already registered")
		}
		return model.Passkey{}, fmt.Errorf("create passkey credential: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return model.Passkey{}, fmt.Errorf("commit passkey credential: %w", err)
	}
	return passkey, nil
}

func (r *Repository) UpdateCredential(ctx context.Context, userID uuid.UUID, rpID string, credential webauthn.Credential) error {
	encoded, err := json.Marshal(credential)
	if err != nil {
		return fmt.Errorf("encode updated passkey: %w", err)
	}
	encrypted, err := r.cipher.Encrypt(encoded)
	if err != nil {
		return err
	}
	result, err := r.pool.Exec(ctx, `
		UPDATE passkey_credentials
		SET credential_data=$1,
		    sign_count=GREATEST(sign_count, $2),
		    clone_warning=clone_warning OR $3,
		    last_used_at=NOW()
		WHERE user_id=$4 AND rp_id=$5 AND credential_id=$6
	`, encrypted, credential.Authenticator.SignCount, credential.Authenticator.CloneWarning, userID, rpID, credential.ID)
	if err != nil {
		return fmt.Errorf("update passkey credential: %w", err)
	}
	if result.RowsAffected() != 1 {
		return fmt.Errorf("update passkey credential: credential no longer exists")
	}
	return nil
}

func (r *Repository) List(ctx context.Context, userID uuid.UUID, rpID string) ([]model.Passkey, error) {
	records, err := r.ListCredentials(ctx, userID, rpID)
	if err != nil {
		return nil, err
	}
	passkeys := make([]model.Passkey, len(records))
	for i := range records {
		passkeys[i] = records[i].Passkey
	}
	return passkeys, nil
}

func (r *Repository) Count(ctx context.Context, userID uuid.UUID, rpID string) (int, error) {
	var count int
	if err := r.pool.QueryRow(ctx,
		`SELECT count(*) FROM passkey_credentials WHERE user_id=$1 AND rp_id=$2`, userID, rpID,
	).Scan(&count); err != nil {
		return 0, fmt.Errorf("count passkeys: %w", err)
	}
	return count, nil
}

func (r *Repository) Rename(ctx context.Context, userID, id uuid.UUID, name string) (bool, error) {
	result, err := r.pool.Exec(ctx,
		`UPDATE passkey_credentials SET name=$1 WHERE id=$2 AND user_id=$3`, name, id, userID,
	)
	if err != nil {
		return false, fmt.Errorf("rename passkey: %w", err)
	}
	return result.RowsAffected() > 0, nil
}

func (r *Repository) Delete(ctx context.Context, userID, id uuid.UUID) (bool, error) {
	result, err := r.pool.Exec(ctx,
		`DELETE FROM passkey_credentials WHERE id=$1 AND user_id=$2`, id, userID,
	)
	if err != nil {
		return false, fmt.Errorf("delete passkey: %w", err)
	}
	return result.RowsAffected() > 0, nil
}

func (r *Repository) CreateCeremony(ctx context.Context, ceremony model.PasskeyCeremony) error {
	_, _ = r.pool.Exec(ctx, `DELETE FROM passkey_ceremonies WHERE expires_at <= NOW()`)
	_, err := r.pool.Exec(ctx, `
		INSERT INTO passkey_ceremonies (id, kind, user_id, session_data, expires_at)
		VALUES ($1, $2, $3, $4, $5)
	`, ceremony.ID, ceremony.Kind, ceremony.UserID, ceremony.SessionData, ceremony.ExpiresAt)
	if err != nil {
		return fmt.Errorf("create passkey ceremony: %w", err)
	}
	return nil
}

func (r *Repository) ConsumeCeremony(ctx context.Context, id uuid.UUID, kind string) (model.PasskeyCeremony, bool, error) {
	var ceremony model.PasskeyCeremony
	err := r.pool.QueryRow(ctx, `
		DELETE FROM passkey_ceremonies
		WHERE id=$1 AND kind=$2 AND expires_at > NOW()
		RETURNING id, kind, user_id, session_data, expires_at
	`, id, kind).Scan(&ceremony.ID, &ceremony.Kind, &ceremony.UserID, &ceremony.SessionData, &ceremony.ExpiresAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return model.PasskeyCeremony{}, false, nil
		}
		return model.PasskeyCeremony{}, false, fmt.Errorf("consume passkey ceremony: %w", err)
	}
	return ceremony, true, nil
}

func scanCredential(row interface{ Scan(...any) error }) (model.PasskeyCredential, error) {
	var record model.PasskeyCredential
	var signCount int64
	err := row.Scan(
		&record.ID, &record.UserID, &record.RPID, &record.CredentialID, &record.Name,
		&record.CredentialData, &signCount, &record.CloneWarning, &record.CreatedAt, &record.LastUsedAt,
	)
	if err != nil {
		return model.PasskeyCredential{}, err
	}
	if signCount < 0 || signCount > math.MaxUint32 {
		return model.PasskeyCredential{}, fmt.Errorf("invalid sign count")
	}
	record.SignCount = uint32(signCount)
	return record, nil
}
