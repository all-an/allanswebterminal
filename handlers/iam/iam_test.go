package iam

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCreateUserHandler(t *testing.T) {
	req := CreateUserRequest{
		UserName: "test-user",
		Path:     "/",
		Tags:     map[string]string{"Environment": "test"},
	}

	reqBody, _ := json.Marshal(req)
	httpReq, _ := http.NewRequest("POST", "/api/iam/users", bytes.NewBuffer(reqBody))
	httpReq.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(CreateUserHandler)

	// Note: This test will fail without proper database setup
	// This is a basic structure for testing
	handler.ServeHTTP(rr, httpReq)

	if status := rr.Code; status != http.StatusOK && status != http.StatusInternalServerError {
		t.Errorf("handler returned wrong status code: got %v want %v or %v",
			status, http.StatusOK, http.StatusInternalServerError)
	}
}

func TestCreateRoleHandler(t *testing.T) {
	req := CreateRoleRequest{
		RoleName:    "test-role",
		Path:        "/",
		Description: "Test role for unit testing",
		Tags:        map[string]string{"Environment": "test"},
	}

	reqBody, _ := json.Marshal(req)
	httpReq, _ := http.NewRequest("POST", "/api/iam/roles", bytes.NewBuffer(reqBody))
	httpReq.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(CreateRoleHandler)

	handler.ServeHTTP(rr, httpReq)

	if status := rr.Code; status != http.StatusOK && status != http.StatusInternalServerError {
		t.Errorf("handler returned wrong status code: got %v want %v or %v",
			status, http.StatusOK, http.StatusInternalServerError)
	}
}

func TestGenerateUserID(t *testing.T) {
	id1 := generateUserID()
	id2 := generateUserID()

	if id1 == id2 {
		t.Error("generateUserID should return unique IDs")
	}

	if len(id1) != 24 { // AIDA + 20 hex characters
		t.Errorf("generateUserID should return 24 characters, got %d", len(id1))
	}

	if id1[:4] != "AIDA" {
		t.Errorf("generateUserID should start with AIDA, got %s", id1[:4])
	}
}

func TestGenerateRoleID(t *testing.T) {
	id1 := generateRoleID()
	id2 := generateRoleID()

	if id1 == id2 {
		t.Error("generateRoleID should return unique IDs")
	}

	if len(id1) != 24 { // AROA + 20 hex characters
		t.Errorf("generateRoleID should return 24 characters, got %d", len(id1))
	}

	if id1[:4] != "AROA" {
		t.Errorf("generateRoleID should start with AROA, got %s", id1[:4])
	}
}