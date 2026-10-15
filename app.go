package main

import (
	"context"
	"os"

	"github.com/lcs/meilisearchui/internal/proxy"
	"github.com/lcs/meilisearchui/internal/session"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx  context.Context
	sess *session.Store
	pxy  *proxy.Proxy
}

func NewApp() *App {
	path, err := session.ConfigPath()
	var store *session.Store
	if err != nil {
		store = session.NewStore()
	} else {
		store = session.Open(path)
	}
	app := &App{sess: store, pxy: proxy.New()}
	if c, ok := store.Get(); ok {
		app.pxy.SetTarget(c.Host, c.APIKey)
		app.pxy.SetReadOnly(c.ReadOnly)
	}
	return app
}

func (a *App) startup(ctx context.Context) { a.ctx = ctx }

type SessionDTO struct {
	ID          string `json:"id"`
	Host        string `json:"host"`
	Name        string `json:"name"`
	Environment string `json:"environment"`
	ReadOnly    bool   `json:"readOnly"`
}

type ProfileDTO struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Host        string `json:"host"`
	Environment string `json:"environment"`
	ReadOnly    bool   `json:"readOnly"`
	HasKey      bool   `json:"hasKey"`
}

type ForwardResult struct {
	Status int    `json:"status"`
	Body   string `json:"body"`
}

func toSession(p session.Profile) SessionDTO {
	return SessionDTO{ID: p.ID, Host: p.Host, Name: p.Name, Environment: p.Environment, ReadOnly: p.ReadOnly}
}

func toProfile(p session.Profile) ProfileDTO {
	return ProfileDTO{
		ID:          p.ID,
		Name:        p.Name,
		Host:        p.Host,
		Environment: p.Environment,
		ReadOnly:    p.ReadOnly,
		HasKey:      p.APIKey != "",
	}
}

func (a *App) apply(p session.Profile) SessionDTO {
	a.pxy.SetTarget(p.Host, p.APIKey)
	a.pxy.SetReadOnly(p.ReadOnly)
	return toSession(p)
}

func (a *App) Connect(host, apiKey, name, environment string, readOnly bool) (SessionDTO, error) {
	p, err := a.sess.Upsert(session.Profile{
		Name:        name,
		Host:        host,
		APIKey:      apiKey,
		Environment: environment,
		ReadOnly:    readOnly,
	})
	if err != nil {
		return SessionDTO{}, err
	}
	return a.apply(p), nil
}

func (a *App) ListProfiles() []ProfileDTO {
	raw := a.sess.List()
	out := make([]ProfileDTO, 0, len(raw))
	for _, p := range raw {
		out = append(out, toProfile(p))
	}
	return out
}

func (a *App) UseProfile(id string) (SessionDTO, error) {
	p, err := a.sess.Activate(id)
	if err != nil {
		return SessionDTO{}, err
	}
	return a.apply(p), nil
}

func (a *App) DeleteProfile(id string) error {
	cur, ok := a.sess.Get()
	if err := a.sess.Delete(id); err != nil {
		return err
	}
	if ok && cur.ID == id {
		a.pxy.Clear()
	}
	return nil
}

func (a *App) Disconnect() {
	a.sess.Clear()
	a.pxy.Clear()
}

func (a *App) Session() *SessionDTO {
	c, ok := a.sess.Get()
	if !ok {
		return nil
	}
	dto := SessionDTO{ID: c.ID, Host: c.Host, Name: c.Name, Environment: c.Environment, ReadOnly: c.ReadOnly}
	return &dto
}

func (a *App) CopyText(text string) error {
	if a.ctx == nil {
		return nil
	}
	return runtime.ClipboardSetText(a.ctx, text)
}

func (a *App) SaveTextFile(defaultName, content string) (string, error) {
	if a.ctx == nil {
		return "", nil
	}
	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:                "Lưu file",
		DefaultFilename:      defaultName,
		CanCreateDirectories: true,
	})
	if err != nil {
		return "", err
	}
	if path == "" {
		return "", nil
	}
	return path, os.WriteFile(path, []byte(content), 0o644)
}

func (a *App) Forward(method, path string, query map[string]string, body string) (ForwardResult, error) {
	var b []byte
	if body != "" {
		b = []byte(body)
	}
	res, err := a.pxy.Do(method, path, query, b)
	if err != nil {
		return ForwardResult{}, err
	}
	return ForwardResult{Status: res.Status, Body: string(res.Body)}, nil
}

func (a *App) ForwardFor(profileId, method, path string, query map[string]string, body string) (ForwardResult, error) {
	p, ok := a.sess.GetByID(profileId)
	if !ok {
		return ForwardResult{Status: 404, Body: `{"message":"profile not found","code":"profile_not_found","type":"auth","link":""}`}, nil
	}
	var b []byte
	if body != "" {
		b = []byte(body)
	}
	res, err := a.pxy.DoOn(p.Host, p.APIKey, p.ReadOnly, method, path, query, b)
	if err != nil {
		return ForwardResult{}, err
	}
	return ForwardResult{Status: res.Status, Body: string(res.Body)}, nil
}

func (a *App) StartStream(id, method, path, body string) error {
	return a.pxy.StartStream(a.ctx, id, method, path, []byte(body), func(chunk string) {
		runtime.EventsEmit(a.ctx, "meili:stream:"+id, chunk)
	})
}

func (a *App) StopStream(id string) {
	a.pxy.StopStream(id)
}
