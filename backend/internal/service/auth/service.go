package authsvc

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"net/mail"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"bimeet/internal/model"
	"bimeet/internal/observability"
)

const (
	loginCodeTTL    = 10 * time.Minute
	resendCooldown  = 60 * time.Second
	maxCodeAttempts = 5
	// RefreshSessionTTL is shared with the HttpOnly cookie. Access JWTs are
	// shorter-lived and remain refreshable while this server session is active.
	RefreshSessionTTL = 400 * 24 * time.Hour
	// testLoginCode is used instead of a random code when AUTH_TEST is enabled,
	// so the email provider's quota is not spent during development/tests.
	testLoginCode = "120401"
)

// Sentinel errors so the HTTP layer can map them to the right status code.
var (
	ErrInvalidCode         = errors.New("invalid or expired code")
	ErrInvalidRefreshToken = errors.New("invalid refresh token")
	ErrSessionNotFound     = errors.New("session not found")
	ErrCooldown            = errors.New("please wait before requesting a new code")
)

type Service struct {
	userRepo    UserRepo
	codeRepo    LoginCodeRepo
	refreshRepo RefreshTokenRepo
	mailer      Mailer
	jwtSecret   string
	jwtExpH     int
	authTest    bool
	passkeys    PasskeyStatus
}

type PasskeyStatus interface {
	HasPasskeys(ctx context.Context, userID uuid.UUID) (bool, error)
}

func (s *Service) SetPasskeyStatus(status PasskeyStatus) {
	s.passkeys = status
}

func New(userRepo UserRepo, codeRepo LoginCodeRepo, refreshRepo RefreshTokenRepo, mailer Mailer, jwtSecret string, jwtExpHours int, authTest bool) *Service {
	return &Service{
		userRepo:    userRepo,
		codeRepo:    codeRepo,
		refreshRepo: refreshRepo,
		mailer:      mailer,
		jwtSecret:   jwtSecret,
		jwtExpH:     jwtExpHours,
		authTest:    authTest,
	}
}

// RequestCode issues a one-time login code for the given email. To prevent
// account enumeration the caller (handler) responds 200 regardless of whether
// an account exists; the only distinguishable error is ErrCooldown.
//
// When AUTH_TEST is enabled the code is the constant testLoginCode and no email
// is sent — only logged. Otherwise a random 6-digit code is generated and
// emailed asynchronously.
func (s *Service) RequestCode(ctx context.Context, req model.RequestCodeRequest) error {
	email := normalizeEmail(req.Email)
	if email == "" {
		return fmt.Errorf("email is required")
	}
	if _, err := mail.ParseAddress(email); err != nil {
		return fmt.Errorf("invalid email address")
	}

	// Cooldown: refuse if a still-active code was issued less than a minute ago.
	if existing, err := s.codeRepo.GetActiveByEmail(ctx, email); err == nil {
		if time.Since(existing.CreatedAt) < resendCooldown {
			return ErrCooldown
		}
	}

	// Only one code is ever valid at a time — drop any previous unused ones.
	if err := s.codeRepo.InvalidateByEmail(ctx, email); err != nil {
		return fmt.Errorf("invalidate codes: %w", err)
	}

	code := testLoginCode
	if !s.authTest {
		generated, err := generateCode()
		if err != nil {
			return fmt.Errorf("generate code: %w", err)
		}
		code = generated
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(code), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash code: %w", err)
	}
	if _, err := s.codeRepo.Create(ctx, email, string(hash), time.Now().Add(loginCodeTTL)); err != nil {
		return fmt.Errorf("create login code: %w", err)
	}

	if s.authTest {
		observability.FromContext(ctx).Info("auth test mode: login code not emailed", "email", email, "code", code)
		return nil
	}

	go func(email, code string) {
		if err := s.mailer.SendLoginCode(email, code); err != nil {
			observability.FromContext(ctx).Error("request code: send email", "email", email, "error", err)
		}
	}(email, code)

	return nil
}

// VerifyCode checks a one-time code and, on success, returns a JWT for the
// matching user — creating the account on the fly if the email is new.
func (s *Service) VerifyCode(ctx context.Context, req model.VerifyCodeRequest, userAgent string) (model.AuthResponse, error) {
	email := normalizeEmail(req.Email)
	code := strings.TrimSpace(req.Code)
	if email == "" || code == "" {
		return model.AuthResponse{}, ErrInvalidCode
	}

	lc, err := s.codeRepo.GetActiveByEmail(ctx, email)
	if err != nil {
		return model.AuthResponse{}, ErrInvalidCode
	}

	// Too many wrong guesses → burn the code (brute-force protection).
	if lc.Attempts >= maxCodeAttempts {
		_ = s.codeRepo.MarkUsed(ctx, lc.ID)
		return model.AuthResponse{}, ErrInvalidCode
	}

	if bcrypt.CompareHashAndPassword([]byte(lc.CodeHash), []byte(code)) != nil {
		if err := s.codeRepo.IncAttempts(ctx, lc.ID); err != nil {
			observability.FromContext(ctx).Error("verify code: inc attempts", "error", err)
		}
		if lc.Attempts+1 >= maxCodeAttempts {
			_ = s.codeRepo.MarkUsed(ctx, lc.ID)
		}
		return model.AuthResponse{}, ErrInvalidCode
	}

	// Correct → consume the code before issuing a session.
	if err := s.codeRepo.MarkUsed(ctx, lc.ID); err != nil {
		return model.AuthResponse{}, fmt.Errorf("mark code used: %w", err)
	}

	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		user, err = s.userRepo.Create(ctx, defaultName(email), email)
		if err != nil {
			return model.AuthResponse{}, fmt.Errorf("create user: %w", err)
		}
	}

	accessToken, refreshToken, err := s.IssueSession(ctx, user.ID, userAgent)
	if err != nil {
		return model.AuthResponse{}, err
	}
	hasPasskeys := false
	if s.passkeys != nil {
		if hasPasskeys, err = s.passkeys.HasPasskeys(ctx, user.ID); err != nil {
			observability.FromContext(ctx).Warn("check passkey status after email login", "error", err)
			hasPasskeys = false
		}
	}
	return model.AuthResponse{Token: accessToken, RefreshToken: refreshToken, User: user, HasPasskeys: hasPasskeys}, nil
}

