package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHomeHandler(t *testing.T) {
	req, err := http.NewRequest("GET", "/", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(homeHandler)

	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	if !strings.Contains(rr.Body.String(), "Allan - Software Engineer") {
		t.Errorf("handler returned unexpected body: missing title")
	}

	if !strings.Contains(rr.Body.String(), "Allan") {
		t.Errorf("handler returned unexpected body: missing name")
	}

	if !strings.Contains(rr.Body.String(), "Send me a message") {
		t.Errorf("handler returned unexpected body: missing message form")
	}
}