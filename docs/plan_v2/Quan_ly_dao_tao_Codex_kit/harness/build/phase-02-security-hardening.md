# Phase 02 - Security hardening

## Goal
Loại release blocker PII/upload/search.

## Tasks
- private storage;
- file authz;
- extension/MIME/magic bytes/size;
- migrate file refs;
- search chống enumeration;
- rate limit;
- audit download/export;
- security headers.

## Package
Có thể đề xuất `file-type` hoặc tương đương nếu cần; server-only, kiểm tra runtime.

## Done
- PII không public URL;
- IDOR bị chặn;
- search khó enumerate;
- logs sạch PII/token;
- migration rollback rõ.
