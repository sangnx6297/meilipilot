package proxy

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestDoForwardsAuthorizationAndPath(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/health" {
			t.Errorf("path=%s", r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer secret-key" {
			t.Errorf("auth=%s", r.Header.Get("Authorization"))
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(200)
		_, _ = w.Write([]byte(`{"status":"available"}`))
	}))
	defer upstream.Close()

	p := New()
	p.SetTarget(upstream.URL, "secret-key")
	res, err := p.Do("GET", "/health", nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	if res.Status != 200 {
		t.Fatalf("status=%d body=%s", res.Status, res.Body)
	}
	if !strings.Contains(string(res.Body), "available") {
		t.Fatalf("body=%s", res.Body)
	}
}

func TestDoMissingTargetReturns503(t *testing.T) {
	p := New()
	res, err := p.Do("GET", "/health", nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	if res.Status != http.StatusServiceUnavailable {
		t.Fatalf("status=%d", res.Status)
	}
}

func TestDoPostBodyAndQuery(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b, _ := io.ReadAll(r.Body)
		if string(b) != `{"q":"ninja"}` {
			t.Errorf("body=%s", b)
		}
		if r.URL.Query().Get("limit") != "2" {
			t.Errorf("query=%s", r.URL.RawQuery)
		}
		if r.Method != http.MethodPost {
			t.Errorf("method=%s", r.Method)
		}
		w.WriteHeader(200)
		_, _ = w.Write([]byte(`{"hits":[]}`))
	}))
	defer upstream.Close()
	p := New()
	p.SetTarget(upstream.URL, "k")
	res, err := p.Do("POST", "/indexes/movies/search", map[string]string{"limit": "2"}, []byte(`{"q":"ninja"}`))
	if err != nil {
		t.Fatal(err)
	}
	if res.Status != 200 {
		t.Fatalf("status=%d", res.Status)
	}
}

func TestReadOnlyBlocksWritesAllowsSearch(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(200)
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer upstream.Close()
	p := New()
	p.SetTarget(upstream.URL, "k")
	p.SetReadOnly(true)
	search, err := p.Do("POST", "/indexes/movies/search", nil, []byte(`{"q":""}`))
	if err != nil || search.Status != 200 {
		t.Fatalf("search blocked: %+v %v", search, err)
	}
	write, err := p.Do("POST", "/indexes/movies/documents", nil, []byte(`[]`))
	if err != nil {
		t.Fatal(err)
	}
	if write.Status != http.StatusForbidden {
		t.Fatalf("write status=%d body=%s", write.Status, write.Body)
	}
	if !strings.Contains(string(write.Body), "connection_read_only") {
		t.Fatalf("body=%s", write.Body)
	}
}
