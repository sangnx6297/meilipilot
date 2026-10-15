package installwin

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

type DepAction int

const (
	DepSkip DepAction = iota
	DepInstall
	DepUpgrade
)

type PinnedDep struct {
	Name    string `json:"name"`
	Version string `json:"version"`
	File    string `json:"file"`
	SHA256  string `json:"sha256"`
	Source  string `json:"source"`
}

type DepsFile struct {
	WebView2 PinnedDep `json:"webview2"`
}

type DepConsent struct {
	Install bool
	Abort   error
}

func CompareDotVersion(a, b string) int {
	as := parseDotInts(a)
	bs := parseDotInts(b)
	n := len(as)
	if len(bs) > n {
		n = len(bs)
	}
	for i := 0; i < n; i++ {
		var va, vb int
		if i < len(as) {
			va = as[i]
		}
		if i < len(bs) {
			vb = bs[i]
		}
		if va < vb {
			return -1
		}
		if va > vb {
			return 1
		}
	}
	return 0
}

func parseDotInts(s string) []int {
	s = strings.TrimSpace(s)
	s = strings.TrimPrefix(s, "v")
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ".")
	out := make([]int, 0, len(parts))
	for _, p := range parts {
		n, err := strconv.Atoi(p)
		if err != nil {
			n = 0
		}
		out = append(out, n)
	}
	return out
}

func NormalizeWebView2PV(pv string) string {
	pv = strings.TrimSpace(pv)
	if pv == "" || pv == "0.0.0.0" {
		return ""
	}
	return pv
}

func PlanDep(installed, pinned string) DepAction {
	installed = NormalizeWebView2PV(installed)
	pinned = strings.TrimSpace(pinned)
	if installed == "" {
		return DepInstall
	}
	if pinned == "" {
		return DepSkip
	}
	if CompareDotVersion(installed, pinned) < 0 {
		return DepUpgrade
	}
	return DepSkip
}

func DepConfirmMessage(name, installed, pinned string, action DepAction) string {
	switch action {
	case DepInstall:
		return fmt.Sprintf("May chua co %s. MeiliPilot can %s. Cai bay gio?", name, pinned)
	case DepUpgrade:
		return fmt.Sprintf("%s tren may %s cu hon ban goi %s. Cai de (nang cap)?", name, installed, pinned)
	default:
		return ""
	}
}

func ApplyDepConsent(action DepAction, accepted bool) DepConsent {
	switch action {
	case DepInstall:
		if !accepted {
			return DepConsent{Abort: fmt.Errorf("can WebView2 Runtime; nguoi dung tu choi cai")}
		}
		return DepConsent{Install: true}
	case DepUpgrade:
		if !accepted {
			return DepConsent{}
		}
		return DepConsent{Install: true}
	default:
		return DepConsent{}
	}
}

func LoadDepsJSON(raw []byte) (DepsFile, error) {
	var d DepsFile
	if err := json.Unmarshal(raw, &d); err != nil {
		return DepsFile{}, err
	}
	if strings.TrimSpace(d.WebView2.File) == "" || strings.TrimSpace(d.WebView2.Version) == "" {
		return DepsFile{}, fmt.Errorf("deps.json webview2 thieu version/file — chay installer/vendor-deps.ps1")
	}
	if d.WebView2.Name == "" {
		d.WebView2.Name = "WebView2 Runtime"
	}
	return d, nil
}

func LoadDepsFile(path string) (DepsFile, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return DepsFile{}, err
	}
	return LoadDepsJSON(raw)
}

func PayloadDir(setupDir string) string {
	return filepath.Join(setupDir, "payload")
}

func ResolvePinnedFile(payloadDir string, dep PinnedDep) (string, error) {
	if dep.File == "" {
		return "", fmt.Errorf("deps.json thieu file")
	}
	p := filepath.Join(payloadDir, filepath.Base(dep.File))
	st, err := os.Stat(p)
	if err != nil || st.IsDir() {
		return "", fmt.Errorf("thieu payload %s (dat thu muc payload canh MeiliPilot-Setup.exe)", dep.File)
	}
	return p, nil
}

func FileSHA256(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

func VerifySHA256(path, wantHex string) error {
	wantHex = strings.TrimSpace(wantHex)
	if wantHex == "" {
		return nil
	}
	got, err := FileSHA256(path)
	if err != nil {
		return err
	}
	if !strings.EqualFold(got, wantHex) {
		return fmt.Errorf("sha256 payload lech (got %s)", got)
	}
	return nil
}

// Evergreen Standalone x64 (offline). 2093504 is macOS pkg — do not use.
const WebView2StandaloneURL = "https://go.microsoft.com/fwlink/?linkid=2124701"
