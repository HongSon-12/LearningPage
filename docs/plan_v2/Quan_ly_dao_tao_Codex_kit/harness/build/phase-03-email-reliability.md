# Phase 03 - Email reliability

## Goal
Mail không chặn transaction và có retry/idempotency.

## Tasks
- EmailOutbox;
- templates;
- worker/cron;
- retry;
- SMTP thật;
- error observability.

Không thêm queue infrastructure nếu outbox đơn giản đủ.
