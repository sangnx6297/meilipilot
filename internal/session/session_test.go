package session

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestConfigPathUsesMeiliPilotAppData(t *testing.T) {
	root := t.TempDir()
	t.Setenv("APPDATA", root)
	t.Setenv("HOME", root)
	t.Setenv("XDG_CONFIG_HOME", root)
	path, err := configPathIn(root)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(filepath.ToSlash(path), "/MeiliPilot/profiles.json") {
		t.Fatalf("path=%s", path)
	}
	if _, err := os.Stat(filepath.Dir(path)); err != nil {
		t.Fatal(err)
	}
}

func TestConfigPathMigratesLegacyFolder(t *testing.T) {
	root := t.TempDir()
	legacy := filepath.Join(root, "meilisearchui")
	if err := os.MkdirAll(legacy, 0o700); err != nil {
		t.Fatal(err)
	}
	old := []byte(`{"activeId":"x","profiles":[{"id":"x","name":"legacy"}]}`)
	if err := os.WriteFile(filepath.Join(legacy, "profiles.json"), old, 0o600); err != nil {
		t.Fatal(err)
	}
	path, err := configPathIn(root)
	if err != nil {
		t.Fatal(err)
	}
	got, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != string(old) {
		t.Fatalf("migrated=%s", got)
	}
}

func TestSetGetClear(t *testing.T) {
	s := NewStore()
	s.Set(Conn{Host: "http://127.0.0.1:7700", APIKey: "master-key-16bytes", Name: "local"})
	got, ok := s.Get()
	if !ok || got.Host != "http://127.0.0.1:7700" || got.APIKey != "master-key-16bytes" {
		t.Fatalf("get mismatch: %+v ok=%v", got, ok)
	}
	s.Clear()
	if _, ok := s.Get(); ok {
		t.Fatal("expected cleared")
	}
}

func TestMultipleProfilesPersist(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "profiles.json")
	s := Open(path)
	a, err := s.Upsert(Profile{Name: "local", Host: "http://127.0.0.1:7700", APIKey: "key-a"})
	if err != nil {
		t.Fatal(err)
	}
	b, err := s.Upsert(Profile{Name: "staging", Host: "http://10.0.0.2:7700", APIKey: "key-b"})
	if err != nil {
		t.Fatal(err)
	}
	if len(s.List()) != 2 {
		t.Fatalf("list=%d", len(s.List()))
	}
	got, err := s.Activate(a.ID)
	if err != nil || got.APIKey != "key-a" {
		t.Fatalf("activate a: %+v %v", got, err)
	}
	if _, err := s.Activate(b.ID); err != nil {
		t.Fatal(err)
	}
	cur, ok := s.Get()
	if !ok || cur.Name != "staging" {
		t.Fatalf("current=%+v", cur)
	}

	s2 := Open(path)
	if len(s2.List()) != 2 {
		t.Fatalf("reload list=%d", len(s2.List()))
	}
	cur2, ok := s2.Get()
	if !ok || cur2.Name != "staging" || cur2.APIKey != "key-b" {
		t.Fatalf("reload current=%+v ok=%v", cur2, ok)
	}
	if err := s2.Delete(a.ID); err != nil {
		t.Fatal(err)
	}
	if len(Open(path).List()) != 1 {
		t.Fatal("delete did not persist")
	}
}

func TestPersistedFileOmitsPlaintextAPIKey(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "profiles.json")
	s := Open(path)
	if _, err := s.Upsert(Profile{Name: "local", Host: "http://127.0.0.1:7700", APIKey: "super-secret-key-xyz", Environment: "production", ReadOnly: true}); err != nil {
		t.Fatal(err)
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(raw), "super-secret-key-xyz") {
		t.Fatalf("plaintext key leaked:\n%s", raw)
	}
	if strings.Contains(string(raw), `"apiKey"`) {
		t.Fatalf("legacy apiKey field still written:\n%s", raw)
	}
	s2 := Open(path)
	cur, ok := s2.Get()
	if !ok || cur.APIKey != "super-secret-key-xyz" {
		t.Fatalf("roundtrip key=%q ok=%v", cur.APIKey, ok)
	}
	if cur.Environment != "production" || !cur.ReadOnly {
		t.Fatalf("env fields=%+v", cur)
	}
}

func TestLegacyPlaintextMigratesOnSave(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "profiles.json")
	legacy := []byte(`{"activeId":"abc","profiles":[{"id":"abc","name":"old","host":"http://h","apiKey":"legacy-plain-key"}]}`)
	if err := os.WriteFile(path, legacy, 0o600); err != nil {
		t.Fatal(err)
	}
	s := Open(path)
	got, ok := s.Get()
	if !ok || got.APIKey != "legacy-plain-key" {
		t.Fatalf("load legacy=%+v ok=%v", got, ok)
	}
	if _, err := s.Upsert(Profile{ID: got.ID, Name: got.Name, Host: got.Host, APIKey: got.APIKey}); err != nil {
		t.Fatal(err)
	}
	raw, _ := os.ReadFile(path)
	if strings.Contains(string(raw), "legacy-plain-key") {
		t.Fatalf("legacy key still plaintext:\n%s", raw)
	}
}
