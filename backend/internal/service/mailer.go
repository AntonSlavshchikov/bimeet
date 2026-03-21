package service

import (
	"fmt"
	"net/smtp"
)

type MailerConfig struct {
	Host     string
	Port     string
	User     string
	Pass     string
	From     string
	FrontendURL string
}

type Mailer struct {
	cfg MailerConfig
}

func NewMailer(cfg MailerConfig) *Mailer {
	return &Mailer{cfg: cfg}
}

// SendInvite sends an invitation email. If SMTP is not configured, it logs and returns nil.
func (m *Mailer) SendInvite(toEmail, eventTitle, organizerName, inviteToken string) error {
	inviteURL := m.cfg.FrontendURL + "/invite/" + inviteToken
	if m.cfg.Host == "" {
		fmt.Printf("[mailer] invite email to %s → %s\n", toEmail, inviteURL)
		return nil
	}

	subject := fmt.Sprintf("Вас пригласили на встречу «%s»", eventTitle)
	body := fmt.Sprintf(
		"Привет!\n\n%s приглашает вас на встречу «%s».\n\n"+
			"Перейдите по ссылке, чтобы принять или отклонить приглашение:\n%s",
		organizerName, eventTitle, inviteURL,
	)

	msg := fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s",
		m.cfg.From, toEmail, subject, body,
	)

	addr := m.cfg.Host + ":" + m.cfg.Port
	var auth smtp.Auth
	if m.cfg.User != "" {
		auth = smtp.PlainAuth("", m.cfg.User, m.cfg.Pass, m.cfg.Host)
	}

	return smtp.SendMail(addr, auth, m.cfg.User, []string{toEmail}, []byte(msg))
}
