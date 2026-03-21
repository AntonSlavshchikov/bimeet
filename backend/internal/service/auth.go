package service

import (
	"context"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"meetup/internal/model"
	"meetup/internal/repository"
)

type AuthService struct {
	userRepo    *repository.UserRepository
	pendingRepo *repository.PendingInvitationRepository
	eventRepo   *repository.EventRepository
	notifRepo   *repository.NotificationRepository
	jwtSecret   string
	jwtExpH     int
}

func NewAuthService(
	userRepo *repository.UserRepository,
	pendingRepo *repository.PendingInvitationRepository,
	eventRepo *repository.EventRepository,
	notifRepo *repository.NotificationRepository,
	jwtSecret string,
	jwtExpHours int,
) *AuthService {
	return &AuthService{
		userRepo:    userRepo,
		pendingRepo: pendingRepo,
		eventRepo:   eventRepo,
		notifRepo:   notifRepo,
		jwtSecret:   jwtSecret,
		jwtExpH:     jwtExpHours,
	}
}

func (s *AuthService) Register(ctx context.Context, req model.RegisterRequest) (model.AuthResponse, error) {
	if req.Name == "" || req.Email == "" || req.Password == "" {
		return model.AuthResponse{}, fmt.Errorf("name, email and password are required")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return model.AuthResponse{}, fmt.Errorf("hash password: %w", err)
	}

	user, err := s.userRepo.Create(ctx, req.Name, req.Email, string(hash))
	if err != nil {
		return model.AuthResponse{}, fmt.Errorf("create user: %w", err)
	}

	// Convert any pending invitations for this email into real participant records
	pending, _ := s.pendingRepo.GetByEmail(ctx, user.Email)
	for _, inv := range pending {
		event, err := s.eventRepo.GetByID(ctx, inv.EventID)
		if err != nil {
			continue
		}
		_, _ = s.eventRepo.AddParticipant(ctx, inv.EventID, user.ID, "invited")
		go func(eventID uuid.UUID, title string) {
			_, _ = s.notifRepo.Create(context.Background(), user.ID, &eventID, "event_invite",
				fmt.Sprintf("Вас пригласили на встречу «%s»", title))
		}(inv.EventID, event.Title)
	}
	if len(pending) > 0 {
		_ = s.pendingRepo.DeleteByEmail(ctx, user.Email)
	}

	token, err := s.generateToken(user.ID)
	if err != nil {
		return model.AuthResponse{}, err
	}

	return model.AuthResponse{Token: token, User: user}, nil
}

func (s *AuthService) Login(ctx context.Context, req model.LoginRequest) (model.AuthResponse, error) {
	if req.Email == "" || req.Password == "" {
		return model.AuthResponse{}, fmt.Errorf("email and password are required")
	}

	user, err := s.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		return model.AuthResponse{}, fmt.Errorf("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return model.AuthResponse{}, fmt.Errorf("invalid credentials")
	}

	token, err := s.generateToken(user.ID)
	if err != nil {
		return model.AuthResponse{}, err
	}

	return model.AuthResponse{Token: token, User: user}, nil
}

func (s *AuthService) generateToken(userID uuid.UUID) (string, error) {
	claims := jwt.MapClaims{
		"sub": userID.String(),
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
