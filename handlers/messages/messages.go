package messages

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"allanswebterminal/db"
)

type MessageRequest struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Message string `json:"message"`
}

func setCORSHeaders(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Content-Type", "application/json")
}

func parseMessageRequest(r *http.Request) (*MessageRequest, error) {
	var msgReq MessageRequest
	if err := json.NewDecoder(r.Body).Decode(&msgReq); err != nil {
		return nil, fmt.Errorf("invalid JSON: %w", err)
	}
	return &msgReq, nil
}

func validateMessageRequest(msgReq *MessageRequest) error {
	if strings.TrimSpace(msgReq.Name) == "" {
		return fmt.Errorf("name is required")
	}
	if strings.TrimSpace(msgReq.Email) == "" {
		return fmt.Errorf("email is required")
	}
	if strings.TrimSpace(msgReq.Message) == "" {
		return fmt.Errorf("message is required")
	}
	return nil
}

func saveMessageToDB(msgReq *MessageRequest) error {
	query := `INSERT INTO messages (name, email, message) VALUES ($1, $2, $3)`
	_, err := db.DB.Exec(query, strings.TrimSpace(msgReq.Name), strings.TrimSpace(msgReq.Email), strings.TrimSpace(msgReq.Message))
	if err != nil {
		return fmt.Errorf("failed to save message to database: %w", err)
	}
	return nil
}

func sendSuccessResponse(w http.ResponseWriter, msgReq *MessageRequest) error {
	log.Printf("Message saved from %s (%s)", msgReq.Name, msgReq.Email)
	response := map[string]string{"status": "success", "message": "Message saved successfully"}
	return json.NewEncoder(w).Encode(response)
}

func MessagesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	setCORSHeaders(w)

	msgReq, err := parseMessageRequest(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := validateMessageRequest(msgReq); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := saveMessageToDB(msgReq); err != nil {
		log.Printf("Database error: %v", err)
		http.Error(w, "Failed to save message", http.StatusInternalServerError)
		return
	}

	if err := sendSuccessResponse(w, msgReq); err != nil {
		log.Printf("Failed to send response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}