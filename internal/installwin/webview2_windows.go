//go:build windows

package installwin

import "golang.org/x/sys/windows/registry"

const webView2Client = `{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}`

func webView2Installed() bool {
	return webView2Version() != ""
}

func webView2Version() string {
	if v := webView2PV(registry.LOCAL_MACHINE, `SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\`+webView2Client); v != "" {
		return v
	}
	return webView2PV(registry.CURRENT_USER, `Software\Microsoft\EdgeUpdate\Clients\`+webView2Client)
}

func webView2PV(root registry.Key, path string) string {
	k, err := registry.OpenKey(root, path, registry.QUERY_VALUE)
	if err != nil {
		return ""
	}
	defer k.Close()
	pv, _, err := k.GetStringValue("pv")
	if err != nil {
		return ""
	}
	return NormalizeWebView2PV(pv)
}
