//go:build !windows

package installwin

func WriteUninstallKey(displayName, displayVersion, publisher, installDir, uninstallString string) error {
	return nil
}

func DeleteUninstallKey() error { return nil }
