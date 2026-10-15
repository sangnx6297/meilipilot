package proxy

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

type Proxy struct {
	mu       sync.RWMutex
	host     string
	apiKey   string
	readOnly bool
	client   *http.Client
	streams  *streamReg
}

func New() *Proxy {
	return &Proxy{client: &http.Client{Timeout: 30 * time.Second}}
}

func (p *Proxy) SetTarget(host, apiKey string) {
	p.mu.Lock()
	p.host = strings.TrimRight(host, "/")
	p.apiKey = apiKey
	p.mu.Unlock()
}

func (p *Proxy) SetReadOnly(v bool) {
	p.mu.Lock()
	p.readOnly = v
	p.mu.Unlock()
}

func (p *Proxy) Clear() {
	p.mu.Lock()
	p.host, p.apiKey, p.readOnly = "", "", false
	p.mu.Unlock()
}

type Result struct {
	Status int
	Body   []byte
}

func readOnlyDenied() Result {
	return Result{
		Status: http.StatusForbidden,
		Body:   []byte(`{"message":"connection is read-only","code":"connection_read_only","type":"auth","link":""}`),
	}
}

func (p *Proxy) Do(method, path string, query map[string]string, body []byte) (Result, error) {
	p.mu.RLock()
	host, key, ro := p.host, p.apiKey, p.readOnly
	p.mu.RUnlock()
	return p.DoOn(host, key, ro, method, path, query, body)
}

func (p *Proxy) DoOn(host, apiKey string, readOnly bool, method, path string, query map[string]string, body []byte) (Result, error) {
	if host == "" {
		return Result{Status: http.StatusServiceUnavailable, Body: []byte(`{"message":"not connected","code":"not_connected","type":"auth","link":""}`)}, nil
	}
	if readOnly && !IsReadRequest(method, path) {
		return readOnlyDenied(), nil
	}
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	u, err := url.Parse(strings.TrimRight(host, "/") + path)
	if err != nil {
		return Result{}, err
	}
	q := u.Query()
	for k, v := range query {
		if v != "" {
			q.Set(k, v)
		}
	}
	u.RawQuery = q.Encode()
	var rdr io.Reader
	if body != nil {
		rdr = bytes.NewReader(body)
	}
	req, err := http.NewRequest(method, u.String(), rdr)
	if err != nil {
		return Result{}, err
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+apiKey)
	}
	resp, err := p.client.Do(req)
	if err != nil {
		return classifyNetErr(err), nil
	}
	defer resp.Body.Close()
	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return Result{}, err
	}
	return Result{Status: resp.StatusCode, Body: b}, nil
}

func classifyNetErr(err error) Result {
	code := "proxy_error"
	status := http.StatusBadGateway
	var ne net.Error
	if errors.As(err, &ne) && ne.Timeout() {
		code = "proxy_timeout"
		status = http.StatusGatewayTimeout
	}
	return Result{
		Status: status,
		Body:   []byte(fmt.Sprintf(`{"message":%q,"code":%q,"type":"system","link":""}`, err.Error(), code)),
	}
}
