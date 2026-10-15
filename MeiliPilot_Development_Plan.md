# MeiliPilot — Product & Development Plan

> **Loại sản phẩm:** Desktop client thương mại cho Meilisearch, định vị tương tự DBeaver/DataGrip.  
> **Trạng thái:** Draft / Planning — **đã đối chiếu với meilisearchui (Wails) 15/10/2026**  
> **Ngày cập nhật:** 15/10/2026  
> **Nền tảng MVP:** Windows x64  
> **Chiến lược:** Free core → Pro dành cho developer/DevOps/search engineer.  
> **Stack thực tế (ADR-001 lệch đề xuất):** Wails v2 + Svelte 5 + Go. Không rewrite Tauri/React.  
> **Việc để sau:** `docs/meilipilot-backlog.md`

---

## 1. Executive Summary

**MeiliPilot** là ứng dụng desktop giúp developer và DevOps quản lý, tra cứu, debug và triển khai cấu hình Meilisearch trên nhiều môi trường mà không cần thao tác thủ công với REST API.

**Định vị khác biệt:** Không chỉ là Admin UI (CRUD index/document), MeiliPilot tập trung vào:

1. **Developer Experience:** Explorer, editor nhiều tab, query history, keyboard shortcuts.
2. **Search Engineering:** Debug kết quả tìm kiếm, ranking và hiệu năng ở mức dữ liệu API thực tế cho phép.
3. **Safe Operations:** So sánh cấu hình DEV/STAGING/PROD, preview migration, cảnh báo rủi ro, theo dõi task.
4. **Local-first:** Kết nối trực tiếp từ máy người dùng, không cần gửi API key hoặc dữ liệu khách hàng qua SaaS của MeiliPilot.

### 1.1 Mục tiêu

- Ra mắt một **MVP hữu dụng miễn phí** để thu hút người dùng thực tế.
- Kiểm chứng nhu cầu trả phí đối với **Index Settings Diff / Migration** và **Search Debugger**.
- Giữ kiến trúc đủ tách biệt để sau này tái sử dụng engine trong CLI hoặc VS Code Extension.
- Duy trì tương thích với các phiên bản Meilisearch được công bố hỗ trợ, có khả năng phát hiện/từ chối thao tác không tương thích.

### 1.2 Không làm trong MVP

- Không thay thế Meilisearch Cloud hay xây dịch vụ search hosting.
- Không đồng bộ realtime dữ liệu giữa các cluster.
- Không tự động copy toàn bộ documents DEV → PROD.
- Không cung cấp visual query builder phức tạp, collaboration realtime hoặc multi-tenant SaaS.
- Không phát triển song song cả ba hệ điều hành trong vòng MVP.

---

## 2. Đối tượng & Use Cases

| Persona | Vấn đề | Giá trị cung cấp |
|---|---|---|
| Backend Developer | Gọi API thủ công để kiểm tra index/documents | Explorer, editor, search console |
| Search Engineer | Khó biết tại sao kết quả search khác kỳ vọng | Debugger, so sánh truy vấn, inspection |
| DevOps / SRE | Khó kiểm soát cấu hình giữa DEV và PROD | Settings diff, migration preview, task monitoring |
| Tech Lead | Cần cách thao tác production an toàn | Protected environment, confirmation, audit cục bộ |

**User story chủ chốt:**

- **US-01:** Là developer, tôi thêm nhiều connection và duyệt indexes/documents bằng một UI.
- **US-02:** Là developer, tôi thực hiện truy vấn tìm kiếm, chỉnh filter/sort, xem raw request/response.
- **US-03:** Là DevOps, tôi so sánh settings của cùng index giữa hai môi trường.
- **US-04:** Là DevOps, tôi xem trước thay đổi và rủi ro trước khi apply lên production.
- **US-05:** Là search engineer, tôi lưu và đối chiếu kết quả các truy vấn để debug.
- **US-06:** Là người dùng doanh nghiệp, tôi kết nối qua SSH tunnel mà API key không bị lưu dưới dạng plaintext.

---

## 3. Phiên bản sản phẩm & phạm vi tính năng

### 3.1 Community (Free)

