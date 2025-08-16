package login

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"golang.org/x/crypto/bcrypt"
)

func TestGetRedirectURL(t *testing.T) {
	tests := []struct {
		name        string
		queryParams string
		expected    string
	}{
		{"With redirect parameter", "redirect=flashcards", "flashcards"},
		{"Empty redirect parameter", "redirect=", ""},
		{"No redirect parameter", "", ""},
		{"Multiple parameters", "redirect=test&other=value", "test"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "http://example.com/login?"+tt.queryParams, nil)
			result := getRedirectURL(req)
			if result != tt.expected {
				t.Errorf("Expected %q, got %q", tt.expected, result)
			}
		})
	}
}

func TestCreateLoginPageData(t *testing.T) {
	tests := []struct {
		name     string
		redirect string
	}{
		{"With redirect", "flashcards"},
		{"Empty redirect", ""},
		{"Special characters", "/some/path?param=value"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data := createLoginPageData(tt.redirect)
			if data.Redirect != tt.redirect {
				t.Errorf("Expected redirect %q, got %q", tt.redirect, data.Redirect)
			}
		})
	}
}

func TestSetJSONContentType(t *testing.T) {
	w := httptest.NewRecorder()
	setJSONContentType(w)
	
	contentType := w.Header().Get("Content-Type")
	expected := "application/json"
	if contentType != expected {
		t.Errorf("Expected Content-Type %q, got %q", expected, contentType)
	}
}

func TestParseLoginRequest(t *testing.T) {
	tests := []struct {
		name      string
		body      string
		shouldErr bool
		username  string
		password  string
	}{
		{
			name:      "Valid JSON",
			body:      `{"username":"testuser","password":"testpass"}`,
			shouldErr: false,
			username:  "testuser",
			password:  "testpass",
		},
		{
			name:      "Invalid JSON",
			body:      `{"username":"testuser","password":}`,
			shouldErr: true,
		},
		{
			name:      "Empty body",
			body:      ``,
			shouldErr: true,
		},
		{
			name:      "Missing fields",
			body:      `{"username":"testuser"}`,
			shouldErr: false,
			username:  "testuser",
			password:  "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("POST", "/login", strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")
			
			result, err := parseLoginRequest(req)
			
			if tt.shouldErr && err == nil {
				t.Errorf("Expected error but got none")
			}
			if !tt.shouldErr && err != nil {
				t.Errorf("Expected no error but got: %v", err)
			}
			if !tt.shouldErr {
				if result.Username != tt.username {
					t.Errorf("Expected username %q, got %q", tt.username, result.Username)
				}
				if result.Password != tt.password {
					t.Errorf("Expected password %q, got %q", tt.password, result.Password)
				}
			}
		})
	}
}

func TestValidateLoginRequest(t *testing.T) {
	tests := []struct {
		name      string
		request   *LoginRequest
		shouldErr bool
		errMsg    string
	}{
		{
			name:      "Valid request",
			request:   &LoginRequest{Username: "testuser", Password: "testpass"},
			shouldErr: false,
		},
		{
			name:      "Empty username",
			request:   &LoginRequest{Username: "", Password: "testpass"},
			shouldErr: true,
			errMsg:    "please enter your username",
		},
		{
			name:      "Empty password",
			request:   &LoginRequest{Username: "testuser", Password: ""},
			shouldErr: true,
			errMsg:    "please enter your password",
		},
		{
			name:      "Whitespace username",
			request:   &LoginRequest{Username: "   ", Password: "testpass"},
			shouldErr: true,
			errMsg:    "please enter your username",
		},
		{
			name:      "Whitespace password",
			request:   &LoginRequest{Username: "testuser", Password: "   "},
			shouldErr: true,
			errMsg:    "please enter your password",
		},
		{
			name:      "Both empty",
			request:   &LoginRequest{Username: "", Password: ""},
			shouldErr: true,
			errMsg:    "please enter your username",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateLoginRequest(tt.request)
			
			if tt.shouldErr && err == nil {
				t.Errorf("Expected error but got none")
			}
			if !tt.shouldErr && err != nil {
				t.Errorf("Expected no error but got: %v", err)
			}
			if tt.shouldErr && err != nil && err.Error() != tt.errMsg {
				t.Errorf("Expected error message %q, got %q", tt.errMsg, err.Error())
			}
		})
	}
}

