package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

type QBClient struct {
	baseURL  string
	username string
	password string

	httpClient *http.Client

	mu        sync.Mutex
	loggedIn  bool
	lastLogin time.Time
}

func NewQBClient(baseURL, username, password string) *QBClient {
	return &QBClient{
		baseURL:  strings.TrimRight(baseURL, "/"),
		username: username,
		password: password,
		httpClient: &http.Client{
			Timeout: 8 * time.Second,
		},
	}
}

func (c *QBClient) ListTorrents(ctx context.Context) ([]Torrent, error) {
	if err := c.ensureLogin(ctx); err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "GET", c.baseURL+"/api/v2/torrents/info", nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// If cookie expired, try one relogin and retry once.
	if resp.StatusCode == http.StatusForbidden {
		c.mu.Lock()
		c.loggedIn = false
		c.mu.Unlock()

		if err := c.ensureLogin(ctx); err != nil {
			return nil, err
		}
		return c.ListTorrents(ctx)
	}

	if resp.StatusCode != 200 {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("qbittorrent torrents/info failed: %s (%s)", resp.Status, string(b))
	}

	var raw []struct {
		Name     string  `json:"name"`
		Progress float64 `json:"progress"`
		DlSpeed  int64   `json:"dlspeed"`
		Eta      int64   `json:"eta"`
		State    string  `json:"state"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, err
	}

	out := make([]Torrent, 0, len(raw))
	for _, r := range raw {
		out = append(out, Torrent{
			Name:     r.Name,
			Progress: r.Progress,
			DlSpeed:  r.DlSpeed,
			Eta:      r.Eta,
			State:    r.State,
		})
	}
	return out, nil
}

func (c *QBClient) ensureLogin(ctx context.Context) error {
	c.mu.Lock()
	already := c.loggedIn && time.Since(c.lastLogin) < 30*time.Minute
	c.mu.Unlock()
	if already {
		return nil
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	// check again after lock
	if c.loggedIn && time.Since(c.lastLogin) < 30*time.Minute {
		return nil
	}

	form := url.Values{}
	form.Set("username", c.username)
	form.Set("password", c.password)

	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/api/v2/auth/login", strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	b, _ := io.ReadAll(resp.Body)
	body := strings.TrimSpace(string(b))

	if resp.StatusCode != 200 {
		return fmt.Errorf("qbittorrent login failed: %s (%s)", resp.Status, body)
	}

	if body != "Ok." {
		return errors.New("qbittorrent login failed: " + body)
	}

	c.loggedIn = true
	c.lastLogin = time.Now()
	return nil
}
