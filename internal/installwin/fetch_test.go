package installwin

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestDownloadTo(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("payload"))
	}))
	t.Cleanup(srv.Close)
	dest := filepath.Join(t.TempDir(), "a.bin")
	if err := DownloadTo(context.Background(), srv.Client(), srv.URL, dest); err != nil {
		t.Fatal(err)
	}
	got, _ := os.ReadFile(dest)
	if string(got) != "payload" {
		t.Fatalf("%s", got)
	}
}

func TestGetJSONError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(404)
	}))
	t.Cleanup(srv.Close)
	_, err := GetJSON(context.Background(), srv.Client(), srv.URL)
	if err == nil {
		t.Fatal("expected error")
	}
}