func TestValidateRegistrationRequest(t *testing.T) {
	tests := []struct {
		name      string
		request   *LoginRequest
		shouldErr bool
		errMsg    string
	}{
		{
			name:      "Valid registration request",
			request:   &LoginRequest{Username: "testuser", Password: "validpassword"},
			shouldErr: false,
		},
		{
			name:      "Password too short",
			request:   &LoginRequest{Username: "testuser", Password: "short"},
			shouldErr: true,
			errMsg:    "password must be at least 6 characters long",
		},
		{
			name:      "Empty username (inherits from validateLoginRequest)",
			request:   &LoginRequest{Username: "", Password: "validpassword"},
			shouldErr: true,
			errMsg:    "please enter your username",
		},
		{
			name:      "Minimum valid password length",
			request:   &LoginRequest{Username: "testuser", Password: "123456"},
			shouldErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateRegistrationRequest(tt.request)
			
			if tt.shouldErr && err == nil {
				t.Errorf("Expected error but got none")
			}
			if !tt.shouldErr && err != nil {
				t.Errorf("Expected no error but got: %v", err)
			}
			if tt.shouldErr && err != nil && err.Error() != tt.errMsg {
				t.Errorf("Expected error message %q, got %q", tt.errMsg, err.Error())
			}
		})
	}
}

func TestCreateSessionCookie(t *testing.T) {
	userID := 123
	cookie := createSessionCookie(userID)
	
	if cookie.Name != "user_id" {
		t.Errorf("Expected cookie name 'user_id', got %q", cookie.Name)
	}
	if cookie.Value != "123" {
		t.Errorf("Expected cookie value '123', got %q", cookie.Value)
	}
	if cookie.Path != "/" {
		t.Errorf("Expected cookie path '/', got %q", cookie.Path)
	}
	if !cookie.HttpOnly {
		t.Errorf("Expected cookie to be HttpOnly")
	}
	if cookie.SameSite != http.SameSiteLaxMode {
		t.Errorf("Expected cookie SameSite to be Lax")
	}
	if cookie.Expires.Before(time.Now().Add(23*time.Hour)) {
		t.Errorf("Expected cookie to expire in about 24 hours")
	}
}

func TestHashPassword(t *testing.T) {
	password := "testpassword123"
	
	hashedPassword, err := hashPassword(password)
	if err != nil {
		t.Errorf("Expected no error, got: %v", err)
	}
	
	if hashedPassword == password {
		t.Errorf("Hashed password should not be the same as original password")
	}
	
	if len(hashedPassword) == 0 {
		t.Errorf("Hashed password should not be empty")
	}
	
	// Test that the hashed password can be verified
	err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	if err != nil {
		t.Errorf("Hashed password should be verifiable with original password: %v", err)
	}
}

func TestVerifyPassword(t *testing.T) {
	password := "testpassword123"
	
	// First hash a password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("Failed to hash password for test: %v", err)
	}
	
	tests := []struct {
		name           string
		password       string
		hashedPassword string
		shouldErr      bool
	}{
		{
			name:           "Correct password",
			password:       password,
			hashedPassword: string(hashedPassword),
			shouldErr:      false,
		},
		{
			name:           "Wrong password",
			password:       "wrongpassword",
			hashedPassword: string(hashedPassword),
			shouldErr:      true,
		},
		{
			name:           "Empty password",
			password:       "",
			hashedPassword: string(hashedPassword),
			shouldErr:      true,
		},
		{
			name:           "Invalid hash",
			password:       password,
			hashedPassword: "invalid_hash",
			shouldErr:      true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := verifyPassword(tt.password, tt.hashedPassword)
			
			if tt.shouldErr && err == nil {
				t.Errorf("Expected error but got none")
			}
			if !tt.shouldErr && err != nil {
				t.Errorf("Expected no error but got: %v", err)
			}
		})
	}
}

func TestSanitizeUsername(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"No whitespace", "testuser", "testuser"},
		{"Leading whitespace", "  testuser", "testuser"},
		{"Trailing whitespace", "testuser  ", "testuser"},
		{"Both leading and trailing", "  testuser  ", "testuser"},
		{"Only whitespace", "   ", ""},
		{"Empty string", "", ""},
		{"Tabs and spaces", "\t testuser \t", "testuser"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := sanitizeUsername(tt.input)
			if result != tt.expected {
				t.Errorf("Expected %q, got %q", tt.expected, result)
			}
		})
	}
}

