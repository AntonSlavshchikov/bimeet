package mailer

import (
	"crypto/tls"
	"fmt"
	"net"
	"net/smtp"
	"time"
)

const smtpDialTimeout = 10 * time.Second

type Config struct {
	Host        string
	Port        string
	User        string
	Pass        string
	From        string
	FrontendURL string
}

type Mailer struct {
	cfg Config
}

func New(cfg Config) *Mailer {
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

	return m.send(toEmail, subject, body)
}

// SendPasswordReset sends a password reset email. If SMTP is not configured, it logs and returns nil.
func (m *Mailer) SendPasswordReset(toEmail, resetToken string) error {
	resetURL := m.cfg.FrontendURL + "/reset-password?token=" + resetToken
	if m.cfg.Host == "" {
		fmt.Printf("[mailer] password reset email to %s → %s\n", toEmail, resetURL)
		return nil
	}

	subject := "Восстановление пароля"
	body := fmt.Sprintf(
		"Привет!\n\nВы запросили восстановление пароля.\n\n"+
			"Перейдите по ссылке, чтобы задать новый пароль:\n%s\n\n"+
			"Если вы не запрашивали восстановление, просто проигнорируйте это письмо.",
		resetURL,
	)

	return m.send(toEmail, subject, body)
}

func (m *Mailer) send(toEmail, subject, body string) error {
	from := m.cfg.From
	if from == "" {
		from = m.cfg.User
	}

	msg := fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s",
		from, toEmail, subject, body,
	)

	addr := m.cfg.Host + ":" + m.cfg.Port

	conn, err := net.DialTimeout("tcp", addr, smtpDialTimeout)
	if err != nil {
		return fmt.Errorf("dial %s: %w", addr, err)
	}

	c, err := smtp.NewClient(conn, m.cfg.Host)
	if err != nil {
		_ = conn.Close()
		return fmt.Errorf("smtp client: %w", err)
	}
	defer c.Close()

	if ok, _ := c.Extension("STARTTLS"); ok {
		if err := c.StartTLS(&tls.Config{ServerName: m.cfg.Host}); err != nil {
			return fmt.Errorf("starttls: %w", err)
		}
	}

	if m.cfg.User != "" {
		auth := smtp.PlainAuth("", m.cfg.User, m.cfg.Pass, m.cfg.Host)
		if err := c.Auth(auth); err != nil {
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
