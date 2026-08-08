package services

import (
	"errors"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

const (
	defaultBridgeURL     = "http://192.168.1.164:8587"
	bridgeRequestTimeout = 20 * time.Second
)

// BridgeClient is a thin HTTP proxy client towards the catalogue bridge
// service (Rust) running on the mini PC. It only forwards requests and
// returns the raw response body plus content type / status code so handlers
// can pass everything through untouched.
type BridgeClient struct {
	baseURL string
	client  *http.Client
}

// BridgeResponse is the raw result of a bridge call.
type BridgeResponse struct {
	StatusCode  int
	ContentType string
	Body        []byte
}

var defaultBridgeClient = NewBridgeClient(BridgeBaseURL())

// BridgeBaseURL returns the configured bridge base URL.
func BridgeBaseURL() string {
	if v := strings.TrimSpace(os.Getenv("BRIDGE_URL")); v != "" {
		return strings.TrimRight(v, "/")
	}
	return defaultBridgeURL
}

// NewBridgeClient builds a bridge client for the given base URL.
func NewBridgeClient(baseURL string) *BridgeClient {
	return &BridgeClient{
		baseURL: strings.TrimRight(baseURL, "/"),
		client:  &http.Client{Timeout: bridgeRequestTimeout},
	}
}

// Bridge returns the process-wide bridge client.
func Bridge() *BridgeClient { return defaultBridgeClient }

func (b *BridgeClient) do(method, path string, query url.Values) (*BridgeResponse, error) {
	if b.baseURL == "" {
		return nil, errors.New("bridge URL not configured")
	}

	target := b.baseURL + path
	if len(query) > 0 {
		target += "?" + query.Encode()
	}

	req, err := http.NewRequest(method, target, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")

	resp, err := b.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/json"
	}

	return &BridgeResponse{
		StatusCode:  resp.StatusCode,
		ContentType: contentType,
		Body:        body,
	}, nil
}

// SearchTorrents proxies GET /api/catalogue/search?q=
func (b *BridgeClient) SearchTorrents(query string) (*BridgeResponse, error) {
	q := url.Values{}
	q.Set("q", query)
	return b.do(http.MethodGet, "/api/catalogue/search", q)
}

// GetMedia proxies GET /api/catalogue/media/{id}
func (b *BridgeClient) GetMedia(id string) (*BridgeResponse, error) {
	return b.do(http.MethodGet, "/api/catalogue/media/"+url.PathEscape(id), nil)
}

// GetDownloadStatus proxies GET /api/catalogue/status/{mediaId}
func (b *BridgeClient) GetDownloadStatus(mediaID string) (*BridgeResponse, error) {
	return b.do(http.MethodGet, "/api/catalogue/status/"+url.PathEscape(mediaID), nil)
}

// DownloadTorrent proxies POST /api/catalogue/download/{torrentId}
func (b *BridgeClient) DownloadTorrent(torrentID string) (*BridgeResponse, error) {
	return b.do(http.MethodPost, "/api/catalogue/download/"+url.PathEscape(torrentID), nil)
}
