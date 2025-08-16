package files

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"allanswebterminal/db"
	"allanswebterminal/handlers/login"
)

type UserFile struct {
	ID        int       `json:"id"`
	AccountID int       `json:"account_id"`
	Filename  string    `json:"filename"`
	Content   string    `json:"content"`
	FileType  string    `json:"file_type"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func SaveFileHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get user session (simplified - you'd want proper session management)
	accountID := getUserIDFromSession(r)
	if accountID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var file UserFile
	if err := json.NewDecoder(r.Body).Decode(&file); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	file.AccountID = accountID
	if file.FileType == "" {
		file.FileType = "python"
	}

	query := `
		INSERT INTO user_files (account_id, filename, content, file_type, updated_at)
		VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
		ON CONFLICT (account_id, filename)
		DO UPDATE SET content = EXCLUDED.content, file_type = EXCLUDED.file_type, updated_at = CURRENT_TIMESTAMP
		RETURNING id, created_at, updated_at
	`

	err := db.DB.QueryRow(query, file.AccountID, file.Filename, file.Content, file.FileType).Scan(
		&file.ID, &file.CreatedAt, &file.UpdatedAt,
	)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to save file: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(file)
}

func LoadFileHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	accountID := getUserIDFromSession(r)
	if accountID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	filename := r.URL.Query().Get("filename")
	if filename == "" {
		http.Error(w, "Filename required", http.StatusBadRequest)
		return
	}

	var file UserFile
	query := `
		SELECT id, account_id, filename, content, file_type, created_at, updated_at
		FROM user_files 
		WHERE account_id = $1 AND filename = $2
	`

	err := db.DB.QueryRow(query, accountID, filename).Scan(
		&file.ID, &file.AccountID, &file.Filename, &file.Content, 
		&file.FileType, &file.CreatedAt, &file.UpdatedAt,
	)
	if err != nil {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(file)
}

func ListFilesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	accountID := getUserIDFromSession(r)
	if accountID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	query := `
		SELECT id, account_id, filename, file_type, created_at, updated_at
		FROM user_files 
		WHERE account_id = $1
		ORDER BY updated_at DESC
	`

	rows, err := db.DB.Query(query, accountID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get files: %v", err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var files []UserFile
	for rows.Next() {
		var file UserFile
		err := rows.Scan(
			&file.ID, &file.AccountID, &file.Filename, 
			&file.FileType, &file.CreatedAt, &file.UpdatedAt,
		)
		if err != nil {
			continue
		}
		files = append(files, file)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(files)
}

func DeleteFileHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	accountID := getUserIDFromSession(r)
	if accountID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	filename := r.URL.Query().Get("filename")
	if filename == "" {
		http.Error(w, "Filename required", http.StatusBadRequest)
		return
	}

	query := `DELETE FROM user_files WHERE account_id = $1 AND filename = $2`
	result, err := db.DB.Exec(query, accountID, filename)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to delete file: %v", err), http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "File deleted successfully"})
}

// Simple session management - in production, use proper session handling
func getUserIDFromSession(r *http.Request) int {
	user, err := login.GetCurrentUser(r)
	if err != nil {
		return 0
	}
	return user.ID
}