- [x] Tạo/sửa/xóa connection; kiểm tra kết nối.
- [x] Nhiều Meilisearch instances; gắn nhãn DEV / STAGING / PROD. *(1 session active; chưa explorer song song 2 host)*
- [x] Index explorer: danh sách, chi tiết, tạo/xóa với xác nhận.
- [x] Document browser: paging, xem bảng và JSON, CRUD cơ bản.
- [x] Search console: query, filter, sort, facets, pagination, raw JSON.
- [x] Settings viewer/editor cơ bản, có validation.
- [x] Tasks monitor: status, filter, refresh, chi tiết lỗi.
- [x] Local workspace & lưu UI preferences. *(last hash, hits mode, search history, advanced; không multi-tab DBeaver)*
- [x] Secret storage an toàn trên thiết bị. *(DPAPI trong profiles.json, không phải Credential Manager tách riêng)*
- [x] Export/import dữ liệu cơ bản (có giới hạn theo kỹ thuật, **không** khóa dữ liệu của người dùng). *(dump / snapshot / export remote)*

### 3.2 Professional (Paid)

- [x] **Index Settings Diff** giữa hai connections/indexes. *(semantic per SETTING_GROUPS, order-sensitive, tick group, export MD/JSON, migrate source→target)*
- [x] **Migration Planner** (thin): fingerprint drift, risk reindex/secret, preview PATCH. Snapshot restore tay / planner đầy đủ = enhance.
- [x] Search debugger: lưu snapshot local, chọn 2 run, so latency / order / rankingScore từng doc.
- [ ] SSH tunnel và cấu hình kết nối nâng cao.
- [ ] Query history/search presets nâng cao. *(history local + so 2 run; presets = sau)*
- [ ] Multi-environment workspace templates.
- [ ] Backup/export cấu hình và migration plan có thể lưu vào version control.

### 3.3 Team / Enterprise (để sau khi có traction)

- [ ] Offline activation/seat management.
- [ ] Chia sẻ migration plan thông qua Git (không cần cloud riêng).
- [ ] Policy templates & approval workflow (chỉ nếu khách hàng thực sự cần).

**Nguyên tắc:** Free phải đủ dùng hàng ngày; Pro bán **tiết kiệm thời gian, giảm rủi ro và workflow chuyên sâu**, không bán quyền truy cập dữ liệu của chính khách hàng.

---

## 4. UX / Information Architecture

```text
┌────────────────────────────────────────────────────────────────────┐
│ MeiliPilot      Workspace ▼      Connection: DEV ▼     [Search]   │
├────────────────────┬───────────────────────────────────────────────┤
│ CONNECTIONS        │ Tabs: products | Search | Settings Diff      │
│                    ├───────────────────────────────────────────────┤
│ ▼ DEV              │ Toolbar: Query | Filter | Sort | Run        │
│   ▼ products       ├───────────────────────────────────────────────┤
│     Documents      │ Result Grid / JSON / Response Metadata        │
│     Settings       │                                               │
│     Tasks          │                                               │
│ ▼ STAGING          ├───────────────────────────────────────────────┤
│ ▼ PROD 🔒          │ Details / Diff / Task Output                  │
├────────────────────┴───────────────────────────────────────────────┤
│ Connected • Engine version • Latency • Active tasks              │
└────────────────────────────────────────────────────────────────────┘
```

### 4.1 Nguyên tắc UX

- Tabs đa nhiệm; có trạng thái dirty khi dữ liệu đang sửa chưa lưu.
- Mọi lệnh write/delete có mục tiêu connection + index hiển thị rõ.
- **PROD protection:** read-only mặc định hoặc yêu cầu người dùng bật chế độ ghi; thao tác phá hủy bắt xác nhận lại.
- Raw JSON luôn xem được để developer có thể kiểm chứng hành vi API.
- Search/filter có loading, error, cancellation và hiển thị thời gian phản hồi.
- Keyboard-first: `Ctrl+K` command palette; `Ctrl+Enter` chạy query.

---

## 5. Công nghệ & kiến trúc

### 5.1 Stack đề xuất

