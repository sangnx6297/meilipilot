# Meilisearch API compatibility

**Đã test tay:** Meilisearch `1.55.x` (OpenAPI `docs/ref/openapi.json`).  
**Probe lúc connect:** `GET /version` + `GET /experimental-features`. UI ẩn Chat/Rules khi capability tắt.

| Feature | Điều kiện hiện trên UI | Ghi chú |
|---|---|---|
| Index / documents / search / settings / tasks / keys | 1.x | Core Community |
| Search rules | `pkgVersion` ≥ 1.53 | Ẩn nav + empty state nếu thấp hơn |
| Chat workspaces | experimental `chatCompletions` | 403/`feature_not_enabled` → nav ẩn |
| Network | experimental `network` | Trang Instance vẫn gọi; lỗi hiện ErrorBanner |
| GET /metrics | experimental `metrics` | Dashboard bỏ qua khi tắt |
| Embedders / similar | settings group luôn hiện | PATCH embedders gắn risk **secret** (API key redacted) |

**Không suy đoán** mọi instance giống 1.55. Capability fail (network/401) → caps mặc định: chat/network/metrics off, rules off (version `0.0.0`).

Known issues: chưa disable từng SearchQuery option theo version; chưa matrix Docker 1.48 / 1.53 / 1.55.
