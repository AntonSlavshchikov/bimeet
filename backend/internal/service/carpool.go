package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"meetup/internal/model"
	"meetup/internal/repository"
)

type CarpoolService struct {
	carpoolRepo *repository.CarpoolRepository
	eventRepo   *repository.EventRepository
}

func NewCarpoolService(carpoolRepo *repository.CarpoolRepository, eventRepo *repository.EventRepository) *CarpoolService {
	return &CarpoolService{carpoolRepo: carpoolRepo, eventRepo: eventRepo}
}

func (s *CarpoolService) List(ctx context.Context, eventID, userID uuid.UUID) ([]model.Carpool, error) {
	ok, err := s.eventRepo.IsParticipant(ctx, eventID, userID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, fmt.Errorf("forbidden")
	}
	return s.carpoolRepo.ListByEvent(ctx, eventID)
}

func (s *CarpoolService) Create(ctx context.Context, eventID, driverID uuid.UUID, req model.CreateCarpoolRequest) (model.Carpool, error) {
	ok, err := s.eventRepo.IsConfirmedParticipant(ctx, eventID, driverID)
	if err != nil {
		return model.Carpool{}, err
	}
	if !ok {
		return model.Carpool{}, fmt.Errorf("forbidden: must be a confirmed participant")
	}
	if req.SeatsAvailable < 1 {
		return model.Carpool{}, fmt.Errorf("seats_available must be at least 1")
	}
	return s.carpoolRepo.Create(ctx, eventID, driverID, req)
}

func (s *CarpoolService) Join(ctx context.Context, eventID, carpoolID, userID uuid.UUID) error {
	ok, err := s.eventRepo.IsConfirmedParticipant(ctx, eventID, userID)
	if err != nil {
		return err
	}
	if !ok {
		return fmt.Errorf("forbidden: must be a confirmed participant")
	}

	carpool, err := s.carpoolRepo.GetByID(ctx, carpoolID)
	if err != nil {
		return fmt.Errorf("carpool not found")
	}
	if carpool.EventID != eventID {
		return fmt.Errorf("carpool does not belong to this event")
	}
	if carpool.DriverID == userID {
		return fmt.Errorf("you are the driver of this carpool")
	}

	count, err := s.carpoolRepo.CountPassengers(ctx, carpoolID)
	if err != nil {
		return err
	}
	if count >= carpool.SeatsAvailable {
		return fmt.Errorf("carpool is full")
	}

	already, err := s.carpoolRepo.IsPassenger(ctx, carpoolID, userID)
	if err != nil {
		return err
	}
	if already {
		return fmt.Errorf("already joined this carpool")
	}

	return s.carpoolRepo.AddPassenger(ctx, carpoolID, userID)
}