| Layer | Công nghệ | Ghi chú |
|---|---|---|
| Desktop shell | Tauri 2 | Native packaging, Rust backend |
| Frontend | React + TypeScript + Vite | UI modular |
| UI kit | Tailwind CSS + component library | Có dark/light theme |
| Data fetching | TanStack Query | Cache, retry phù hợp từng API |
| State/UI | Zustand hoặc tương đương | Chỉ UI state; không chứa secrets dài hạn |
| Editor | Monaco / CodeMirror | JSON, filter expression editor |
| Backend desktop | Rust | HTTP, SSH, secrets, file I/O |
| Storage | SQLite | Connection metadata, workspace, history |
| Secret store | OS credential store / Stronghold | API keys; tránh plaintext và logs |
| Tests | Vitest, Playwright, Rust tests | Unit + component + integration |
| CI/CD | GitHub Actions hoặc GitLab CI | Build, test, sign, release |

### 5.2 Sơ đồ hệ thống

```text
┌──────────────────────────────────────────────────────────────┐
│                       MeiliPilot Desktop                     │
│                                                              │
│  React UI                                                    │
│   ├─ Explorer / Tabs / Search Console                        │
│   ├─ Settings Diff / Migration Preview                       │
│   └─ Query History / Settings                                │
│                  │ typed Tauri commands                      │
│                  ▼                                           │
│  Rust Application Layer                                      │
│   ├─ Connection & Capability Manager                         │
│   ├─ Meilisearch HTTP Adapter                                │
│   ├─ SSH Tunnel Manager (Pro)                                │
│   ├─ Credential Vault                                        │
│   ├─ Migration Execution / Task Polling                      │
│   └─ Local Persistence                                       │
└────────────────────┬─────────────────────────────────────────┘
                     │ HTTPS / SSH tunnel
            ┌────────┼──────────┐
            ▼        ▼          ▼
          DEV     STAGING      PROD
```

### 5.3 Repository layout

```text
meilipilot/
├── apps/
│   └── desktop/
│       ├── src/                     # React + TS
│       └── src-tauri/               # Rust/Tauri
├── packages/
│   ├── core/                        # Entities, contracts, use cases
│   ├── meilisearch-client/          # API types, capability detection
│   ├── index-diff/                  # Pure diff engine
│   ├── migration-planner/           # Plan generator / validators
│   └── ui/                          # Shared components
├── services/
│   └── licensing-api/               # Chỉ triển khai khi xác thực nhu cầu
├── docs/
│   ├── architecture/
│   ├── adr/
│   ├── api-compatibility.md
│   └── release-checklist.md
└── .github/workflows/                # hoặc .gitlab-ci.yml
```

**Ranh giới quan trọng:** Tách **diff/planning** thành pure modules có test dễ dàng. Lớp Tauri giữ quyền network/secret. Không để UI tự do lấy API key rồi gọi arbitrary endpoint.

### 5.4 Domain model tối thiểu

```ts
type Environment = 'dev' | 'staging' | 'production' | 'custom';

interface ConnectionProfile {
  id: string;
  name: string;
  endpoint: string;
  environment: Environment;
  credentialRef: string;   // tham chiếu secret; không phải API key
  sshProfileId?: string;
  readOnly: boolean;
}

interface IndexIdentity {
  connectionId: string;
  indexUid: string;
}

interface MigrationPlan {
  id: string;
  source: IndexIdentity;
  target: IndexIdentity;
  baselineFingerprint: string; // chống apply dựa trên settings đã cũ
  operations: MigrationOperation[];
  warnings: string[];
}
```

### 5.5 Capability / Version Compatibility

- Khi kết nối, nhận diện version/build và quyền truy cập API nếu có thể.
- Feature flags theo capability thực tế; không suy đoán tất cả API đều hoạt động giống nhau.
- Các endpoint/search options khác phiên bản phải có adapter và test fixtures.
- Có `docs/api-compatibility.md` liệt kê version đã test, chức năng được hỗ trợ và known issues.
- Permission/API errors phải hiện rõ, tránh diễn giải nhầm thành lỗi mạng hoặc thiếu index.

---

## 6. Thiết kế các module trọng tâm

### 6.1 Connection Manager

