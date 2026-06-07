// Package mailer sends transactional email. For local Teams development it
// targets MailHog over plain SMTP; with no SMTP host configured it logs instead.
package mailer

import (
	"crypto/tls"
	"fmt"
	"log/slog"
	"net"
	"net/smtp"
	"time"
)

const smtpDialTimeout = 10 * time.Second

type Config struct {
	SMTPHost string
	SMTPPort string
	SMTPUser string // empty for MailHog (no auth)
	SMTPPass string
	MailFrom string
}

type Mailer struct {
	cfg Config
}

func New(cfg Config) *Mailer {
	return &Mailer{cfg: cfg}
}

// SendInvite emails an employee the link to set a password and join the company.
func (m *Mailer) SendInvite(toEmail, companyName, inviteURL string) error {
	subject := fmt.Sprintf("Приглашение в %s на Bimeet for Teams", companyName)
	body := fmt.Sprintf(
		"Здравствуйте!\n\nВас пригласили в рабочее пространство «%s».\n\n"+
			"Перейдите по ссылке, придумайте пароль и присоединяйтесь к команде:\n%s\n\n"+
			"Ссылка действует 7 дней.",
		companyName, inviteURL,
	)
	return m.send(toEmail, subject, body)
}

func (m *Mailer) send(toEmail, subject, body string) error {
	if m.cfg.SMTPHost == "" {
		slog.Info("mailer: no SMTP configured — email not sent", "to", toEmail, "subject", subject)
		return nil
	}

	from := m.cfg.MailFrom
	if from == "" {
		from = "noreply@bimeet.local"
	}

	msg := fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s",
		from, toEmail, subject, body,
	)

	addr := net.JoinHostPort(m.cfg.SMTPHost, m.cfg.SMTPPort)
	conn, err := net.DialTimeout("tcp", addr, smtpDialTimeout)
	if err != nil {
		return fmt.Errorf("dial %s: %w", addr, err)
	}

	c, err := smtp.NewClient(conn, m.cfg.SMTPHost)
	if err != nil {
		_ = conn.Close()
		return fmt.Errorf("smtp client: %w", err)
	}
	defer c.Close()

	// MailHog does not advertise STARTTLS; only upgrade when the server offers it.
	if ok, _ := c.Extension("STARTTLS"); ok {
		if err := c.StartTLS(&tls.Config{ServerName: m.cfg.SMTPHost}); err != nil {
			return fmt.Errorf("starttls: %w", err)
		}
	}
	if m.cfg.SMTPUser != "" {
		if err := c.Auth(smtp.PlainAuth("", m.cfg.SMTPUser, m.cfg.SMTPPass, m.cfg.SMTPHost)); err != nil {
			return fmt.Errorf("auth: %w", err)
		}
	}

	if err := c.Mail(from); err != nil {
		return fmt.Errorf("mail from: %w", err)
	}
	if err := c.Rcpt(toEmail); err != nil {
		return fmt.Errorf("rcpt to: %w", err)
	}
	w, err := c.Data()
	if err != nil {
		return fmt.Errorf("data: %w", err)
	}
	if _, err := w.Write([]byte(msg)); err != nil {
		return fmt.Errorf("write body: %w", err)
	}
	if err := w.Close(); err != nil {
		return fmt.Errorf("close data: %w", err)
	}
	return c.Quit()
}
