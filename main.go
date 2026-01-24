package main

import (
	"context"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Torrent struct {
	Name     string
	Progress float64 // 0..1
	DlSpeed  int64   // bytes/sec
	Eta      int64   // seconds
	State    string
}

type PageData struct {
	Now            time.Time
	RefreshSeconds int
	QBUrl          string

	ActiveCount int
	TotalDlBps  int64

	Torrents []Torrent
	Error    string
}

func main() {
	_ = godotenv.Load()
	port := env("PORT", "8079")
	qbURL := env("QB_URL", "http://localhost:8080")
	qbUser := env("QB_USER", "admin")
	qbPass := env("QB_PASS", "adminadmin")
	refreshSeconds := envInt("REFRESH_SECONDS", 3)

	client := NewQBClient(qbURL, qbUser, qbPass)

	tmpl := template.Must(template.New("index").Funcs(template.FuncMap{
		"FormatBps":     formatBytesPerSec,
		"FormatPercent": formatPercent,
		"FormatETA":     formatETA,
	}).Parse(indexHTML))

	mux := http.NewServeMux()

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		data := PageData{
			Now:            time.Now(),
			RefreshSeconds: refreshSeconds,
			QBUrl:          qbURL,
		}

		torrents, err := client.ListTorrents(ctx)
		if err != nil {
			data.Error = err.Error()
		} else {
			data.Torrents = torrents
			for _, t := range torrents {
				// active-ish states vary; we'll just count anything not complete
				if t.Progress < 1.0 {
					data.ActiveCount++
				}
				data.TotalDlBps += t.DlSpeed
			}
		}

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		if err := tmpl.Execute(w, data); err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
	})

	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintln(w, "ok")
	})

	addr := ":" + port
	log.Printf("qb-dash listening on %s\n", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}

func env(key, fallback string) string {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	return v
}

func envInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func formatBytesPerSec(bps int64) string {
	const (
		KB = 1024
		MB = 1024 * KB
		GB = 1024 * MB
	)
	switch {
	case bps >= GB:
		return fmt.Sprintf("%.2f GB/s", float64(bps)/float64(GB))
	case bps >= MB:
		return fmt.Sprintf("%.2f MB/s", float64(bps)/float64(MB))
	case bps >= KB:
		return fmt.Sprintf("%.2f KB/s", float64(bps)/float64(KB))
	default:
		return fmt.Sprintf("%d B/s", bps)
	}
}

func formatPercent(p float64) string {
	return fmt.Sprintf("%.1f%%", p*100.0)
}

func formatETA(seconds int64) string {
	if seconds <= 0 || seconds > 60*60*24*365 {
		return "-"
	}
	d := time.Duration(seconds) * time.Second
	// show like 12m3s or 2h1m
	if d >= time.Hour {
		h := int(d / time.Hour)
		m := int((d % time.Hour) / time.Minute)
		return fmt.Sprintf("%dh%dm", h, m)
	}
	if d >= time.Minute {
		m := int(d / time.Minute)
		s := int((d % time.Minute) / time.Second)
		return fmt.Sprintf("%dm%ds", m, s)
	}
	return fmt.Sprintf("%ds", int(d/time.Second))
}

var indexHTML = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta http-equiv="refresh" content="{{.RefreshSeconds}}" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>qb-dash</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; margin: 24px; }
    .top { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
    .card { padding: 12px 14px; border: 1px solid #ddd; border-radius: 10px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid #eee; }
    th { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #444; }
    .muted { color: #666; font-size: 12px; }
    .err { color: #b00020; font-weight: 600; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
  </style>
</head>
<body>
  <h1>qb-dash</h1>
  <div class="muted">qBittorrent: <span class="mono">{{.QBUrl}}</span></div>
  <div class="muted">Updated: {{.Now}}</div>

  {{if .Error}}
    <p class="err">Error: {{.Error}}</p>
  {{end}}

  <div class="top">
    <div class="card">
      <div class="muted">Active</div>
      <div style="font-size: 22px; font-weight: 700;">{{.ActiveCount}}</div>
    </div>
    <div class="card">
      <div class="muted">Total download</div>
      <div style="font-size: 22px; font-weight: 700;">{{FormatBps .TotalDlBps}}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Progress</th>
        <th>Down</th>
        <th>ETA</th>
        <th>State</th>
      </tr>
    </thead>
    <tbody>
      {{if not .Torrents}}
        <tr><td colspan="5" class="muted">No torrents found.</td></tr>
      {{end}}
      {{range .Torrents}}
        <tr>
          <td>{{.Name}}</td>
          <td>{{FormatPercent .Progress}}</td>
          <td>{{FormatBps .DlSpeed}}</td>
          <td>{{FormatETA .Eta}}</td>
          <td class="mono">{{.State}}</td>
        </tr>
      {{end}}
    </tbody>
  </table>
</body>
</html>
`
