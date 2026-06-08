package authsvc

import (
	"context"
	"errors"
	"fmt"
	"net/mail"
	"regexp"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"bimeet-teams/internal/model"
	"bimeet-teams/internal/token"
)

const minPasswordLength = 8

// Sentinel errors mapped to HTTP statuses by the handler layer.
var (
	ErrSubdomainTaken     = errors.New("subdomain is already taken")
	ErrSubdomainReserved  = errors.New("subdomain is reserved")
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrInvalidInvite      = errors.New("invalid or expired invitation")
	ErrInactive           = errors.New("account is disabled")
)

// ValidationError is a client-facing 400 with a human-readable message.
type ValidationError struct{ Msg string }

func (e ValidationError) Error() string { return e.Msg }

var subdomainRe = regexp.MustCompile(`^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$`)

// reservedSubdomains can never be claimed by a company (technical/public hosts).
var reservedSubdomains = map[string]bool{
	"app": true, "api": true, "admin": true, "www": true, "company": true,
	"mail": true, "smtp": true, "static": true, "assets": true, "cdn": true,
	"status": true, "help": true, "support": true, "blog": true,
	"dashboard": true, "teams": true, "auth": true, "login": true,
}

type CompanyRepo interface {
	Create(ctx context.Context, name, subdomain string) (model.Company, error)
	GetByID(ctx context.Context, id uuid.UUID) (model.Company, error)
	GetBySubdomain(ctx context.Context, subdomain string) (model.Company, error)
	SubdomainTaken(ctx context.Context, subdomain string) (bool, error)
}

type UserRepo interface {
	Create(ctx context.Context, companyID uuid.UUID, email, name, passwordHash, role string) (model.User, error)
	GetByCompanyAndEmail(ctx context.Context, companyID uuid.UUID, email string) (model.User, string, error)
	ExistsByCompanyAndEmail(ctx context.Context, companyID uuid.UUID, email string) (bool, error)
}

type InvitationRepo interface {
	GetActiveByTokenHash(ctx context.Context, tokenHash string) (model.Invitation, error)
	MarkAccepted(ctx context.Context, id uuid.UUID) error
}

type Service struct {
	companyRepo CompanyRepo
	userRepo    UserRepo
	inviteRepo  InvitationRepo
	jwtSecret   string
	jwtExpH     int
}

func New(companyRepo CompanyRepo, userRepo UserRepo, inviteRepo InvitationRepo, jwtSecret string, jwtExpHours int) *Service {
	return &Service{
		companyRepo: companyRepo,
		userRepo:    userRepo,
		inviteRepo:  inviteRepo,
		jwtSecret:   jwtSecret,
		jwtExpH:     jwtExpHours,
	}
}

// RegisterCompany creates a company and its owner in one step.
func (s *Service) RegisterCompany(ctx context.Context, req model.RegisterCompanyRequest) (model.AuthResponse, error) {
	email := normalizeEmail(req.Email)
	if err := validateEmail(email); err != nil {
		return model.AuthResponse{}, err
	}
	if err := validatePassword(req.Password); err != nil {
		return model.AuthResponse{}, err
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = defaultName(email)
	}
	companyName := strings.TrimSpace(req.CompanyName)
	if companyName == "" {
		return model.AuthResponse{}, ValidationError{"company name is required"}
	}

	subdomain, err := s.generateSubdomain(ctx, companyName)
	if err != nil {
		return model.AuthResponse{}, err
	}

	hash, err := hashPassword(req.Password)
	if err != nil {
		return model.AuthResponse{}, err
	}

	company, err := s.companyRepo.Create(ctx, companyName, subdomain)
	if err != nil {
		return model.AuthResponse{}, err
	}
	owner, err := s.userRepo.Create(ctx, company.ID, email, name, hash, "owner")
	if err != nil {
		return model.AuthResponse{}, err
	}

	return s.authResponse(owner, company)
}

// Login authenticates a user within the company identified by subdomain.
func (s *Service) Login(ctx context.Context, req model.LoginRequest) (model.AuthResponse, error) {
	subdomain := strings.ToLower(strings.TrimSpace(req.Subdomain))
	email := normalizeEmail(req.Email)
	if subdomain == "" || email == "" || req.Password == "" {
		return model.AuthResponse{}, ErrInvalidCredentials
	}

	company, err := s.companyRepo.GetBySubdomain(ctx, subdomain)
	if err != nil {
		return model.AuthResponse{}, ErrInvalidCredentials
	}
	user, hash, err := s.userRepo.GetByCompanyAndEmail(ctx, company.ID, email)
	if err != nil {
		return model.AuthResponse{}, ErrInvalidCredentials
	}
	if !user.IsActive {
		return model.AuthResponse{}, ErrInactive
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)) != nil {
		return model.AuthResponse{}, ErrInvalidCredentials
	}

	return s.authResponse(user, company)
}

