package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"

	authhandler "bimeet-teams/internal/handler/auth"
	companyhandler "bimeet-teams/internal/handler/company"
	eventhandler "bimeet-teams/internal/handler/event"
	linkhandler "bimeet-teams/internal/handler/link"
	notificationhandler "bimeet-teams/internal/handler/notification"
	pollhandler "bimeet-teams/internal/handler/poll"
	"bimeet-teams/internal/middleware"
)

// NewRouter wires the Teams API. Auth is password-based; every protected route
// carries a company-scoped JWT (userID + companyID + role).
func NewRouter(
	auth *authhandler.Handler,
	company *companyhandler.Handler,
	event *eventhandler.Handler,
	poll *pollhandler.Handler,
	link *linkhandler.Handler,
	notification *notificationhandler.Handler,
	jwtSecret string,
	corsOrigins []string,
) http.Handler {
	r := chi.NewRouter()

	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Recoverer)
	r.Use(middleware.CORS(corsOrigins))

	// Public — no auth.
	r.Post("/api/auth/register-company", auth.RegisterCompany)
	r.Post("/api/auth/login", auth.Login)
	r.Post("/api/auth/accept-invite", auth.AcceptInvite)
	r.Get("/api/companies/by-subdomain/{subdomain}", company.PublicBySubdomain)

	// Protected — valid company-scoped token required.
	r.Group(func(r chi.Router) {
		r.Use(middleware.Auth(jwtSecret))

		r.Get("/api/auth/me", company.Me)
		r.Get("/api/companies/me", company.GetMine)

		// Notifications (per-user).
		r.Get("/api/notifications", notification.List)
		r.Post("/api/notifications/{id}/read", notification.MarkRead)
		r.Post("/api/notifications/read-all", notification.MarkAllRead)

		// Business meetings — all company-scoped inside the service layer.
		r.Route("/api/events", func(r chi.Router) {
			r.Get("/", event.List)
			r.Post("/", event.Create)

			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", event.GetByID)
				r.Put("/", event.Update)
				r.Delete("/", event.Delete)
				r.Post("/complete", event.Complete)

				// Participants
				r.Post("/participants", event.InviteParticipant)
				r.Patch("/participants/me", event.UpdateMyStatus)

				// Material links
				r.Get("/links", link.List)
				r.Post("/links", link.Create)
				r.Delete("/links/{linkId}", link.Delete)

				// Polls
				r.Post("/polls", poll.Create)
				r.Post("/polls/{pollId}/vote", poll.Vote)
			})
		})

		// Owner-only company management.
		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireOwner)
			r.Put("/api/companies/me", company.Update)
			r.Post("/api/companies/me/invitations", company.Invite)
			r.Get("/api/companies/me/members", company.Members)
			r.Patch("/api/companies/me/members/{id}", company.SetMemberActive)
		})
	})

	return r
}