func TestWriteErrorResponse(t *testing.T) {
	w := httptest.NewRecorder()
	message := "Test error message"
	
	// Set content type like the actual handler would
	setJSONContentType(w)
	writeErrorResponse(w, message)
	
	// Check content type
	contentType := w.Header().Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("Expected Content-Type to be application/json, got %q", contentType)
	}
	
	// Check response body contains the error message
	body := w.Body.String()
	if !strings.Contains(body, message) {
		t.Errorf("Expected response body to contain %q, got %q", message, body)
	}
	if !strings.Contains(body, `"success":false`) {
		t.Errorf("Expected response body to contain success:false, got %q", body)
	}
}

func TestWriteSuccessResponse(t *testing.T) {
	w := httptest.NewRecorder()
	message := "Success message"
	user := &User{ID: 123, Username: "testuser", Role: "user"}
	
	// Set content type like the actual handler would
	setJSONContentType(w)
	writeSuccessResponse(w, message, user)
	
	// Check content type
	contentType := w.Header().Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("Expected Content-Type to be application/json, got %q", contentType)
	}
	
	// Check response body
	body := w.Body.String()
	if !strings.Contains(body, message) {
		t.Errorf("Expected response body to contain %q, got %q", message, body)
	}
	if !strings.Contains(body, `"success":true`) {
		t.Errorf("Expected response body to contain success:true, got %q", body)
	}
	if !strings.Contains(body, `"testuser"`) {
		t.Errorf("Expected response body to contain username, got %q", body)
	}
}

func TestWriteSuccessResponseWithoutUser(t *testing.T) {
	w := httptest.NewRecorder()
	message := "Registration successful"
	
	writeSuccessResponse(w, message, nil)
	
	body := w.Body.String()
	if !strings.Contains(body, message) {
		t.Errorf("Expected response body to contain %q, got %q", message, body)
	}
	if !strings.Contains(body, `"success":true`) {
		t.Errorf("Expected response body to contain success:true, got %q", body)
	}
}

func TestValidateLoginFields(t *testing.T) {
	tests := []struct {
		name      string
		username  string
		password  string
		shouldErr bool
		errMsg    string
	}{
		{
			name:      "Valid fields",
			username:  "testuser",
			password:  "testpass",
			shouldErr: false,
		},
		{
			name:      "Empty username",
			username:  "",
			password:  "testpass",
			shouldErr: true,
			errMsg:    "please enter your username",
		},
		{
			name:      "Empty password",
			username:  "testuser",
			password:  "",
			shouldErr: true,
			errMsg:    "please enter your password",
		},
		{
			name:      "Whitespace only username",
			username:  "   ",
			password:  "testpass",
			shouldErr: true,
			errMsg:    "please enter your username",
		},
		{
			name:      "Whitespace only password",
			username:  "testuser",
			password:  "   ",
			shouldErr: true,
			errMsg:    "please enter your password",
		},
		{
			name:      "Both empty",
			username:  "",
			password:  "",
			shouldErr: true,
			errMsg:    "please enter your username",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateLoginFields(tt.username, tt.password)
			
			if tt.shouldErr && err == nil {
				t.Errorf("Expected error but got none")
			}
			if !tt.shouldErr && err != nil {
				t.Errorf("Expected no error but got: %v", err)
			}
			if tt.shouldErr && err != nil && err.Error() != tt.errMsg {
				t.Errorf("Expected error message %q, got %q", tt.errMsg, err.Error())
			}
		})
	}
}

func TestGetAuthenticationErrorMessage(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		expected string
	}{
		{
			name:     "User not found error",
			err:      fmt.Errorf("user not found"),
			expected: "account not found - please check your username or register for a new account",
		},
		{
			name:     "Invalid password error",
			err:      fmt.Errorf("invalid password"),
			expected: "incorrect password - please try again",
		},
		{
			name:     "Generic database error",
			err:      fmt.Errorf("database connection failed"),
			expected: "invalid username or password",
		},
		{
			name:     "Another generic error",
			err:      fmt.Errorf("some other error"),
			expected: "invalid username or password",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := getAuthenticationErrorMessage(tt.err)
			if result != tt.expected {
				t.Errorf("Expected message %q, got %q", tt.expected, result)
			}
		})
	}
}

