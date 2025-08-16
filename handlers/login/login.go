package login

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	"allanswebterminal/db"
)

type User struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Role     string `json:"role"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	User    *User  `json:"user,omitempty"`
}

type CheckUsernameRequest struct {
	Username string `json:"username"`
}

type CheckUsernameResponse struct {
	Exists bool `json:"exists"`
}

func LoginPageHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	redirect := getRedirectURL(r)
	data := createLoginPageData(redirect)
	
	if err := renderLoginPage(w, data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func LoginAPIHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	setJSONContentType(w)

	req, err := parseLoginRequest(r)
	if err != nil {
		writeErrorResponse(w, "Invalid JSON format")
		return
	}

	if err := validateLoginRequest(req); err != nil {
		writeErrorResponse(w, err.Error())
		return
	}

	user, err := authenticateUser(req.Username, req.Password)
	if err != nil {
		log.Printf("Authentication error: %v", err)
		message := getAuthenticationErrorMessage(err)
		writeErrorResponse(w, message)
		return
	}

	setSessionCookie(w, user.ID)
	writeSuccessResponse(w, "Login successful", user)
}

func RegisterPageHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := renderRegisterPage(w); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func RegisterAPIHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	setJSONContentType(w)

	req, err := parseLoginRequest(r)
	if err != nil {
		writeErrorResponse(w, "Invalid JSON format")
		return
	}

	if err := validateRegistrationRequest(req); err != nil {
		writeErrorResponse(w, err.Error())
		return
	}

	if err := createUser(req.Username, req.Password); err != nil {
		log.Printf("Registration error: %v", err)
		message := getRegistrationErrorMessage(err)
		writeErrorResponse(w, message)
		return
	}

	writeSuccessResponse(w, "Registration successful", nil)
}

func CheckUsernameAPIHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	setJSONContentType(w)

	req, err := parseCheckUsernameRequest(r)
	if err != nil {
		writeCheckUsernameErrorResponse(w, "Invalid JSON format")
		return
	}

	if err := validateUsernameOnly(req.Username); err != nil {
		writeCheckUsernameErrorResponse(w, err.Error())
		return
	}

	exists := checkUsernameExists(req.Username)
	writeCheckUsernameResponse(w, exists)
}

func authenticateUser(username, password string) (*User, error) {
	var user User
	var hashedPassword string

	query := "SELECT id, username, password, role FROM accounts WHERE username = $1"
	err := db.DB.QueryRow(query, username).Scan(&user.ID, &user.Username, &hashedPassword, &user.Role)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, err
	}

	if err := verifyPassword(password, hashedPassword); err != nil {
		return nil, fmt.Errorf("invalid password")
	}

	return &user, nil
}

func createUser(username, password string) error {
	hashedPassword, err := hashPassword(password)
	if err != nil {
		return err
	}

	username = sanitizeUsername(username)
	return insertUser(username, hashedPassword)
}

func insertUser(username, hashedPassword string) error {
	query := "INSERT INTO accounts (username, password) VALUES ($1, $2)"
	_, err := db.DB.Exec(query, username, hashedPassword)
	return err
}

func GetCurrentUser(r *http.Request) (*User, error) {
	cookie, err := r.Cookie("user_id")
	if err != nil {
		return nil, err
	}

	userID := cookie.Value
	var user User
	query := "SELECT id, username, role FROM accounts WHERE id = $1"
	err = db.DB.QueryRow(query, userID).Scan(&user.ID, &user.Username, &user.Role)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	clearSessionCookie(w)
	http.Redirect(w, r, "/projects", http.StatusSeeOther)
}

// Helper functions for LoginPageHandler
func getRedirectURL(r *http.Request) string {
	return r.URL.Query().Get("redirect")
}

func createLoginPageData(redirect string) struct{ Redirect string } {
	return struct{ Redirect string }{
		Redirect: redirect,
	}
}

func renderLoginPage(w http.ResponseWriter, data struct{ Redirect string }) error {
	tmpl, err := template.ParseFiles("templates/login.html")
	if err != nil {
		return err
	}
	return tmpl.Execute(w, data)
}

func renderRegisterPage(w http.ResponseWriter) error {
	tmpl, err := template.ParseFiles("templates/register.html")
	if err != nil {
		return err
	}
	return tmpl.Execute(w, nil)
}

// Helper functions for API handlers
func setJSONContentType(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
}

func parseLoginRequest(r *http.Request) (*LoginRequest, error) {
	var req LoginRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	return &req, err
}

func validateLoginRequest(req *LoginRequest) error {
	return validateLoginFields(req.Username, req.Password)
}

func validateLoginFields(username, password string) error {
	if strings.TrimSpace(username) == "" {
		return fmt.Errorf("please enter your username")
	}
	if strings.TrimSpace(password) == "" {
		return fmt.Errorf("please enter your password")
	}
	return nil
}

func validateRegistrationRequest(req *LoginRequest) error {
	if err := validateLoginRequest(req); err != nil {
		return err
	}
	if len(req.Password) < 6 {
		return fmt.Errorf("password must be at least 6 characters long")
	}
	return nil
}

func writeErrorResponse(w http.ResponseWriter, message string) {
	response := LoginResponse{
		Success: false,
		Message: message,
	}
	json.NewEncoder(w).Encode(response)
}

func writeSuccessResponse(w http.ResponseWriter, message string, user *User) {
	response := LoginResponse{
		Success: true,
		Message: message,
		User:    user,
	}
	json.NewEncoder(w).Encode(response)
}

func setSessionCookie(w http.ResponseWriter, userID int) {
	cookie := createSessionCookie(userID)
	http.SetCookie(w, cookie)
}

func createSessionCookie(userID int) *http.Cookie {
	return &http.Cookie{
		Name:     "user_id",
		Value:    fmt.Sprintf("%d", userID),
		Path:     "/",
		HttpOnly: true,
		Secure:   false, // Set to true in production with HTTPS
		SameSite: http.SameSiteLaxMode,
		Expires:  time.Now().Add(24 * time.Hour),
	}
}

func clearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "user_id",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Expires:  time.Now().Add(-1 * time.Hour),
	})
}

// Helper functions for password operations
func hashPassword(password string) (string, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(hashedPassword), err
}

func verifyPassword(password, hashedPassword string) error {
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
}

func sanitizeUsername(username string) string {
	return strings.TrimSpace(username)
}

func getAuthenticationErrorMessage(err error) string {
	errorMsg := err.Error()
	if strings.Contains(errorMsg, "user not found") {
		return "account not found - please check your username or register for a new account"
	}
	if strings.Contains(errorMsg, "invalid password") {
		return "incorrect password - please try again"
	}
	return "invalid username or password"
}

func getRegistrationErrorMessage(err error) string {
	errorMsg := err.Error()
	if strings.Contains(errorMsg, "UNIQUE constraint failed") || strings.Contains(errorMsg, "duplicate key") {
		return "username already exists - please choose a different username or login to your existing account"
	}
	return "registration failed - please try again"
}

func parseCheckUsernameRequest(r *http.Request) (*CheckUsernameRequest, error) {
	var req CheckUsernameRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	return &req, err
}

func validateUsernameOnly(username string) error {
	if strings.TrimSpace(username) == "" {
		return fmt.Errorf("please enter your username")
	}
	return nil
}

func checkUsernameExists(username string) bool {
	var count int
	query := "SELECT COUNT(*) FROM accounts WHERE username = $1"
	err := db.DB.QueryRow(query, username).Scan(&count)
	if err != nil {
		return false
	}
	return count > 0
}

func writeCheckUsernameResponse(w http.ResponseWriter, exists bool) {
	response := CheckUsernameResponse{
		Exists: exists,
	}
	json.NewEncoder(w).Encode(response)
}

func writeCheckUsernameErrorResponse(w http.ResponseWriter, message string) {
	response := struct {
		Error string `json:"error"`
	}{
		Error: message,
	}
	json.NewEncoder(w).Encode(response)
}