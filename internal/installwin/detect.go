package installwin

import (
	"os"
	"os/exec"
	"strings"
)

type ToolStatus struct {
	Name    string
	Present bool
	Version string
	Path    string
}

type Detector struct {
	LookPath        func(string) (string, error)
	Run             func(name string, args ...string) (string, error)
	WebView2OK      func() bool
	WebView2Version func() string
}

func DefaultDetector() Detector {
	return Detector{
		LookPath:        exec.LookPath,
		Run:             runCombined,
		WebView2OK:      webView2Installed,
		WebView2Version: webView2Version,
	}
}

func runCombined(name string, args ...string) (string, error) {
	out, err := exec.Command(name, args...).CombinedOutput()
	return string(out), err
}

func (d Detector) Go() ToolStatus {
	return d.tool("Go", "go", "version")
}

func (d Detector) Node() ToolStatus {
	return d.tool("Node.js", "node", "-v")
}

func (d Detector) WebView2() ToolStatus {
	st := ToolStatus{Name: "WebView2"}
	if d.WebView2Version != nil {
		st.Version = NormalizeWebView2PV(d.WebView2Version())
		st.Present = st.Version != ""
		return st
	}
	if d.WebView2OK != nil {
		st.Present = d.WebView2OK()
	}
	return st
}

func (d Detector) tool(label, bin string, args ...string) ToolStatus {
	st := ToolStatus{Name: label}
	look := d.LookPath
	if look == nil {
		look = exec.LookPath
	}
	p, err := look(bin)
	if err != nil {
		return st
	}
	st.Present = true
	st.Path = p
	run := d.Run
	if run == nil {
		run = runCombined
	}
	out, err := run(p, args...)
	if err == nil {
		st.Version = strings.TrimSpace(out)
	}
	return st
}

func ParseGoVersion(out string) string {
	out = strings.TrimSpace(out)
	// go version go1.25.0 windows/amd64
	fields := strings.Fields(out)
	for _, f := range fields {
		if strings.HasPrefix(f, "go1.") {
			return f
		}
	}
	return out
}

func ParseNodeVersion(out string) string {
	return strings.TrimSpace(out)
}

func ProgramsDir() (string, error) {
	local := os.Getenv("LOCALAPPDATA")
	if local == "" {
		return "", os.ErrNotExist
	}
	return joinPrograms(local), nil
}

func joinPrograms(localAppData string) string {
	return localAppData + string(os.PathSeparator) + "Programs" + string(os.PathSeparator) + "MeiliPilot"
}
