package iam

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"allanswebterminal/db"
)

type IAMUser struct {
	ID                   int       `json:"id"`
	AccountID            int       `json:"account_id"`
	UserName             string    `json:"user_name"`
	UserID               string    `json:"user_id"`
	ARN                  string    `json:"arn"`
	Path                 string    `json:"path"`
	PermissionsBoundary  *string   `json:"permissions_boundary"`
	Tags                 string    `json:"tags"`
	CreatedDate          time.Time `json:"created_date"`
	PasswordLastUsed     *time.Time `json:"password_last_used"`
	MFAEnabled           bool      `json:"mfa_enabled"`
	AccessKeysCount      int       `json:"access_keys_count"`
	AttachedPolicies     string    `json:"attached_policies"`
	InlinePolicies       string    `json:"inline_policies"`
	Groups               string    `json:"groups"`
	Status               string    `json:"status"`
}

type IAMRole struct {
	ID                   int       `json:"id"`
	AccountID            int       `json:"account_id"`
	RoleName             string    `json:"role_name"`
	RoleID               string    `json:"role_id"`
	ARN                  string    `json:"arn"`
	Path                 string    `json:"path"`
	Description          *string   `json:"description"`
	TrustPolicy          string    `json:"trust_policy"`
	PermissionsBoundary  *string   `json:"permissions_boundary"`
	Tags                 string    `json:"tags"`
	CreatedDate          time.Time `json:"created_date"`
	MaxSessionDuration   int       `json:"max_session_duration"`
	AttachedPolicies     string    `json:"attached_policies"`
	InlinePolicies       string    `json:"inline_policies"`
}

type CreateUserRequest struct {
	UserName string            `json:"user_name"`
	Path     string            `json:"path"`
	Tags     map[string]string `json:"tags"`
}

type CreateRoleRequest struct {
	RoleName             string            `json:"role_name"`
	Path                 string            `json:"path"`
	Description          string            `json:"description"`
	AssumeRolePolicyDoc  string            `json:"assume_role_policy_document"`
	MaxSessionDuration   int               `json:"max_session_duration"`
	Tags                 map[string]string `json:"tags"`
}

func generateUserID() string {
	bytes := make([]byte, 10)
	rand.Read(bytes)
	return fmt.Sprintf("AIDA%X", bytes)
}

func generateRoleID() string {
	bytes := make([]byte, 10)
	rand.Read(bytes)
	return fmt.Sprintf("AROA%X", bytes)
}

func CreateUserHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get account ID from session/auth
	accountID := getAccountIDFromSession(r)
	if accountID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if req.UserName == "" {
		http.Error(w, "UserName is required", http.StatusBadRequest)
		return
	}

	if req.Path == "" {
		req.Path = "/"
	}

	// Generate unique IDs
	userID := generateUserID()
	arn := fmt.Sprintf("arn:aws:iam::%d:user%s%s", accountID, req.Path, req.UserName)

	// Convert tags to JSON
	tagsJSON, _ := json.Marshal(req.Tags)

	// Insert into database
	query := `
		INSERT INTO iam_users (
			account_id, user_name, user_id, arn, path, tags
		) VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_date
	`

	var id int
	var createdDate time.Time
	err := db.DB.QueryRow(query, accountID, req.UserName, userID, arn, req.Path, string(tagsJSON)).Scan(&id, &createdDate)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create user: %v", err), http.StatusInternalServerError)
		return
	}

	user := IAMUser{
		ID:               id,
		AccountID:        accountID,
		UserName:         req.UserName,
		UserID:           userID,
		ARN:              arn,
		Path:             req.Path,
		Tags:             string(tagsJSON),
		CreatedDate:      createdDate,
		MFAEnabled:       false,
		AccessKeysCount:  0,
		AttachedPolicies: "[]",
		InlinePolicies:   "{}",
		Groups:           "[]",
		Status:           "Active",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func CreateRoleHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get account ID from session/auth
	accountID := getAccountIDFromSession(r)
	if accountID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req CreateRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if req.RoleName == "" {
		http.Error(w, "RoleName is required", http.StatusBadRequest)
		return
	}

	if req.AssumeRolePolicyDoc == "" {
		// Default trust policy for EC2
		req.AssumeRolePolicyDoc = `{
			"Version": "2012-10-17",
			"Statement": [
				{
					"Effect": "Allow",
					"Principal": {
						"Service": "ec2.amazonaws.com"
					},
					"Action": "sts:AssumeRole"
				}
			]
		}`
	}

	if req.Path == "" {
		req.Path = "/"
	}

	if req.MaxSessionDuration == 0 {
		req.MaxSessionDuration = 3600
	}

	// Generate unique IDs
	roleID := generateRoleID()
	arn := fmt.Sprintf("arn:aws:iam::%d:role%s%s", accountID, req.Path, req.RoleName)

	// Convert tags to JSON
	tagsJSON, _ := json.Marshal(req.Tags)

	// Insert into database
	query := `
		INSERT INTO iam_roles (
			account_id, role_name, role_id, arn, path, description, 
			trust_policy, max_session_duration, tags
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_date
	`

	var id int
	var createdDate time.Time
	err := db.DB.QueryRow(query, 
		accountID, req.RoleName, roleID, arn, req.Path, 
		req.Description, req.AssumeRolePolicyDoc, req.MaxSessionDuration, string(tagsJSON),
	).Scan(&id, &createdDate)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create role: %v", err), http.StatusInternalServerError)
		return
	}

	role := IAMRole{
		ID:                 id,
		AccountID:          accountID,
		RoleName:           req.RoleName,
		RoleID:             roleID,
		ARN:                arn,
		Path:               req.Path,
		TrustPolicy:        req.AssumeRolePolicyDoc,
		Tags:               string(tagsJSON),
		CreatedDate:        createdDate,
		MaxSessionDuration: req.MaxSessionDuration,
		AttachedPolicies:   "[]",
		InlinePolicies:     "{}",
	}

	if req.Description != "" {
		role.Description = &req.Description
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(role)
}

func ListUsersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	accountID := getAccountIDFromSession(r)
	if accountID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	query := `
		SELECT id, account_id, user_name, user_id, arn, path, 
			   permissions_boundary, tags, created_date, password_last_used,
			   mfa_enabled, access_keys_count, attached_policies, 
			   inline_policies, groups, status
		FROM iam_users 
		WHERE account_id = $1
		ORDER BY created_date DESC
	`

	rows, err := db.DB.Query(query, accountID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Database error: %v", err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []IAMUser
	for rows.Next() {
		var user IAMUser
		err := rows.Scan(
			&user.ID, &user.AccountID, &user.UserName, &user.UserID, &user.ARN,
			&user.Path, &user.PermissionsBoundary, &user.Tags, &user.CreatedDate,
			&user.PasswordLastUsed, &user.MFAEnabled, &user.AccessKeysCount,
			&user.AttachedPolicies, &user.InlinePolicies, &user.Groups, &user.Status,
		)
		if err != nil {
			http.Error(w, fmt.Sprintf("Scan error: %v", err), http.StatusInternalServerError)
			return
		}
		users = append(users, user)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

func ListRolesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	accountID := getAccountIDFromSession(r)
	if accountID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	query := `
		SELECT id, account_id, role_name, role_id, arn, path, description,
			   trust_policy, permissions_boundary, tags, created_date,
			   max_session_duration, attached_policies, inline_policies
		FROM iam_roles 
		WHERE account_id = $1
		ORDER BY created_date DESC
	`

	rows, err := db.DB.Query(query, accountID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Database error: %v", err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var roles []IAMRole
	for rows.Next() {
		var role IAMRole
		err := rows.Scan(
			&role.ID, &role.AccountID, &role.RoleName, &role.RoleID, &role.ARN,
			&role.Path, &role.Description, &role.TrustPolicy, &role.PermissionsBoundary,
			&role.Tags, &role.CreatedDate, &role.MaxSessionDuration,
			&role.AttachedPolicies, &role.InlinePolicies,
		)
		if err != nil {
			http.Error(w, fmt.Sprintf("Scan error: %v", err), http.StatusInternalServerError)
			return
		}
		roles = append(roles, role)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(roles)
}

// Helper function to get account ID from session
func getAccountIDFromSession(r *http.Request) int {
	// This is a placeholder - you'll need to implement actual session handling
	// For now, return a default account ID for testing
	return 1
}