- CRUD profile, test connection, health/version probe.
- Timeout, SSL verification bật mặc định; cho cấu hình chứng chỉ custom nếu có use case rõ ràng.
- API key chỉ đọc từ vault khi cần request, xóa khỏi log/error/telemetry.
- Phân biệt rõ `network error`, `authentication error`, `permission denied`, `incompatible API`.
- Cấu hình `readOnly` độc lập với quyền của API key; hạn chế UI không thay thế phân quyền phía server.

### 6.2 Document & Search Editor

- Grid với cursor/pagination phù hợp API; tránh tải toàn bộ index.
- JSON tree + raw editor; validation trước khi gửi.
- Search builder hỗ trợ `q`, filter, sort, facets và options theo capability.
- Xem request payload, response JSON, task UID (nếu operation async).
- Có giới hạn dữ liệu/size, virtualized list và cancel request.

### 6.3 Index Settings Diff — tính năng Pro đầu tiên

**Input:** `source.index.settings` và `target.index.settings`.

**Pipeline:**

```text
Fetch → Validate permissions → Normalize → Canonicalize
     → Semantic Diff → UI Review → Export Plan
```

**Yêu cầu:**

- So sánh có ý nghĩa theo từng setting; không chỉ JSON text diff.
- Phân biệt rõ **unset/default** với giá trị explicit; không làm mất thông tin do normalize.
- Với thuộc tính mà thứ tự có ý nghĩa (ví dụ ranking rules), giữ nguyên semantics khi diff.
- Cho phép chọn từng nhóm setting để migrate.
- Export diff dạng Markdown/JSON để review qua Git.

### 6.4 Migration Planner / Executor

```text
1. Fetch source + target settings
2. Snapshot target & compute fingerprint
3. Diff + select operations
4. Capability / permission check
5. Preview exact request payload
6. Risk labels + explicit confirmation
7. Re-read target; detect drift
8. Execute operations
9. Poll async tasks until terminal state
10. Report outcome + rollback guidance
```

**An toàn vận hành:**

- Chỉ migrate **settings** ở phiên bản đầu; không mặc định copy documents.
- Không quảng bá transaction/rollback tự động nếu Meilisearch không hỗ trợ atomicity tương ứng.
- Ghi nhận snapshot trước khi apply để hỗ trợ **manual restore**, không đảm bảo rollback không mất dữ liệu.
- Xác định thao tác có nguy cơ reindex, tác động thời gian và hiệu năng; hiển thị cảnh báo.
- Apply vào production yêu cầu bật quyền ghi và xác nhận đích.
- Nếu operation trả về task bất đồng bộ, **không** hiển thị success ngay khi HTTP 202; theo dõi task status.

### 6.5 Search Debugger

- Chạy search với các cấu hình query khác nhau và lưu snapshot cục bộ.
- So sánh latency, estimated/returned hits, order của top results, payload size.
- Hiển thị score/ranking metadata **chỉ khi response API có cung cấp**.
- Làm rõ giới hạn: không hứa tái dựng toàn bộ thuật toán nội bộ của engine nếu API không expose.

---

## 7. Security Baseline

- [x] Không lưu API key dạng plaintext trong profiles.json (DPAPI). SSH key chưa có.
- [x] Secrets trong vault; ListProfiles chỉ `hasKey`.
- [ ] Không disable TLS validation mặc định; nếu có tùy chọn insecure phải cảnh báo rõ.
- [x] Wails proxy least privilege + readOnly chặn write.
- [x] Destructive actions: ConfirmDialog hiện env · host · uid; PROD banner.
- [ ] Logs mask endpoint credentials, header Authorization và dữ liệu riêng tư.
- [x] Không bật telemetry chứa query/document payload mặc định.
- [ ] Package/release được code signing khi phát hành thương mại.
- [ ] Kiểm tra dependency vulnerabilities và review các thay đổi trong updater.

---

## 8. Licensing & Commercial Model

### 8.1 Giá **giả định để kiểm chứng**, không phải giá thị trường đã xác nhận

