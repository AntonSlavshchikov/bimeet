package authsvc

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"

	"bimeet-teams/internal/model"
	"bimeet-teams/internal/token"
)

// ─── in-memory fakes (stdlib only, no mock framework) ───────────────────────

type fakeCompanyRepo struct {
	bySubdomain map[string]model.Company
	byID        map[uuid.UUID]model.Company
}

func newFakeCompanyRepo() *fakeCompanyRepo {
	return &fakeCompanyRepo{bySubdomain: map[string]model.Company{}, byID: map[uuid.UUID]model.Company{}}
}

func (f *fakeCompanyRepo) Create(_ context.Context, name, subdomain string) (model.Company, error) {
	c := model.Company{ID: uuid.New(), Name: name, Subdomain: subdomain, BrandColor: "#4F46E5"}
	f.bySubdomain[subdomain] = c
	f.byID[c.ID] = c
	return c, nil
}
func (f *fakeCompanyRepo) GetByID(_ context.Context, id uuid.UUID) (model.Company, error) {
	c, ok := f.byID[id]
	if !ok {
		return model.Company{}, errors.New("not found")
	}
	return c, nil
}
func (f *fakeCompanyRepo) GetBySubdomain(_ context.Context, subdomain string) (model.Company, error) {
	c, ok := f.bySubdomain[subdomain]
	if !ok {
		return model.Company{}, errors.New("not found")
	}
	return c, nil
}
func (f *fakeCompanyRepo) SubdomainTaken(_ context.Context, subdomain string) (bool, error) {
	_, ok := f.bySubdomain[subdomain]
	return ok, nil
}

type storedUser struct {
	user model.User
	hash string
}

type fakeUserRepo struct {
	byKey map[string]storedUser // companyID|email
}

func newFakeUserRepo() *fakeUserRepo { return &fakeUserRepo{byKey: map[string]storedUser{}} }

func key(companyID uuid.UUID, email string) string { return companyID.String() + "|" + email }

func (f *fakeUserRepo) Create(_ context.Context, companyID uuid.UUID, email, name, passwordHash, role string) (model.User, error) {
	u := model.User{ID: uuid.New(), CompanyID: companyID, Email: email, Name: name, Role: role, IsActive: true}
	f.byKey[key(companyID, email)] = storedUser{user: u, hash: passwordHash}
	return u, nil
}
func (f *fakeUserRepo) GetByCompanyAndEmail(_ context.Context, companyID uuid.UUID, email string) (model.User, string, error) {
	su, ok := f.byKey[key(companyID, email)]
	if !ok {
		return model.User{}, "", errors.New("not found")
	}
	return su.user, su.hash, nil
}
func (f *fakeUserRepo) ExistsByCompanyAndEmail(_ context.Context, companyID uuid.UUID, email string) (bool, error) {
	_, ok := f.byKey[key(companyID, email)]
	return ok, nil
}

type fakeInviteRepo struct {
	byHash   map[string]model.Invitation
	accepted map[uuid.UUID]bool
}

func newFakeInviteRepo() *fakeInviteRepo {
	return &fakeInviteRepo{byHash: map[string]model.Invitation{}, accepted: map[uuid.UUID]bool{}}
}
func (f *fakeInviteRepo) GetActiveByTokenHash(_ context.Context, tokenHash string) (model.Invitation, error) {
	inv, ok := f.byHash[tokenHash]
	if !ok || f.accepted[inv.ID] {
		return model.Invitation{}, errors.New("not found")
	}
	return inv, nil
}
func (f *fakeInviteRepo) MarkAccepted(_ context.Context, id uuid.UUID) error {
	f.accepted[id] = true
	return nil
}

func newService() (*Service, *fakeCompanyRepo, *fakeUserRepo, *fakeInviteRepo) {
	cr, ur, ir := newFakeCompanyRepo(), newFakeUserRepo(), newFakeInviteRepo()
	return New(cr, ur, ir, "test-secret", 72), cr, ur, ir
}

// ─── RegisterCompany ────────────────────────────────────────────────────────

