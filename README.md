# MeiliPilot

Ứng dụng desktop Windows (Wails + WebView2) để quản trị và search trên instance Meilisearch 1.55.

- Version: **0.1.0**
- Author: **sangnx6297@gmail.com**
- Copyright © 2026 sangnx6297@gmail.com

## Chạy

1. Máy khách: Windows 10 19041+. WebView2 Runtime — gói Setup pin bản Standalone lúc đóng gói; không cần Go/Node trên máy khách.
2. Chạy Meilisearch 1.55 với master key ≥ 16 bytes, mặc định `http://127.0.0.1:7700`:

   ```bash
   docker compose up -d
   ```

3. Cài toolchain: Go 1.23+, Node.js LTS, Wails CLI:

   ```bash
   go install github.com/wailsapp/wails/v2/cmd/wails@latest
   ```

4. Dev (mở cửa sổ desktop):

   ```bash
   wails dev
   ```

5. Build portable:

   ```bash
   wails build
   ```

   File: `build/bin/MeiliPilot.exe`. Double-click để chạy — không mở trình duyệt.

6. Gói cài khách (wizard GUI, WebView2 pin nhét trong Setup.exe):

   ```bash
   make installer
   ```

   Phát hành `build/bin/MeiliPilot-Setup.exe` — double-click, không chạy console.

Trong app: nhập host + API key. Dùng master key khi vào màn Keys; Default Admin key cho thao tác ngày thường.

Hướng dẫn dùng từng màn (kết nối, index, settings, tasks…): **[docs/HUONG-DAN.md](docs/HUONG-DAN.md)**.

## Test

```bash
go test ./...
cd frontend && npm test
```