| Tier | Giá thử nghiệm | Quyền lợi |
|---|---:|---|
| Community | $0 | Dùng lâu dài các tính năng cơ bản |
| Pro Annual | $39/năm | Tính năng Pro + updates |
| Pro Perpetual | $99 một lần | Dùng vĩnh viễn phiên bản được cấp phép; updates 12 tháng |
| Team | $149/năm / 5 seats | Quản lý seats, hỗ trợ ưu tiên (sẽ triển khai sau) |

### 8.2 Cơ chế activation đề xuất

```text
Payment provider → Licensing API → Signed license payload
                                     │
Desktop client ←── Activate / Refresh ┘
       │
       └── Verify Ed25519 signature locally (public key embedded)
```

- License server giữ private signing key, desktop giữ public key.
- Hỗ trợ offline grace period và đường đi cho khách hàng doanh nghiệp không có internet.
- Chống gian lận ở mức hợp lý; client-side license **không thể chống patch binary tuyệt đối**.
- Chưa cần xây billing server trước khi có bằng chứng người dùng sẵn sàng trả tiền.

### 8.3 License / Trademarks — checklist pháp lý

- [ ] Xác minh điều khoản Meilisearch Community/Enterprise hiện hành trước khi phát hành.
- [ ] Chỉ sử dụng API công khai; không phân phối Enterprise Edition nếu không có quyền thích hợp.
- [ ] Tuân thủ license mọi thư viện/dependency (đặc biệt nếu fork Apache-2.0).
- [ ] Tránh sử dụng nhãn hiệu/logo theo cách khiến người dùng tưởng đây là sản phẩm chính thức.
- [ ] Nếu tích hợp Meilisearch Cloud, kiểm tra Terms of Service áp dụng cho cách sử dụng cụ thể.
- [ ] Viết EULA, Privacy Policy, điều khoản update/refund và mô tả xử lý secrets.

> Mục này là checklist rủi ro, không phải ý kiến pháp lý chính thức.

---

## 9. Roadmap 10 tuần — giả định 1 developer full-time

> Chỉ là baseline để estimate. Không nên cam kết ngày release trước khi xử lý các rủi ro về API compatibility, packaging và security.

| Sprint | Trọng tâm | Deliverables / Exit criteria |
|---|---|---|
| **W1–W2** | Foundation + Connections | Tauri shell, local DB, vault, create/test connection, health/version, explorer skeleton |
| **W3–W4** | Daily-use MVP | Index/document browser, CRUD, search console, settings editor, tasks monitor |
| **W5–W6** | Differentiator | Semantic settings diff, migration preview, production safeguards, task status tracking |
| **W7–W8** | Hardening + Pro | SSH tunnel, search run comparison, permission/errors, licensing prototype |
| **W9–W10** | Release candidate | E2E tests, Windows packaging/signing, docs, beta onboarding, bug fixes |

### Milestones

**M0 — Skeleton ready (cuối W2)**
- [ ] Có thể cài ứng dụng, thêm profile, connect và xem danh sách indexes.
- [ ] Không có secret nào xuất hiện trong SQLite/log.

**M1 — Free MVP (cuối W4)**
- [ ] Thực hiện được quy trình kết nối → search → xem/chỉnh document → kiểm tra task.
- [ ] Thao tác write hiển thị đúng kết quả bất đồng bộ.

**M2 — Pro Value Prototype (cuối W6)**
- [ ] Diff settings giữa 2 môi trường bằng test fixtures thực tế.
- [ ] Preview migration, phát hiện drift, xác nhận PROD, theo dõi task.

**M3 — Beta-ready (cuối W10)**
- [ ] Không còn blocker về credential security và destructive operations.
- [ ] Test các Meilisearch versions nằm trong compatibility matrix.
- [ ] Có installer Windows, changelog, issue tracker và hướng dẫn gửi log đã redact.

---

## 10. Backlog ưu tiên

Quy ước: `P0 = bắt buộc MVP`, `P1 = cần cho beta/Pro`, `P2 = sau beta`.

