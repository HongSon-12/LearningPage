# 14. Nguồn tham khảo và tài liệu đầu vào

## 1. Tài liệu project đã dùng làm nguồn

- `BAO_CAO_TIEN_DO_DU_AN.md`
- `Feature_Cap_Nhat_Quan_Ly_Hoc_Vien_Va_Landing_Page.md`
- `Feature_Form_Va_Upload.md`
- `Feature_Gui_Email_Tu_Dong.md`
- `Feature_Tra_Cuu.md`
- `admin_ui_spec.md`
- `user_ui_spec.md`
- `PHAN_MEM_DANG_XAY_DUNG_VA_UNG_DUNG_KHAC.md`
- `TICH_HOP_NEXTJS_NEXTAUTH_V4.md`
- `THU_HOI_PHIEN_VA_DANG_XUAT.md`

## 2. Nguồn chính thức rà soát ngày 17/10/2026

### Next.js
- Support policy: https://nextjs.org/support-policy
- Documentation: https://nextjs.org/docs
- Server/Client Components: https://nextjs.org/learn/react-foundations/server-and-client-components
- Image optimization: https://nextjs.org/learn/seo/images
- Core Web Vitals/Lighthouse: https://nextjs.org/learn/seo/improve

### shadcn/ui
- Next.js installation: https://ui.shadcn.com/docs/installation/next
- React Hook Form: https://ui.shadcn.com/docs/forms/react-hook-form
- Next.js forms: https://ui.shadcn.com/docs/forms/next
- Data Table: https://ui.shadcn.com/docs/components/base/data-table

### Prisma ORM 7
- PostgreSQL: https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql
- Connection pool: https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections/connection-pool

### Auth.js / NextAuth
- Auth.js getting started: https://authjs.dev/getting-started
- Next.js reference: https://authjs.dev/reference/nextjs
- v5 migration: https://authjs.dev/getting-started/migrating-to-v5
- OAuth/OIDC providers: https://authjs.dev/getting-started/authentication/oauth
- NextAuth v4 docs: https://next-auth.js.org/

### openid-client
- Repository: https://github.com/panva/openid-client
- API docs: https://github.com/panva/openid-client/blob/main/docs/README.md
- OIDC example: https://github.com/panva/openid-client/blob/main/examples/oidc.ts

### Authentik
- OAuth2/OIDC provider: https://docs.goauthentik.io/add-secure-apps/providers/oauth2/
- Front/back-channel logout: https://docs.goauthentik.io/add-secure-apps/providers/oauth2/frontchannel_and_backchannel_logout/
- Single Logout: https://docs.goauthentik.io/add-secure-apps/providers/single-logout/

### OWASP
- ASVS project: https://owasp.org/projects/asvs
- ASVS index: https://cheatsheetseries.owasp.org/IndexASVS.html
- Session Management: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- File Upload: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- Content Security Policy: https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html

## 3. Lưu ý về phiên bản

- Tài liệu web có thể thay đổi theo thời gian; khi triển khai lại sau một thời gian dài, phải rà phiên bản thực tế trong lockfile và tài liệu chính thức.
- Không copy code mẫu SSO vào repo mà chưa đối chiếu Node/Next.js/Prisma/runtime thực tế.
- Không trộn ví dụ NextAuth v4 và Auth.js v5 trong cùng module.


### Tailwind CSS
- Next.js installation: https://tailwindcss.com/docs/installation/framework-guides/nextjs

### OpenAI Codex workflow
- Codex Prompting Guide / AGENTS.md: https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide
- Iterating Development Workflows with Codex: https://developers.openai.com/cookbook/examples/codex/iterating-development-workflows-with-codex
- Using PLANS.md for multi-hour problem solving: https://developers.openai.com/cookbook/articles/codex_exec_plans
