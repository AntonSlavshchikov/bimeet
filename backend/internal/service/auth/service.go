package authsvc

import (
	"context"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"meetup/internal/model"
)

type Service struct {
	userRepo  UserRepo
	jwtSecret string
	jwtExpH   int
}

func New(userRepo UserRepo, jwtSecret string, jwtExpHours int) *Service {
	return &Service{
		userRepo:  userRepo,
		jwtSecret: jwtSecret,
		jwtExpH:   jwtExpHours,
	}
}

func (s *Service) Register(ctx context.Context, req model.RegisterRequest) (model.AuthResponse, error) {
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

	token, err := s.generateToken(user.ID)
	if err != nil {
		return model.AuthResponse{}, err
	}

	return model.AuthResponse{Token: token, User: user}, nil
}

func (s *Service) Login(ctx context.Context, req model.LoginRequest) (model.AuthResponse, error) {
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

func (s *Service) generateToken(userID uuid.UUID) (string, error) {
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