| ID | Priority | Epic | Task | Acceptance criteria |
|---|---|---|---|---|
| MP-001 | P0 | Foundation | Bootstrap Tauri + React | Build dev/release thành công trên Windows |
| MP-002 | P0 | Security | Credential vault | Secrets không lưu plaintext hoặc emit ra UI/log |
| MP-003 | P0 | Connection | CRUD/test/profile | Kết nối, auth failures và timeouts phân biệt rõ |
| MP-004 | P0 | Compatibility | Engine capability probe | Done: version + experimental; ẩn Chat/Rules |
| MP-005 | P0 | Explorer | Index list/details | Pagination/loading/error đúng |
| MP-006 | P0 | Documents | Document browser/editor | CRUD và xử lý async task đúng |
| MP-007 | P0 | Search | Query console | Render request/response, filter/sort được |
| MP-008 | P0 | Settings | Settings viewer/editor | Validate & confirmation trước write |
| MP-009 | P0 | Tasks | Task monitor | Poll, terminal state, error details |
| MP-010 | P1 | Pro | Semantic settings diff | Done: order-sensitive, tick group, export MD/JSON, migrate PATCH |
| MP-011 | P1 | Pro | Migration planner | Done thin: preview PATCH, fingerprint drift, risk reindex/secret |
| MP-012 | P1 | Pro | Migration executor | Done thin: recheck fingerprint, poll task; snapshot restore = sau |
| MP-013 | P1 | Connection | SSH tunnel | Tunnel lifecycle + cleanup + errors |
| MP-014 | P1 | Debug | Search comparison | Done: chọn 2 snapshot, latency + rankingScore từng doc |
| MP-015 | P1 | Release | Windows installer + updater | WiX Burn GUI Setup.exe (WixStdBA) + MSI + WebView2 pin; signing + auto-update = sau |
| MP-016 | P1 | QA | E2E smoke test | Cover connection/search/diff/apply confirmation |
| MP-017 | P2 | Commercial | License activation | Signed license verify offline |
| MP-018 | P2 | Expansion | macOS/Linux | Chạy được test matrix riêng từng OS |
| MP-019 | P2 | Growth | CLI / VS Code Extension | Reuse diff/planner core |

---

## 11. Quality & Testing Strategy

### Unit Tests
- Canonicalize/diff settings: explicit vs default, order-sensitive arrays, unknown fields, null/empty.
- Migration planner: no-op, additions/removals, plan selection, stale fingerprint, invalid payload.
- Query serializers/parsers: escaping, filters, malformed input.

### Integration Tests
- Chạy Meilisearch trong Docker cho phiên bản được hỗ trợ; test bằng fixture index.
- Test network timeout, 401/403, invalid API key, missing index, permission mismatch.
- Test async tasks: success, failed, cancelled khi API hỗ trợ.
- Test credential lifecycle và SSH tunnel cleanup.

### E2E / Manual
- Kết nối DEV và PROD, xác minh production write protection.
- So sánh settings → preview → apply → quan sát task hoàn thành.
- Kiểm tra crash/restart, lưu tab/workspace, log redaction.
- Build installer, update version, uninstall/reinstall và mất kết nối mạng.

### Performance Budgets ban đầu (cần đo và điều chỉnh)
- Không freeze UI khi render hàng nghìn rows: dùng virtualization.
- Pagination/streaming thay vì fetch toàn bộ documents.
- Cache có TTL; không để stale cache dẫn đến migration nguy hiểm.
- Theo dõi startup time, memory và request cancellation trong beta.

---

## 12. Go-to-market & Validation

### 12.1 Trước khi đầu tư toàn bộ licensing

- [ ] Phỏng vấn 10–15 developer/DevOps đang vận hành Meilisearch.
- [ ] Hỏi về pain points hiện tại và giải pháp thay thế họ đang dùng.
- [ ] Cho dùng Free MVP và demo tính năng settings diff.
- [ ] Đề nghị tham gia paid beta/preorder để đo **willingness to pay** (không chỉ đo lượt like/star).
- [ ] Ghi nhận các lý do không mua; điều chỉnh Pro feature set và mức giá.

### 12.2 Chỉ số theo dõi

