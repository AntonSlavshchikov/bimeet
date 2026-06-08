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
		Email: "owner@acme.io", Password: "supersecret", CompanyName: "Acme",
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
	// Subdomain is auto-generated from the company name.
	if resp.Company.Subdomain != "acme" {
		t.Fatalf("expected subdomain acme, got %q", resp.Company.Subdomain)
	}
}

// A Cyrillic company name is transliterated into a latin subdomain.
func TestRegisterCompany_TransliteratesCyrillicName(t *testing.T) {
	svc, _, _, _ := newService()
	resp, err := svc.RegisterCompany(context.Background(), model.RegisterCompanyRequest{
		Email: "owner@atlas.io", Password: "supersecret", CompanyName: "Атлас",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Company.Subdomain != "atlas" {
		t.Fatalf("expected subdomain atlas, got %q", resp.Company.Subdomain)
	}
}

// A name that slugifies to a reserved word skips it and takes a suffix.
func TestRegisterCompany_ReservedNameGetsSuffix(t *testing.T) {
	svc, _, _, _ := newService()
	resp, err := svc.RegisterCompany(context.Background(), model.RegisterCompanyRequest{
		Email: "a@b.io", Password: "supersecret", CompanyName: "Admin",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Company.Subdomain != "admin-2" {
		t.Fatalf("expected subdomain admin-2, got %q", resp.Company.Subdomain)
	}
}

// Two companies with the same name get distinct subdomains via a numeric suffix.
func TestRegisterCompany_DuplicateNameGetsSuffix(t *testing.T) {
	svc, _, _, _ := newService()
	first, err := svc.RegisterCompany(context.Background(), model.RegisterCompanyRequest{
		Email: "a@b.io", Password: "supersecret", CompanyName: "Acme",
	})
	if err != nil {
		t.Fatalf("first register failed: %v", err)
	}
	if first.Company.Subdomain != "acme" {
		t.Fatalf("expected first subdomain acme, got %q", first.Company.Subdomain)
	}
	second, err := svc.RegisterCompany(context.Background(), model.RegisterCompanyRequest{
		Email: "c@d.io", Password: "supersecret", CompanyName: "Acme",
	})
	if err != nil {
		t.Fatalf("second register failed: %v", err)
	}
	if second.Company.Subdomain != "acme-2" {
		t.Fatalf("expected second subdomain acme-2, got %q", second.Company.Subdomain)
	}
}

func TestRegisterCompany_ShortPassword(t *testing.T) {
	svc, _, _, _ := newService()
	_, err := svc.RegisterCompany(context.Background(), model.RegisterCompanyRequest{
		Email: "a@b.io", Password: "short", CompanyName: "X",
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
		Email: "owner@acme.io", Password: "supersecret", CompanyName: "Acme",
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
		Email: "owner@acme.io", Password: "supersecret", CompanyName: "Acme",
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
