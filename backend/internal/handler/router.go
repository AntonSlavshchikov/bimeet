package handler

import (
	"net/http"

	_ "bimeet/docs"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/riandyrn/otelchi"
	httpSwagger "github.com/swaggo/http-swagger"

	adminhandler "bimeet/internal/handler/admin"
	authhandler "bimeet/internal/handler/auth"
	carpoolhandler "bimeet/internal/handler/carpool"
	chatlisthandler "bimeet/internal/handler/chatlist"
	cityhandler "bimeet/internal/handler/city"
	collectionhandler "bimeet/internal/handler/collection"
	eventhandler "bimeet/internal/handler/event"
	itemhandler "bimeet/internal/handler/item"
	messagehandler "bimeet/internal/handler/message"
	notificationhandler "bimeet/internal/handler/notification"
	passkeyhandler "bimeet/internal/handler/passkey"
	pollhandler "bimeet/internal/handler/poll"
	profilehandler "bimeet/internal/handler/profile"
	pushhandler "bimeet/internal/handler/push"
	streamhandler "bimeet/internal/handler/stream"
	"bimeet/internal/middleware"
)

func NewRouter(
	auth *authhandler.Handler,
	passkey *passkeyhandler.Handler,
	event *eventhandler.Handler,
	city *cityhandler.Handler,
	collection *collectionhandler.Handler,
	poll *pollhandler.Handler,
	item *itemhandler.Handler,
	carpool *carpoolhandler.Handler,
	message *messagehandler.Handler,
	chatList *chatlisthandler.Handler,
	stream *streamhandler.Handler,
	notification *notificationhandler.Handler,
	profile *profilehandler.Handler,
	admin *adminhandler.Handler,
	push *pushhandler.Handler,
	userLookup middleware.UserLookup,
	sessionValidator middleware.SessionValidator,
	adminEmails []string,
	jwtSecret string,
	corsOrigins []string,
	prod bool,
	serviceName string,
) http.Handler {
	r := chi.NewRouter()

	// Global middleware. Order matters:
	//   - RealIP before tracing/logging so spans, logs and the rate limiter see
	//     the real client address.
	//   - otelchi starts the request span (named by chi route) and writes the
	//     X-Trace-Id response header; Observability then derives the request
	//     logger from that span's trace_id.
	//   - Logging wraps (and stays outside) Recoverer so the request-summary line
	//     captures the 500 a recovered panic produces.
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(otelchi.Middleware(serviceName,
		otelchi.WithChiRoutes(r),
		otelchi.WithRequestMethodInSpanName(true),
		otelchi.WithTraceResponseHeaders(otelchi.TraceHeaderConfig{}),
	))
	r.Use(middleware.Observability)
	r.Use(middleware.Logging)
	r.Use(middleware.Recoverer)
	r.Use(middleware.SecurityHeaders(prod))
	r.Use(middleware.CORS(corsOrigins))
	r.Use(middleware.RateLimitGlobal())

	// Capability discovery is harmless and should not spend the strict auth
	// endpoint budget every time the login page is opened.
	r.Get("/api/auth/passkeys/config", passkey.Config)

	r.Get("/swagger/*", httpSwagger.Handler(
		httpSwagger.URL("/swagger/doc.json"),
	))

	// Public auth routes — strict per-IP rate limit against brute force.
	r.Route("/api/auth", func(r chi.Router) {
		r.Use(middleware.RateLimitAuth())
		r.Post("/request-code", auth.RequestCode)
		r.Post("/verify-code", auth.VerifyCode)
		r.Post("/refresh", auth.Refresh)
		r.Post("/logout", auth.Logout)
		r.Post("/passkeys/login/options", passkey.BeginLogin)
		r.Post("/passkeys/login/verify", passkey.FinishLogin)
	})

	// Public invite link (GET only)
	r.Get("/api/events/invite/{token}", event.GetByInviteToken)

	// Protected routes
	r.Group(func(r chi.Router) {
		r.Use(middleware.Auth(jwtSecret, sessionValidator))

		// Join by invite token (POST requires auth)
		r.Post("/api/events/invite/{token}", event.JoinByInviteToken)

		// Public events list (must be before /{id} to avoid conflict)
		r.Get("/api/events/public", event.ListPublic)
		r.Get("/api/cities", city.List)

		// Events
		r.Route("/api/events", func(r chi.Router) {
			r.Get("/", event.List)
			r.Post("/", event.Create)

			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", event.GetByID)
				r.Put("/", event.Update)
				r.Delete("/", event.Delete)
				r.Post("/complete", event.Complete)
				r.Post("/schedule", event.Schedule)
				r.Post("/unschedule", event.Unschedule)
				r.Post("/join", event.JoinPublic)

				// Participants. The status update always targets the caller; the
				// {userId} variant is kept for backward compatibility.
				r.Post("/participants", event.InviteParticipant)
				r.Patch("/participants", event.UpdateParticipantStatus)
				r.Patch("/participants/{userId}", event.UpdateParticipantStatus)

				// Collections
				r.Get("/collections", collection.List)
				r.Post("/collections", collection.Create)
				r.Get("/collections/summary", collection.Summary)
				r.Delete("/collections/{collectionId}", collection.Delete)
				r.Post("/collections/{collectionId}/contribute", collection.SubmitContribution)
				r.Post("/collections/{collectionId}/contributions/{contribId}/confirm", collection.ConfirmContribution)
				r.Post("/collections/{collectionId}/contributions/{contribId}/reject", collection.RejectContribution)
				r.Post("/collections/{collectionId}/contributions/mark-paid", collection.MarkPaid)

				// Polls
				r.Get("/polls", poll.List)
				r.Post("/polls", poll.Create)
				r.Post("/polls/{pollId}/vote", poll.Vote)

				// Chat
				r.Get("/stream", stream.StreamEvent)
				r.Get("/messages", message.List)
				r.Post("/messages", message.Post)
				r.Post("/messages/image", message.PostImage)
				r.Get("/messages/unread-count", message.UnreadCount)
				r.Post("/messages/read", message.MarkRead)
				r.Delete("/messages/{messageId}", message.Delete)
				r.Post("/messages/{messageId}/reactions", message.ToggleReaction)

				// Items
				r.Get("/items", item.List)
				r.Post("/items", item.Create)
				r.Patch("/items/{itemId}", item.UpdateAssignment)

				// Carpools
				r.Get("/carpools", carpool.List)
				r.Post("/carpools", carpool.Create)
				r.Post("/carpools/{carpoolId}/join", carpool.Join)
			})
		})

		// Cross-event chat list
		r.Get("/api/chats", chatList.List)
		r.Get("/api/chats/stream", stream.StreamChats)

		// Notifications
		r.Get("/api/notifications", notification.List)
		r.Patch("/api/notifications/{id}/read", notification.MarkRead)
		r.Post("/api/notifications/read-all", notification.MarkAllRead)
		r.Delete("/api/notifications/{id}", notification.Delete)
		r.Delete("/api/notifications", notification.DeleteAll)

		// Web Push subscriptions
		r.Get("/api/push/vapid-public-key", push.VAPIDPublicKey)
		r.Post("/api/push/subscribe", push.Subscribe)
		r.Post("/api/push/unsubscribe", push.Unsubscribe)
		r.Post("/api/push/test", push.Test)

		// Profile
		r.Get("/api/auth/me", profile.GetMe)
		r.Put("/api/auth/me", profile.UpdateMe)
		r.Get("/api/auth/me/stats", profile.GetStats)
		r.Post("/api/auth/me/avatar", profile.UploadAvatar)
		r.Delete("/api/auth/me/avatar", profile.DeleteAvatar)
		r.Get("/api/auth/me/sessions", auth.ListSessions)
		r.Delete("/api/auth/me/sessions/others", auth.RevokeOtherSessions)
		r.Delete("/api/auth/me/sessions/{id}", auth.RevokeSession)
		// Listing and CRUD are ordinary authenticated profile operations. Only
		// ceremony begin/finish use the strict auth limiter; applying it to GET
		// caused TanStack Query retries to exhaust the budget.
		r.Get("/api/auth/me/passkeys", passkey.List)
		r.With(middleware.RateLimitAuth()).Post("/api/auth/me/passkeys/registration/options", passkey.BeginRegistration)
		r.With(middleware.RateLimitAuth()).Post("/api/auth/me/passkeys/registration/verify", passkey.FinishRegistration)
		r.Patch("/api/auth/me/passkeys/{id}", passkey.Rename)
		r.Delete("/api/auth/me/passkeys/{id}", passkey.Delete)

		// Admin (whitelisted by email)
		r.Route("/api/admin", func(r chi.Router) {
			r.Use(middleware.RequireAdmin(userLookup, adminEmails))
			r.Get("/overview", admin.Overview)
			r.Get("/timeseries", admin.Timeseries)
			r.Get("/distribution", admin.Distribution)
			r.Get("/top-organizers", admin.TopOrganizers)
			r.Get("/recent-users", admin.RecentUsers)
			r.Get("/recent-events", admin.RecentEvents)
		})
	})

	return r
}