func TestGetRegistrationErrorMessage(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		expected string
	}{
		{
			name:     "SQLite unique constraint error",
			err:      fmt.Errorf("UNIQUE constraint failed: accounts.username"),
			expected: "username already exists - please choose a different username or login to your existing account",
		},
		{
			name:     "PostgreSQL duplicate key error",
			err:      fmt.Errorf("duplicate key value violates unique constraint"),
			expected: "username already exists - please choose a different username or login to your existing account",
		},
		{
			name:     "Generic database error",
			err:      fmt.Errorf("database connection failed"),
			expected: "registration failed - please try again",
		},
		{
			name:     "Password hashing error",
			err:      fmt.Errorf("bcrypt: invalid cost"),
			expected: "registration failed - please try again",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := getRegistrationErrorMessage(tt.err)
			if result != tt.expected {
				t.Errorf("Expected message %q, got %q", tt.expected, result)
			}
		})
	}
}

func TestParseCheckUsernameRequest(t *testing.T) {
	tests := []struct {
		name      string
		body      string
		shouldErr bool
		username  string
	}{
		{
			name:      "Valid JSON",
			body:      `{"username":"testuser"}`,
			shouldErr: false,
			username:  "testuser",
		},
		{
			name:      "Invalid JSON",
			body:      `{"username":}`,
			shouldErr: true,
		},
		{
			name:      "Empty body",
			body:      ``,
			shouldErr: true,
		},
		{
			name:      "Missing username field",
			body:      `{}`,
			shouldErr: false,
			username:  "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("POST", "/check-username", strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")
			
			result, err := parseCheckUsernameRequest(req)
			
			if tt.shouldErr && err == nil {
				t.Errorf("Expected error but got none")
			}
			if !tt.shouldErr && err != nil {
				t.Errorf("Expected no error but got: %v", err)
			}
			if !tt.shouldErr {
				if result.Username != tt.username {
					t.Errorf("Expected username %q, got %q", tt.username, result.Username)
				}
			}
		})
	}
}

func TestValidateUsernameOnly(t *testing.T) {
	tests := []struct {
		name      string
		username  string
		shouldErr bool
		errMsg    string
	}{
		{
			name:      "Valid username",
			username:  "testuser",
			shouldErr: false,
		},
		{
			name:      "Empty username",
			username:  "",
			shouldErr: true,
			errMsg:    "please enter your username",
		},
		{
			name:      "Whitespace only username",
			username:  "   ",
			shouldErr: true,
			errMsg:    "please enter your username",
		},
		{
			name:      "Valid username with spaces",
			username:  "  testuser  ",
			shouldErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateUsernameOnly(tt.username)
			
			if tt.shouldErr && err == nil {
				t.Errorf("Expected error but got none")
			}
			if !tt.shouldErr && err != nil {
				t.Errorf("Expected no error but got: %v", err)
			}
			if tt.shouldErr && err != nil && err.Error() != tt.errMsg {
				t.Errorf("Expected error message %q, got %q", tt.errMsg, err.Error())
			}
		})
	}
}

func TestWriteCheckUsernameResponse(t *testing.T) {
	tests := []struct {
		name   string
		exists bool
	}{
		{"Username exists", true},
		{"Username does not exist", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			
			writeCheckUsernameResponse(w, tt.exists)
			
			body := w.Body.String()
			if tt.exists {
				if !strings.Contains(body, `"exists":true`) {
					t.Errorf("Expected response body to contain exists:true, got %q", body)
				}
			} else {
				if !strings.Contains(body, `"exists":false`) {
					t.Errorf("Expected response body to contain exists:false, got %q", body)
				}
			}
		})
	}
}

func TestWriteCheckUsernameErrorResponse(t *testing.T) {
	w := httptest.NewRecorder()
	message := "Test error message"
	
	writeCheckUsernameErrorResponse(w, message)
	
	body := w.Body.String()
	if !strings.Contains(body, message) {
		t.Errorf("Expected response body to contain %q, got %q", message, body)
	}
	if !strings.Contains(body, `"error"`) {
		t.Errorf("Expected response body to contain error field, got %q", body)
	}
}