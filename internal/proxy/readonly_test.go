package proxy

import "testing"

func TestIsReadRequest(t *testing.T) {
	reads := [][2]string{
		{"GET", "/health"},
		{"GET", "/indexes"},
		{"HEAD", "/version"},
		{"POST", "/indexes/movies/search"},
		{"POST", "/indexes/movies/facet-search"},
		{"POST", "/indexes/movies/similar"},
		{"POST", "/indexes/movies/documents/fetch"},
		{"POST", "/multi-search"},
		{"POST", "/logs/stream"},
		{"POST", "/render-template"},
	}
	for _, c := range reads {
		if !IsReadRequest(c[0], c[1]) {
			t.Errorf("expected read %s %s", c[0], c[1])
		}
	}
	writes := [][2]string{
		{"POST", "/indexes"},
		{"POST", "/indexes/movies/documents"},
		{"PATCH", "/indexes/movies/settings"},
		{"DELETE", "/indexes/movies"},
		{"PUT", "/indexes/movies/documents"},
		{"POST", "/dumps"},
		{"POST", "/keys"},
		{"DELETE", "/keys/abc"},
		{"PATCH", "/keys/abc"},
	}
	for _, c := range writes {
		if IsReadRequest(c[0], c[1]) {
			t.Errorf("expected write %s %s", c[0], c[1])
		}
	}
}
