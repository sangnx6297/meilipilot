package installwin

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func repoRoot(t *testing.T) string {
	t.Helper()
	dir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 6; i++ {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	t.Fatal("go.mod not found")
	return ""
}

func TestClientSetupDoesNotInstallGoOrNode(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join(repoRoot(t), "cmd", "setup", "main.go"))
	if err != nil {
		t.Fatal(err)
	}
	s := string(raw)
	for _, bad := range []string{"installGo", "installNode", "GoLang.Go", "OpenJS.NodeJS", "WebView2BootstrapURL"} {
		if strings.Contains(s, bad) {
			t.Fatalf("client setup khong cai toolchain / khong tai bootstrapper: %s", bad)
		}
	}
	if !strings.Contains(s, "PlanDep") || !strings.Contains(s, "ensureWebView2") {
		t.Fatal("setup phai pin WebView2 tu payload")
	}
}

func TestBundleIsGuiNotConsole(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join(repoRoot(t), "installer", "Bundle.wxs"))
	if err != nil {
		t.Fatal(err)
	}
	s := string(raw)
	for _, want := range []string{
		"WixStandardBootstrapperApplication",
		`Permanent="yes"`,
		"WebView2",
		"DetectCondition",
		`Manufacturer="MeiliPilot"`,
		"MeiliPilot.msi",
	} {
		if !strings.Contains(s, want) {
			t.Errorf("Bundle.wxs missing %s", want)
		}
	}
	for _, bad := range []string{"GoLang", "Node.js", "cmd/setup"} {
		if strings.Contains(s, bad) {
			t.Errorf("bundle must not install %s", bad)
		}
	}
}

func TestMsiWxsMatchesWailsProduct(t *testing.T) {
	root := repoRoot(t)
	raw, err := os.ReadFile(filepath.Join(root, "wails.json"))
	if err != nil {
		t.Fatal(err)
	}
	var cfg struct {
		Info struct {
			ProductVersion string `json:"productVersion"`
			CompanyName    string `json:"companyName"`
			ProductName    string `json:"productName"`
		} `json:"info"`
	}
	if err := json.Unmarshal(raw, &cfg); err != nil {
		t.Fatal(err)
	}
	wxs, err := os.ReadFile(filepath.Join(root, "installer", "MeiliPilot.wxs"))
	if err != nil {
		t.Fatal(err)
	}
	s := string(wxs)
	for _, want := range []string{
		`Name="` + cfg.Info.ProductName + `"`,
		`Manufacturer="` + cfg.Info.CompanyName + `"`,
		`Version="` + cfg.Info.ProductVersion + `"`,
		`UpgradeCode="A7C3E91B-4D2F-4A6E-9C18-B5E04F7A2D11"`,
		`Id="WixUI_InstallDir"`,
		`Id="DesktopShortcut"`,
		`Id="StartMenuShortcut"`,
	} {
		if !strings.Contains(s, want) {
			t.Errorf("MeiliPilot.wxs missing %s", want)
		}
	}
}
