package response

import (
	"encoding/json"
	"net/http"
)

// JSON writes a JSON response with the given status code.
func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		http.Error(w, `{"error":"encoding response"}`, http.StatusInternalServerError)
	}
}

// Error writes a JSON error response.
func Error(w http.ResponseWriter, status int, msg string) {
	JSON(w, status, map[string]string{"error": msg})
}

// maxJSONBody caps the size of a JSON request body (1 MiB). Multipart uploads
// (avatars, receipts) do not use ParseJSON and enforce their own limits.
const maxJSONBody = 1 << 20

// ParseJSON decodes a JSON request body into v, rejecting bodies larger than
// maxJSONBody.
func ParseJSON(r *http.Request, v any) error {
	defer r.Body.Close()
	limited := http.MaxBytesReader(nil, r.Body, maxJSONBody)
	return json.NewDecoder(limited).Decode(v)
}
