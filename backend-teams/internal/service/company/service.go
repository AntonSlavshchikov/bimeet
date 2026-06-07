package companysvc

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"

	"bimeet-teams/internal/model"
	"bimeet-teams/internal/token"
)

const inviteTTL = 7 * 24 * time.Hour

var (
	ErrNotFound         = errors.New("not found")
	ErrAlreadyMember    = errors.New("a user with this email already exists in the company")
	ErrCannotSelfChange = errors.New("you cannot change your own account")
)

// ValidationError is a client-facing 400 with a human-readable message.
type ValidationError struct{ Msg string }

func (e ValidationError) Error() string { return e.Msg }

type CompanyRepo interface {
	GetByID(ctx context.Context, id uuid.UUID) (model.Company, error)
	GetBySubdomain(ctx context.Context, subdomain string) (model.Company, error)
	Update(ctx context.Context, id uuid.UUID, req model.UpdateCompanyRequest) (model.Company, error)
}

type UserRepo interface {
	GetByID(ctx context.Context, id uuid.UUID) (model.User, error)
	ExistsByCompanyAndEmail(ctx context.Context, companyID uuid.UUID, email string) (bool, error)
	ListByCompany(ctx context.Context, companyID uuid.UUID) ([]model.User, error)
	SetActive(ctx context.Context, companyID, userID uuid.UUID, active bool) (model.User, error)
}

type InvitationRepo interface {
	Create(ctx context.Context, companyID uuid.UUID, email, tokenHash string, invitedBy uuid.UUID, expiresAt time.Time) (model.Invitation, error)
}

// Mailer delivers the invitation email. Local dev points it at MailHog.
type Mailer interface {
	SendInvite(toEmail, companyName, inviteURL string) error
}

type Service struct {
	companyRepo        CompanyRepo
	userRepo           UserRepo
	inviteRepo         InvitationRepo
	mailer             Mailer
	frontendScheme     string
	frontendBaseDomain string
}

func New(companyRepo CompanyRepo, userRepo UserRepo, inviteRepo InvitationRepo, mailer Mailer, frontendScheme, frontendBaseDomain string) *Service {
	return &Service{
		companyRepo:        companyRepo,
		userRepo:           userRepo,
		inviteRepo:         inviteRepo,
		mailer:             mailer,
		frontendScheme:     frontendScheme,
		frontendBaseDomain: frontendBaseDomain,
	}
}

// inviteURL builds the accept-invite link for a company's workspace, e.g.
// http://acme.lvh.me:5174/accept-invite?token=…
func (s *Service) inviteURL(subdomain, rawToken string) string {
	return fmt.Sprintf("%s://%s.%s/accept-invite?token=%s",
		s.frontendScheme, subdomain, s.frontendBaseDomain, rawToken)
}

// Get returns the company by id.
func (s *Service) Get(ctx context.Context, companyID uuid.UUID) (model.Company, error) {
	return s.companyRepo.GetByID(ctx, companyID)
}

// Me returns the authenticated user together with their company.
func (s *Service) Me(ctx context.Context, userID, companyID uuid.UUID) (model.MeResponse, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return model.MeResponse{}, ErrNotFound
	}
	company, err := s.companyRepo.GetByID(ctx, companyID)
	if err != nil {
		return model.MeResponse{}, ErrNotFound
	}
	return model.MeResponse{User: user, Company: company}, nil
}

// PublicBySubdomain returns brand info for theming the login page (no auth).
func (s *Service) PublicBySubdomain(ctx context.Context, subdomain string) (model.PublicCompany, error) {
	c, err := s.companyRepo.GetBySubdomain(ctx, strings.ToLower(strings.TrimSpace(subdomain)))
	if err != nil {
		return model.PublicCompany{}, ErrNotFound
	}
	return model.PublicCompany{
		Name:       c.Name,
		Subdomain:  c.Subdomain,
		BrandColor: c.BrandColor,
		LogoURL:    c.LogoURL,
	}, nil
}

// Update changes branding (owner only — enforced by middleware).
func (s *Service) Update(ctx context.Context, companyID uuid.UUID, req model.UpdateCompanyRequest) (model.Company, error) {
	if req.Name != nil && strings.TrimSpace(*req.Name) == "" {
		return model.Company{}, ValidationError{"name cannot be empty"}
	}
	if req.BrandColor != nil && !isHexColor(*req.BrandColor) {
		return model.Company{}, ValidationError{"brand_color must be a hex value like #4F46E5"}
	}
	return s.companyRepo.Update(ctx, companyID, req)
}

// Invite creates an invitation and returns the raw token (MVP: no email yet —
// the owner gets the token/link back directly).
func (s *Service) Invite(ctx context.Context, companyID, invitedBy uuid.UUID, req model.InviteRequest) (model.InviteResponse, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))
	if email == "" {
		return model.InviteResponse{}, ValidationError{"email is required"}
	}

	exists, err := s.userRepo.ExistsByCompanyAndEmail(ctx, companyID, email)
	if err != nil {
		return model.InviteResponse{}, err
	}
	if exists {
		return model.InviteResponse{}, ErrAlreadyMember
	}

	raw, err := token.Generate()
	if err != nil {
		return model.InviteResponse{}, err
	}
	expiresAt := time.Now().Add(inviteTTL)

	inv, err := s.inviteRepo.Create(ctx, companyID, email, token.Hash(raw), invitedBy, expiresAt)
	if err != nil {
		return model.InviteResponse{}, err
	}

	// Email the invite link (best-effort) so it lands in MailHog during local
	// development. The token is also returned for the owner to copy directly.
	if s.mailer != nil {
		company, err := s.companyRepo.GetByID(ctx, companyID)
		if err == nil {
			url := s.inviteURL(company.Subdomain, raw)
			go func() {
				if err := s.mailer.SendInvite(email, company.Name, url); err != nil {
					slog.Error("send invite email", "to", email, "error", err)
				}
			}()
		}
	}

	return model.InviteResponse{Email: inv.Email, Token: raw, ExpiresAt: inv.ExpiresAt}, nil
}

// Members lists everyone in the company (owner only).
func (s *Service) Members(ctx context.Context, companyID uuid.UUID) ([]model.User, error) {
	return s.userRepo.ListByCompany(ctx, companyID)
}

// SetMemberActive enables/disables an account. The owner cannot disable
// themselves (would lock out the only owner).
func (s *Service) SetMemberActive(ctx context.Context, companyID, callerID, targetID uuid.UUID, active bool) (model.User, error) {
	if callerID == targetID {
		return model.User{}, ErrCannotSelfChange
	}
	return s.userRepo.SetActive(ctx, companyID, targetID, active)
}

func isHexColor(s string) bool {
	s = strings.TrimSpace(s)
	if len(s) != 4 && len(s) != 7 {
		return false
	}
	if s[0] != '#' {
		return false
	}
	for _, c := range s[1:] {
		if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')) {
			return false
		}
	}
	return true
}