func TestRegisterCompany_HappyPath(t *testing.T) {
	svc, _, _, _ := newService()
	resp, err := svc.RegisterCompany(context.Background(), model.RegisterCompanyRequest{
		Email: "owner@acme.io", Password: "supersecret", CompanyName: "Acme", Subdomain: "acme",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Token == "" {
		t.Fatal("expected a token")
	}
	if resp.User.Role != "owner" {
		t.Fatalf("expected owner role, got %q", resp.User.Role)
	}
	if resp.Company.Subdomain != "acme" {
		t.Fatalf("expected subdomain acme, got %q", resp.Company.Subdomain)
	}
}

func TestRegisterCompany_ReservedSubdomain(t *testing.T) {
	svc, _, _, _ := newService()
	_, err := svc.RegisterCompany(context.Background(), model.RegisterCompanyRequest{
		Email: "a@b.io", Password: "supersecret", CompanyName: "X", Subdomain: "admin",
	})
	if !errors.Is(err, ErrSubdomainReserved) {
		t.Fatalf("expected ErrSubdomainReserved, got %v", err)
	}
}

func TestRegisterCompany_InvalidSubdomain(t *testing.T) {
	svc, _, _, _ := newService()
	_, err := svc.RegisterCompany(context.Background(), model.RegisterCompanyRequest{
		Email: "a@b.io", Password: "supersecret", CompanyName: "X", Subdomain: "Ac",
	})
	var verr ValidationError
	if !errors.As(err, &verr) {
		t.Fatalf("expected ValidationError, got %v", err)
	}
}

func TestRegisterCompany_DuplicateSubdomain(t *testing.T) {
	svc, _, _, _ := newService()
	req := model.RegisterCompanyRequest{Email: "a@b.io", Password: "supersecret", CompanyName: "X", Subdomain: "acme"}
	if _, err := svc.RegisterCompany(context.Background(), req); err != nil {
		t.Fatalf("first register failed: %v", err)
	}
	req.Email = "c@d.io"
	_, err := svc.RegisterCompany(context.Background(), req)
	if !errors.Is(err, ErrSubdomainTaken) {
		t.Fatalf("expected ErrSubdomainTaken, got %v", err)
	}
}

func TestRegisterCompany_ShortPassword(t *testing.T) {
	svc, _, _, _ := newService()
	_, err := svc.RegisterCompany(context.Background(), model.RegisterCompanyRequest{
		Email: "a@b.io", Password: "short", CompanyName: "X", Subdomain: "acme",
	})
	var verr ValidationError
	if !errors.As(err, &verr) {
		t.Fatalf("expected ValidationError for short password, got %v", err)
	}
}

// ─── Login ──────────────────────────────────────────────────────────────────

func TestLogin_HappyPath(t *testing.T) {
	svc, _, _, _ := newService()
	_, _ = svc.RegisterCompany(context.Background(), model.RegisterCompanyRequest{
		Email: "owner@acme.io", Password: "supersecret", CompanyName: "Acme", Subdomain: "acme",
	})

	resp, err := svc.Login(context.Background(), model.LoginRequest{
		Subdomain: "acme", Email: "owner@acme.io", Password: "supersecret",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Token == "" {
		t.Fatal("expected token")
	}
}

func TestLogin_WrongPassword(t *testing.T) {
	svc, _, _, _ := newService()
	_, _ = svc.RegisterCompany(context.Background(), model.RegisterCompanyRequest{
		Email: "owner@acme.io", Password: "supersecret", CompanyName: "Acme", Subdomain: "acme",
	})

	_, err := svc.Login(context.Background(), model.LoginRequest{
		Subdomain: "acme", Email: "owner@acme.io", Password: "wrongpassword",
	})
	if !errors.Is(err, ErrInvalidCredentials) {
		t.Fatalf("expected ErrInvalidCredentials, got %v", err)
	}
}

func TestLogin_UnknownCompany(t *testing.T) {
	svc, _, _, _ := newService()
	_, err := svc.Login(context.Background(), model.LoginRequest{
		Subdomain: "ghost", Email: "a@b.io", Password: "supersecret",
	})
	if !errors.Is(err, ErrInvalidCredentials) {
		t.Fatalf("expected ErrInvalidCredentials, got %v", err)
	}
}

// ─── AcceptInvite ───────────────────────────────────────────────────────────

func TestAcceptInvite_HappyPath(t *testing.T) {
	svc, cr, _, ir := newService()
	company, _ := cr.Create(context.Background(), "Acme", "acme")

	raw := "rawtoken123"
	ir.byHash[token.Hash(raw)] = model.Invitation{
		ID: uuid.New(), CompanyID: company.ID, Email: "new@acme.io",
	}

	resp, err := svc.AcceptInvite(context.Background(), model.AcceptInviteRequest{
		Token: raw, Name: "New Hire", Password: "supersecret",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.User.Role != "member" {
		t.Fatalf("expected member role, got %q", resp.User.Role)
	}
	if resp.User.Email != "new@acme.io" {
		t.Fatalf("expected invited email, got %q", resp.User.Email)
	}
}

func TestAcceptInvite_BadToken(t *testing.T) {
	svc, _, _, _ := newService()
	_, err := svc.AcceptInvite(context.Background(), model.AcceptInviteRequest{
		Token: "nope", Password: "supersecret",
	})
	if !errors.Is(err, ErrInvalidInvite) {
		t.Fatalf("expected ErrInvalidInvite, got %v", err)
	}
}