// Refresh consumes a refresh token and returns a fresh, independently rotated
// access/refresh pair. A token can succeed exactly once.
func (s *Service) Refresh(ctx context.Context, currentToken, userAgent string) (model.RefreshResponse, error) {
	if strings.TrimSpace(currentToken) == "" {
		return model.RefreshResponse{}, ErrInvalidRefreshToken
	}

	nextToken, err := generateRefreshToken()
	if err != nil {
		return model.RefreshResponse{}, fmt.Errorf("generate refresh token: %w", err)
	}
	session, ok, err := s.refreshRepo.Rotate(ctx, hashRefreshToken(currentToken), hashRefreshToken(nextToken), userAgent)
	if err != nil {
		return model.RefreshResponse{}, fmt.Errorf("rotate refresh token: %w", err)
	}
	if !ok {
		return model.RefreshResponse{}, ErrInvalidRefreshToken
	}

	accessToken, err := s.generateToken(session.UserID, session.ID)
	if err != nil {
		return model.RefreshResponse{}, err
	}
	return model.RefreshResponse{Token: accessToken, RefreshToken: nextToken}, nil
}

func (s *Service) RevokeRefreshToken(ctx context.Context, token string) error {
	if strings.TrimSpace(token) == "" {
		return nil
	}
	return s.refreshRepo.Revoke(ctx, hashRefreshToken(token))
}

func (s *Service) ListSessions(ctx context.Context, userID, currentSessionID uuid.UUID) ([]model.AuthSession, error) {
	sessions, err := s.refreshRepo.ListByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("list sessions: %w", err)
	}
	for i := range sessions {
		sessions[i].Current = sessions[i].ID == currentSessionID
	}
	return sessions, nil
}

func (s *Service) RevokeSession(ctx context.Context, userID, sessionID uuid.UUID) error {
	revoked, err := s.refreshRepo.RevokeByID(ctx, userID, sessionID)
	if err != nil {
		return fmt.Errorf("revoke session: %w", err)
	}
	if !revoked {
		return ErrSessionNotFound
	}
	return nil
}

func (s *Service) RevokeOtherSessions(ctx context.Context, userID, currentSessionID uuid.UUID) error {
	if err := s.refreshRepo.RevokeOthers(ctx, userID, currentSessionID); err != nil {
		return fmt.Errorf("revoke other sessions: %w", err)
	}
	return nil
}

// IssueSession creates the same stable refresh session for every primary
// authentication mechanism (email code and passkey).
func (s *Service) IssueSession(ctx context.Context, userID uuid.UUID, userAgent string) (string, string, error) {
	refreshToken, err := generateRefreshToken()
	if err != nil {
		return "", "", fmt.Errorf("generate refresh token: %w", err)
	}
	session, err := s.refreshRepo.Create(
		ctx,
		userID,
		hashRefreshToken(refreshToken),
		strings.TrimSpace(userAgent),
		time.Now().Add(RefreshSessionTTL),
	)
	if err != nil {
		return "", "", fmt.Errorf("store refresh token: %w", err)
	}
	accessToken, err := s.generateToken(userID, session.ID)
	if err != nil {
		_ = s.refreshRepo.Revoke(ctx, hashRefreshToken(refreshToken))
		return "", "", err
	}
	return accessToken, refreshToken, nil
}

func (s *Service) generateToken(userID, sessionID uuid.UUID) (string, error) {
	claims := jwt.MapClaims{
		"sub": userID.String(),
		"sid": sessionID.String(),
		"exp": time.Now().Add(time.Duration(s.jwtExpH) * time.Hour).Unix(),
		"iat": time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return "", fmt.Errorf("sign token: %w", err)
	}
	return signed, nil
}

// generateCode returns a uniformly random 6-digit code ("000000"–"999999").
func generateCode() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1_000_000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}

func generateRefreshToken() (string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(raw), nil
}

func hashRefreshToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func normalizeEmail(email string) string {
	return strings.TrimSpace(strings.ToLower(email))
}

// defaultName derives a display name from the local part of an email.
func defaultName(email string) string {
	if i := strings.IndexByte(email, '@'); i > 0 {
		return email[:i]
	}
	return email
}
