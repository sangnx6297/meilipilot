//go:build windows

package installwin

import (
	"golang.org/x/sys/windows/registry"
)

func WriteUninstallKey(displayName, displayVersion, publisher, installDir, uninstallString string) error {
	k, _, err := registry.CreateKey(registry.CURRENT_USER, UninstallKey, registry.SET_VALUE)
	if err != nil {
		return err
	}
	defer k.Close()
	vals := map[string]string{
		"DisplayName":     displayName,
		"DisplayVersion":  displayVersion,
		"Publisher":       publisher,
		"InstallLocation": installDir,
		"UninstallString": uninstallString,
		"DisplayIcon":     installDir + `\MeiliPilot.exe`,
	}
	for n, v := range vals {
		if err := k.SetStringValue(n, v); err != nil {
			return err
		}
	}
	return k.SetDWordValue("NoModify", 1)
}

func DeleteUninstallKey() error {
	return registry.DeleteKey(registry.CURRENT_USER, UninstallKey)
}
