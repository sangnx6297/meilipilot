package session

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"github.com/lcs/meilisearchui/internal/vault"
)

type Conn struct {
	ID          string
	Host        string
	APIKey      string
	Name        string
	Environment string
	ReadOnly    bool
}

type Profile struct {
	ID          string
	Name        string
	Host        string
	APIKey      string
	Environment string
	ReadOnly    bool
}

type persistProfile struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Host        string `json:"host"`
	APIKey      string `json:"apiKey,omitempty"`
	APIKeyEnc   string `json:"apiKeyEnc,omitempty"`
	Environment string `json:"environment,omitempty"`
	ReadOnly    bool   `json:"readOnly,omitempty"`
}

type fileData struct {
	ActiveID string            `json:"activeId"`
	Profiles []persistProfile  `json:"profiles"`
}

type Store struct {
	mu        sync.RWMutex
	path      string
	protector vault.Protector
	profiles  []Profile
	activeID  string
}

func NewStore() *Store { return &Store{protector: vault.NewOS()} }

func Open(path string) *Store {
	s := &Store{path: path, protector: vault.NewOS()}
	_ = s.load()
	return s
}

const (
	configDirName       = "MeiliPilot"
	legacyConfigDirName = "meilisearchui"
)

func ConfigPath() (string, error) {
	root, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return configPathIn(root)
}

func configPathIn(userConfigDir string) (string, error) {
	dir := filepath.Join(userConfigDir, configDirName)
	legacyDir := filepath.Join(userConfigDir, legacyConfigDirName)
	if err := migrateLegacyConfig(legacyDir, dir); err != nil {
		return "", err
	}
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return "", err
	}
	return filepath.Join(dir, "profiles.json"), nil
}

func migrateLegacyConfig(legacyDir, dir string) error {
	newFile := filepath.Join(dir, "profiles.json")
	if _, err := os.Stat(newFile); err == nil {
		return nil
	}
	oldFile := filepath.Join(legacyDir, "profiles.json")
	raw, err := os.ReadFile(oldFile)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return err
	}
	return os.WriteFile(newFile, raw, 0o600)
}

func (s *Store) List() []Profile {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Profile, len(s.profiles))
	copy(out, s.profiles)
	return out
}

func (s *Store) Set(c Conn) {
	p := Profile{ID: c.ID, Name: c.Name, Host: c.Host, APIKey: c.APIKey, Environment: c.Environment, ReadOnly: c.ReadOnly}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.upsertLocked(p)
}

func (s *Store) Get() (Conn, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	p, ok := s.currentLocked()
	if !ok {
		return Conn{}, false
	}
	return Conn{ID: p.ID, Host: p.Host, APIKey: p.APIKey, Name: p.Name, Environment: p.Environment, ReadOnly: p.ReadOnly}, true
}

func (s *Store) Clear() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.activeID = ""
	_ = s.saveLocked()
}

func (s *Store) Upsert(p Profile) (Profile, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := s.upsertLocked(p)
	return out, s.saveLocked()
}

func (s *Store) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	next := s.profiles[:0]
	for _, p := range s.profiles {
		if p.ID != id {
			next = append(next, p)
		}
	}
	s.profiles = next
	if s.activeID == id {
		s.activeID = ""
	}
	return s.saveLocked()
}

func (s *Store) Activate(id string) (Profile, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, p := range s.profiles {
		if p.ID == id {
			s.activeID = id
			if err := s.saveLocked(); err != nil {
				return Profile{}, err
			}
			return p, nil
		}
	}
	return Profile{}, fmt.Errorf("profile not found")
}

func (s *Store) GetByID(id string) (Profile, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, p := range s.profiles {
		if p.ID == id {
			return p, true
		}
	}
	return Profile{}, false
}

func (s *Store) upsertLocked(p Profile) Profile {
	if p.ID == "" {
		for i, existing := range s.profiles {
			if existing.Host == p.Host && existing.Name == p.Name {
				p.ID = existing.ID
				if p.APIKey == "" {
					p.APIKey = existing.APIKey
				}
				s.profiles[i] = p
				s.activeID = p.ID
				return p
			}
		}
		p.ID = newID()
		s.profiles = append(s.profiles, p)
		s.activeID = p.ID
		return p
	}
	for i, existing := range s.profiles {
		if existing.ID == p.ID {
			if p.APIKey == "" {
				p.APIKey = existing.APIKey
			}
			s.profiles[i] = p
			s.activeID = p.ID
			return p
		}
	}
	s.profiles = append(s.profiles, p)
	s.activeID = p.ID
	return p
}

func (s *Store) currentLocked() (Profile, bool) {
	if s.activeID == "" {
		return Profile{}, false
	}
	for _, p := range s.profiles {
		if p.ID == s.activeID {
			return p, true
		}
	}
	return Profile{}, false
}

func (s *Store) load() error {
	if s.path == "" {
		return nil
	}
	b, err := os.ReadFile(s.path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	var data fileData
	if err := json.Unmarshal(b, &data); err != nil {
		return err
	}
	profs := make([]Profile, 0, len(data.Profiles))
	for _, raw := range data.Profiles {
		p, err := s.decodeProfile(raw)
		if err != nil {
			return err
		}
		profs = append(profs, p)
	}
	s.mu.Lock()
	s.profiles = profs
	s.activeID = data.ActiveID
	s.mu.Unlock()
	return nil
}

func (s *Store) decodeProfile(raw persistProfile) (Profile, error) {
	key := raw.APIKey
	if raw.APIKeyEnc != "" {
		plain, err := s.protector.Open(mustDecode(raw.APIKeyEnc))
		if err != nil {
			return Profile{}, err
		}
		key = string(plain)
	}
	return Profile{
		ID:          raw.ID,
		Name:        raw.Name,
		Host:        raw.Host,
		APIKey:      key,
		Environment: raw.Environment,
		ReadOnly:    raw.ReadOnly,
	}, nil
}

func (s *Store) saveLocked() error {
	if s.path == "" {
		return nil
	}
	raw := make([]persistProfile, 0, len(s.profiles))
	for _, p := range s.profiles {
		enc, err := s.protector.Seal([]byte(p.APIKey))
		if err != nil {
			return err
		}
		item := persistProfile{
			ID:          p.ID,
			Name:        p.Name,
			Host:        p.Host,
			Environment: p.Environment,
			ReadOnly:    p.ReadOnly,
		}
		if len(enc) > 0 {
			item.APIKeyEnc = base64.StdEncoding.EncodeToString(enc)
		}
		raw = append(raw, item)
	}
	data := fileData{ActiveID: s.activeID, Profiles: raw}
	b, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(s.path), 0o700); err != nil {
		return err
	}
	return os.WriteFile(s.path, b, 0o600)
}

func mustDecode(s string) []byte {
	b, err := base64.StdEncoding.DecodeString(s)
	if err != nil {
		return nil
	}
	return b
}

func newID() string {
	var b [8]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}
