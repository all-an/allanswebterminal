package messages

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestValidateMessageRequest(t *testing.T) {
	tests := []struct {
		name    string
		request *MessageRequest
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid request",
			request: &MessageRequest{
				Name:    "John Doe",
				Email:   "john@example.com",
				Message: "Hello world",
			},
			wantErr: false,
		},
		{
			name: "empty name",
			request: &MessageRequest{
				Name:    "",
				Email:   "john@example.com",
				Message: "Hello world",
			},
			wantErr: true,
			errMsg:  "name is required",
		},
		{
			name: "whitespace only name",
			request: &MessageRequest{
				Name:    "   ",
				Email:   "john@example.com",
				Message: "Hello world",
			},
			wantErr: true,
			errMsg:  "name is required",
		},
		{
			name: "empty email",
			request: &MessageRequest{
				Name:    "John Doe",
				Email:   "",
				Message: "Hello world",
			},
			wantErr: true,
			errMsg:  "email is required",
		},
		{
			name: "empty message",
			request: &MessageRequest{
				Name:    "John Doe",
				Email:   "john@example.com",
				Message: "",
			},
			wantErr: true,
			errMsg:  "message is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateMessageRequest(tt.request)
			if tt.wantErr {
				if err == nil {
					t.Errorf("validateMessageRequest() expected error but got none")
					return
				}
				if !strings.Contains(err.Error(), tt.errMsg) {
					t.Errorf("validateMessageRequest() error = %v, want error containing %v", err, tt.errMsg)
				}
			} else {
				if err != nil {
					t.Errorf("validateMessageRequest() unexpected error = %v", err)
				}
			}
		})
	}
}

func TestParseMessageRequest(t *testing.T) {
	tests := []struct {
		name    string
		body    string
		want    *MessageRequest
		wantErr bool
	}{
		{
			name: "valid JSON",
			body: `{"name":"John Doe","email":"john@example.com","message":"Hello world"}`,
			want: &MessageRequest{
				Name:    "John Doe",
				Email:   "john@example.com",
				Message: "Hello world",
			},
			wantErr: false,
		},
		{
			name:    "invalid JSON",
			body:    `{"name":"John Doe","email":}`,
			want:    nil,
			wantErr: true,
		},
		{
			name:    "empty body",
			body:    "",
			want:    nil,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("POST", "/api/messages", strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")

			got, err := parseMessageRequest(req)
			if tt.wantErr {
				if err == nil {
					t.Errorf("parseMessageRequest() expected error but got none")
				}
				return
			}

			if err != nil {
				t.Errorf("parseMessageRequest() unexpected error = %v", err)
				return
			}

			if got.Name != tt.want.Name || got.Email != tt.want.Email || got.Message != tt.want.Message {
				t.Errorf("parseMessageRequest() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestSetCORSHeaders(t *testing.T) {
	w := httptest.NewRecorder()
	setCORSHeaders(w)

	expectedHeaders := map[string]string{
		"Access-Control-Allow-Origin":  "*",
		"Access-Control-Allow-Methods": "POST",
		"Access-Control-Allow-Headers": "Content-Type",
		"Content-Type":                 "application/json",
	}

	for header, expectedValue := range expectedHeaders {
		if got := w.Header().Get(header); got != expectedValue {
			t.Errorf("setCORSHeaders() header %s = %v, want %v", header, got, expectedValue)
		}
	}
}

func TestMessagesHandlerMethodNotAllowed(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/messages", nil)
	w := httptest.NewRecorder()

	MessagesHandler(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("MessagesHandler() status = %v, want %v", w.Code, http.StatusMethodNotAllowed)
	}
}

func TestMessagesHandlerInvalidJSON(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/messages", strings.NewReader(`{"invalid": json}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	MessagesHandler(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("MessagesHandler() status = %v, want %v", w.Code, http.StatusBadRequest)
	}
}

func TestMessagesHandlerValidationError(t *testing.T) {
	requestBody := MessageRequest{
		Name:    "",
		Email:   "john@example.com",
		Message: "Hello world",
	}

	jsonBody, _ := json.Marshal(requestBody)
	req := httptest.NewRequest("POST", "/api/messages", bytes.NewReader(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	MessagesHandler(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("MessagesHandler() status = %v, want %v", w.Code, http.StatusBadRequest)
	}

	if !strings.Contains(w.Body.String(), "name is required") {
		t.Errorf("MessagesHandler() body should contain validation error message")
	}
}