| Metric | Ý nghĩa |
|---|---|
| Activation | % người cài app tạo thành công connection đầu tiên |
| Weekly Active Users | Có bao nhiêu người thực sự sử dụng mỗi tuần |
| Repeat Usage | Người dùng quay lại trong 2–4 tuần |
| Diff Adoption | % người dùng thử settings diff |
| Paid Intent | Người dùng đồng ý trả tiền hoặc đặt mua beta |
| Critical Incidents | Số lỗi gây mất dữ liệu, lộ secret, apply sai môi trường |

### 12.3 Release channels

- Website + changelog + documentation.
- GitHub repository cho docs/issues (quyết định mở source core hay không là một ADR riêng).
- Community channels liên quan đến Meilisearch, developer tools và self-hosting.
- Installer Windows được ký số; checksum và release notes.

---

## 13. Risks & Mitigations

| Risk | Mức độ | Mitigation |
|---|---|---|
| Người dùng chỉ cần UI miễn phí | Cao | Xác thực paid intent trước khi xây full Pro |
| Thay đổi Meilisearch API | Cao | Capability detection + compatibility tests |
| Apply settings sai production | Rất cao | Environment protection, preview, fingerprint check, confirmation |
| Lộ API key | Rất cao | Secure vault, no frontend secret persistence, logs redaction |
| Reindex chậm, task lỗi | Trung bình–cao | Risk warnings, async monitor, manual recovery playbook |
| Tauri/OS-specific issues | Trung bình | Windows-first, CI, beta feedback |
| License cracking | Trung bình | Signed offline license; không kỳ vọng chống crack tuyệt đối |
| Mơ hồ license/trademark | Trung bình | Legal review trước thương mại hóa |

---

## 14. Definition of Done

Một task được xem là **Done** khi:

- [ ] Chạy thành công trên Windows release build.
- [ ] Có validation, loading/error state và timeout phù hợp.
- [ ] Không để lộ credentials/data nhạy cảm trong logs.
- [ ] Có unit/integration tests với tính năng chứa business logic hoặc safety-critical.
- [ ] Các thao tác write/delete đều hiển thị rõ target và có safeguards.
- [ ] Tài liệu feature và compatibility được cập nhật.
- [ ] Đã review ảnh hưởng đối với Meilisearch phiên bản cũ/mới trong matrix.

---

## 15. Quyết định cần chốt (ADRs)

| ADR | Câu hỏi | Đề xuất hiện tại |
|---|---|---|
| ADR-001 | GUI framework | **Chốt: Wails v2 + Svelte 5 + Go.** Không rewrite Tauri/React. |
| ADR-002 | Core diff/planner viết ở đâu? | Pure TypeScript (`settings-diff.ts`); Go giữ HTTP/secret. Rust không cần. |
| ADR-003 | Credentials lưu ở đâu? | DPAPI user-scope, ciphertext trong profiles.json; UI không nhận plaintext. Credential Manager tách file = enhance sau. |
| ADR-004 | Hệ điều hành launch | Windows x64 trước |
| ADR-005 | Pro distribution | Một binary, feature gating bằng signed license |
| ADR-006 | Pricing | Test annual vs perpetual; chưa chốt |
| ADR-007 | Open-source strategy | Quyết định sau phỏng vấn khách hàng |
| ADR-008 | Supported Meilisearch versions | Lập matrix từ phiên bản người dùng beta đang dùng |

---

## 16. Next Actions — bắt đầu ngay

1. [x] App desktop Windows chạy được (Wails; không theo layout 5.3 Tauri).
2. [x] ADR-001..004 chốt theo stack thực tế (xem bảng trên).
3. [x] Connection screen + DPAPI (không Tauri/Stronghold).
4. [x] HTTP adapter: timeout 30s + error model. [x] capability detection.
5. [x] docker-compose Meilisearch 1.55. [ ] fixture indexes trong CI.
6. [x] Vertical slice: **Connect → Browse Index → Search → Raw JSON**.
7. [x] Settings Diff + thin migration planner (fingerprint / risk / preview). Snapshot restore = sau.

---

### North Star

> **MeiliPilot không cạnh tranh bằng một giao diện CRUD đẹp hơn.**  
> Sản phẩm thắng nếu giúp developer **hiểu search nhanh hơn** và giúp đội vận hành **thay đổi cấu hình an toàn hơn**.
