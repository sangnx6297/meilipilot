package proxy

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
)

type streamReg struct {
	mu      sync.Mutex
	cancels map[string]context.CancelFunc
}

func (p *Proxy) ensureStreams() {
	if p.streams == nil {
		p.streams = &streamReg{cancels: map[string]context.CancelFunc{}}
	}
}

func (p *Proxy) StartStream(parent context.Context, id, method, path string, body []byte, emit func(string)) error {
	p.mu.RLock()
	host, key := p.host, p.apiKey
	p.mu.RUnlock()
	if host == "" {
		return fmt.Errorf("not connected")
	}
	p.ensureStreams()
	ctx, cancel := context.WithCancel(parent)
	p.streams.mu.Lock()
	if prev, ok := p.streams.cancels[id]; ok {
		prev()
	}
	p.streams.cancels[id] = cancel
	p.streams.mu.Unlock()

	go func() {
		defer cancel()
		var rdr io.Reader
		if body != nil {
			rdr = strings.NewReader(string(body))
		}
		req, err := http.NewRequestWithContext(ctx, method, host+path, rdr)
		if err != nil {
			emit(fmt.Sprintf("\n[error] %v\n", err))
			return
		}
		if key != "" {
			req.Header.Set("Authorization", "Bearer "+key)
		}
		if body != nil {
			req.Header.Set("Content-Type", "application/json")
		}
		resp, err := p.client.Do(req)
		if err != nil {
			emit(fmt.Sprintf("\n[error] %v\n", err))
			return
		}
		defer resp.Body.Close()
		buf := make([]byte, 32*1024)
		for {
			n, err := resp.Body.Read(buf)
			if n > 0 {
				emit(string(buf[:n]))
			}
			if err != nil {
				if err != io.EOF && ctx.Err() == nil {
					emit(fmt.Sprintf("\n[error] %v\n", err))
				}
				return
			}
		}
	}()
	return nil
}

func (p *Proxy) StopStream(id string) {
	p.ensureStreams()
	p.streams.mu.Lock()
	if c, ok := p.streams.cancels[id]; ok {
		c()
		delete(p.streams.cancels, id)
	}
	p.streams.mu.Unlock()
}