// AcceptInvite turns an invitation into an active member account with a password.
func (s *Service) AcceptInvite(ctx context.Context, req model.AcceptInviteRequest) (model.AuthResponse, error) {
	rawToken := strings.TrimSpace(req.Token)
	if rawToken == "" {
		return model.AuthResponse{}, ErrInvalidInvite
	}
	if err := validatePassword(req.Password); err != nil {
		return model.AuthResponse{}, err
	}

	inv, err := s.inviteRepo.GetActiveByTokenHash(ctx, token.Hash(rawToken))
	if err != nil {
		return model.AuthResponse{}, ErrInvalidInvite
	}

	company, err := s.companyRepo.GetByID(ctx, inv.CompanyID)
	if err != nil {
		return model.AuthResponse{}, ErrInvalidInvite
	}

	exists, err := s.userRepo.ExistsByCompanyAndEmail(ctx, inv.CompanyID, inv.Email)
	if err != nil {
		return model.AuthResponse{}, err
	}
	if exists {
		return model.AuthResponse{}, ValidationError{"account already exists for this email"}
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = defaultName(inv.Email)
	}
	hash, err := hashPassword(req.Password)
	if err != nil {
		return model.AuthResponse{}, err
	}

	member, err := s.userRepo.Create(ctx, inv.CompanyID, inv.Email, name, hash, "member")
	if err != nil {
		return model.AuthResponse{}, err
	}
	if err := s.inviteRepo.MarkAccepted(ctx, inv.ID); err != nil {
		return model.AuthResponse{}, err
	}

	return s.authResponse(member, company)
}

func (s *Service) authResponse(user model.User, company model.Company) (model.AuthResponse, error) {
	token, err := s.generateToken(user)
	if err != nil {
		return model.AuthResponse{}, err
	}
	return model.AuthResponse{Token: token, User: user, Company: company}, nil
}

func (s *Service) generateToken(user model.User) (string, error) {
	claims := jwt.MapClaims{
		"sub":     user.ID.String(),
		"company": user.CompanyID.String(),
		"role":    user.Role,
		"exp":     time.Now().Add(time.Duration(s.jwtExpH) * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return "", fmt.Errorf("sign token: %w", err)
	}
	return signed, nil
}

// generateSubdomain derives a unique subdomain from the company name. The name
// is slugified (Cyrillic transliterated), and if the base slug is reserved or
// already taken a numeric suffix is appended (acme → acme-2 → acme-3 …) until a
// free one is found, with a random suffix as a last resort.
func (s *Service) generateSubdomain(ctx context.Context, companyName string) (string, error) {
	base := slugify(companyName)
	if base == "" || !subdomainRe.MatchString(base) {
		base = "company"
	}

	candidate := base
	for attempt := 2; attempt <= 100; attempt++ {
		free, err := s.subdomainAvailable(ctx, candidate)
		if err != nil {
			return "", err
		}
		if free {
			return candidate, nil
		}
		candidate = fmt.Sprintf("%s-%d", base, attempt)
	}

	// Astronomically unlikely fallback: collide 99 times, then go random.
	for i := 0; i < 10; i++ {
		candidate = fmt.Sprintf("%s-%s", base, uuid.New().String()[:6])
		free, err := s.subdomainAvailable(ctx, candidate)
		if err != nil {
			return "", err
		}
		if free {
			return candidate, nil
		}
	}
	return "", fmt.Errorf("could not allocate a unique subdomain for %q", companyName)
}

// subdomainAvailable is true when the subdomain is neither reserved nor taken.
func (s *Service) subdomainAvailable(ctx context.Context, sub string) (bool, error) {
	if reservedSubdomains[sub] {
		return false, nil
	}
	taken, err := s.companyRepo.SubdomainTaken(ctx, sub)
	if err != nil {
		return false, err
	}
	return !taken, nil
}

// maxBaseSubdomainLen leaves room for a "-NN" / "-xxxxxx" uniqueness suffix
// under the 30-char subdomain limit.
const maxBaseSubdomainLen = 24

// translitRU maps lowercase Cyrillic letters to their latin slug equivalents.
var translitRU = map[rune]string{
	'а': "a", 'б': "b", 'в': "v", 'г': "g", 'д': "d", 'е': "e", 'ё': "e",
	'ж': "zh", 'з': "z", 'и': "i", 'й': "i", 'к': "k", 'л': "l", 'м': "m",
	'н': "n", 'о': "o", 'п': "p", 'р': "r", 'с': "s", 'т': "t", 'у': "u",
	'ф': "f", 'х': "h", 'ц': "c", 'ч': "ch", 'ш': "sh", 'щ': "sch",
	'ъ': "", 'ы': "y", 'ь': "", 'э': "e", 'ю': "yu", 'я': "ya",
}

// slugify turns an arbitrary company name into a subdomain-safe base: lowercased,
// Cyrillic transliterated, every other non-alphanumeric run collapsed to a single
// hyphen, trimmed, and capped to maxBaseSubdomainLen.
func slugify(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	var b strings.Builder
	for _, r := range s {
		if tr, ok := translitRU[r]; ok {
			b.WriteString(tr)
			continue
		}
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
		default:
			b.WriteByte('-')
		}
	}
	parts := strings.FieldsFunc(b.String(), func(r rune) bool { return r == '-' })
	slug := strings.Join(parts, "-")
	if len(slug) > maxBaseSubdomainLen {
		slug = strings.Trim(slug[:maxBaseSubdomainLen], "-")
	}
	return slug
}

// ─── helpers ───────────────────────────────────────────────────────────────

func hashPassword(pw string) (string, error) {
	h, err := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("hash password: %w", err)
	}
	return string(h), nil
}

func validateEmail(email string) error {
	if email == "" {
		return ValidationError{"email is required"}
	}
	if _, err := mail.ParseAddress(email); err != nil {
		return ValidationError{"invalid email address"}
	}
	return nil
}

func validatePassword(pw string) error {
	if len(pw) < minPasswordLength {
		return ValidationError{fmt.Sprintf("password must be at least %d characters", minPasswordLength)}
	}
	return nil
}

func normalizeEmail(email string) string {
	return strings.TrimSpace(strings.ToLower(email))
}

func defaultName(email string) string {
	if i := strings.IndexByte(email, '@'); i > 0 {
		return email[:i]
	}
	return email
}
