// Command genvapid prints a fresh VAPID key pair for Web Push.
// Usage: go run ./cmd/genvapid
// Put the output into backend .env (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY) and
// expose the public key to the frontend as VITE_VAPID_PUBLIC_KEY.
package main

import (
	"fmt"
	"log"

	webpush "github.com/SherClockHolmes/webpush-go"
)

func main() {
	priv, pub, err := webpush.GenerateVAPIDKeys()
	if err != nil {
		log.Fatalf("generate VAPID keys: %v", err)
	}
	fmt.Printf("VAPID_PUBLIC_KEY=%s\n", pub)
	fmt.Printf("VAPID_PRIVATE_KEY=%s\n", priv)
}
