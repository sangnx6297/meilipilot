export const APP_NAME = 'MeiliPilot';
export const APP_VERSION = '0.1.0';
export const APP_AUTHOR_EMAIL = 'sangnx6297@gmail.com';
export const APP_COPYRIGHT = `© 2026 ${APP_AUTHOR_EMAIL}`;
export const APP_TAGLINE = 'Desktop client cho Meilisearch';
export const APP_PITCH = 'Hiểu search nhanh hơn.\nĐổi cấu hình an toàn hơn.';
export const APP_INTRO =
  'Kết nối thẳng tới instance Meilisearch trên máy bạn. API key mã hóa DPAPI, không rời khỏi Windows.';

export const APP_FEATURES = [
  {
    id: 'search',
    title: 'Debug kết quả search',
    body: 'Chạy query trên dữ liệu thật, đọc hits, ranking score và rule details — không cần curl.'
  },
  {
    id: 'settings',
    title: 'Cấu hình index an toàn',
    body: 'Xem ranking, filterable, sortable. So sánh DEV với PROD trước khi PATCH.'
  },
  {
    id: 'ops',
    title: 'Tasks, keys, instance',
    body: 'Theo dõi indexing, quản lý API key và health một chỗ, đúng session đang mở.'
  }
] as const;

export const APP_TRUST = [
  { label: 'Local-first', hint: 'Key không gửi đám mây' },
  { label: 'DPAPI', hint: 'Mã hóa trên máy Windows' },
  { label: 'Windows', hint: 'Desktop app, không SaaS' }
] as const;
