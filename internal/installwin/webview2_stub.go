//go:build !windows

package installwin

func webView2Installed() bool { return false }

func webView2Version() string { return "" }
