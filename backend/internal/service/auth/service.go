package authsvc

import (
	"context"
	"crypto/rand"
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
	// testLoginCode is used instead of a random code when AUTH_TEST is enabled,
	// so the email provider's quota is not spent during development/tests.
	testLoginCode = "120401"
)

// Sentinel errors so the HTTP layer can map them to the right status code.
var (
	ErrInvalidCode = errors.New("invalid or expired code")
	ErrCooldown    = errors.New("please wait before requesting a new code")
)

type Service struct {
	userRepo        UserRepo
	codeRepo        LoginCodeRepo
	mailer          Mailer
	jwtSecret       string
	jwtExpH         int
	jwtRememberExpH int
	authTest        bool
}

func New(userRepo UserRepo, codeRepo LoginCodeRepo, mailer Mailer, jwtSecret string, jwtExpHours, jwtRememberExpHours int, authTest bool) *Service {
	return &Service{
		userRepo:        userRepo,
		codeRepo:        codeRepo,
		mailer:          mailer,
		jwtSecret:       jwtSecret,
		jwtExpH:         jwtExpHours,
		jwtRememberExpH: jwtRememberExpHours,
		authTest:        authTest,
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
func (s *Service) VerifyCode(ctx context.Context, req model.VerifyCodeRequest) (model.AuthResponse, error) {
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

	expHours := s.jwtExpH
	if req.RememberMe {
		expHours = s.jwtRememberExpH
	}
	token, err := s.generateToken(user.ID, time.Duration(expHours)*time.Hour)
	if err != nil {
		return model.AuthResponse{}, err
	}
	return model.AuthResponse{Token: token, User: user}, nil
}

func (s *Service) generateToken(userID uuid.UUID, ttl time.Duration) (string, error) {
	now := time.Now()
	claims := jwt.MapClaims{
		"sub": userID.String(),
		"exp": now.Add(ttl).Unix(),
		"iat": now.Unix(),
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
