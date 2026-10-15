.PHONY: test frontend test-frontend dev build installer msi

# WSL make co /usr/bin/make nhung khong co wails/go. Dung Windows CLI qua powershell.exe / cmd.exe.
IS_WSL := $(shell grep -qi microsoft /proc/version 2>/dev/null && echo 1 || echo 0)
POWERSHELL := $(shell command -v powershell.exe 2>/dev/null || command -v powershell 2>/dev/null)

ifeq ($(IS_WSL),1)
  PROJ_WIN := $(shell wslpath -w "$(CURDIR)")
else ifeq ($(OS),Windows_NT)
  PROJ_WIN := $(shell cygpath -w "$(CURDIR)" 2>/dev/null || echo "$(CURDIR)")
else
  PROJ_WIN := $(CURDIR)
endif

ifneq ($(POWERSHELL),)
  WAILS_RUN = "$(POWERSHELL)" -NoProfile -ExecutionPolicy Bypass -File "$(PROJ_WIN)/scripts/run-wails.ps1"
  PS = "$(POWERSHELL)" -NoProfile -ExecutionPolicy Bypass -File
  GO_RUN = bash "$(CURDIR)/scripts/win-go.sh" "$(PROJ_WIN)"
else
  WAILS_RUN = wails
  PS = powershell -NoProfile -ExecutionPolicy Bypass -File
  GO_RUN = go
endif

test:
	$(GO_RUN) test ./...
frontend:
	cd frontend && npm install && npm run build
test-frontend:
	cd frontend && npm test
dev:
	$(WAILS_RUN) dev
build:
	rm -f build/windows/icon.ico
	$(WAILS_RUN) build
	sleep 2
	./build/windows/rcedit-x64.exe build/bin/MeiliPilot.exe \
		--set-version-string ProductName "MeiliPilot" \
		--set-version-string FileDescription "MeiliPilot - desktop client for Meilisearch" \
		--set-version-string LegalCopyright "Copyright 2026 sangnx6297@gmail.com" \
		--set-version-string CompanyName "MeiliPilot" \
		--set-version-string Comments "Desktop client for Meilisearch" \
		--set-file-version "0.1.0.0" \
		--set-product-version "0.1.0.0"

# Portable: build/bin/MeiliPilot.exe
# Installed app: %LocalAppData%\Programs\MeiliPilot
# Settings: %AppData%\MeiliPilot
# GUI Setup.exe (WiX Burn wizard) — khong phai console cmd/setup.
# Nhét WebView2 pin + MSI. May >= pin: skip runtime. Thieu/cu hon: cai khi bam Install.
installer: build
	$(PS) "$(PROJ_WIN)/installer/vendor-deps.ps1"
	$(GO_RUN) test ./internal/session ./internal/installwin
	$(PS) "$(PROJ_WIN)/installer/build-msi.ps1"
	$(PS) "$(PROJ_WIN)/installer/build-bundle.ps1"

# MSI (Advanced Installer Simple equivalent): wizard, Program Files, Start Menu, Desktop, ARP
# Requires WiX CLI: winget install WiXToolset.WiXCLI
msi: build
	$(GO_RUN) test ./internal/installwin
	$(PS) "$(PROJ_WIN)/installer/build-msi.ps1"
