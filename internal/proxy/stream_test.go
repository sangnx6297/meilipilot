package proxy

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestStartStreamEmitsChunksAndStop(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/logs/stream" || r.Method != http.MethodPost {
			t.Errorf("%s %s", r.Method, r.URL.Path)
		}
		w.Header().Set("Content-Type", "text/event-stream")
		fl := w.(http.Flusher)
		for i := 0; i < 3; i++ {
			fmt.Fprintf(w, "data: %d\n\n", i)
			fl.Flush()
			time.Sleep(15 * time.Millisecond)
		}
	}))
	defer upstream.Close()

	p := New()
	p.SetTarget(upstream.URL, "k")
	var mu sync.Mutex
	var got []string
	err := p.StartStream(context.Background(), "logs", "POST", "/logs/stream", []byte(`{}`), func(chunk string) {
		mu.Lock()
		got = append(got, chunk)
		mu.Unlock()
	})
	if err != nil {
		t.Fatal(err)
	}
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		mu.Lock()
		n := len(strings.Join(got, ""))
		mu.Unlock()
		if n > 0 {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}
	p.StopStream("logs")
	mu.Lock()
	defer mu.Unlock()
	if !strings.Contains(strings.Join(got, ""), "data:") {
		t.Fatalf("chunks=%v", got)
	}
}

func TestStartStreamRequiresTarget(t *testing.T) {
	p := New()
	err := p.StartStream(context.Background(), "x", "GET", "/tasks/stream", nil, func(string) {})
	if err == nil {
		t.Fatal("expected error")
	}
}
