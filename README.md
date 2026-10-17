# LearningPage

Project files are located directly in the `Learning` repository root. Run the commands below from that directory.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Application routes

On the current development server (`http://localhost:3001`):

- `/` opens Hệ thống Quản trị (authentication required); `/login` is the sign-in page.
- `/hocsocapcuu` is the public first-aid landing page.
- `/courses`, `/register/[classId]`, and `/search` are the public course, registration, and lookup pages.
- `/login` is the admin login page.
- `/fb`, `/zalo`, and `/page` redirect to `/hocsocapcuu` with their respective `source` tracking parameter.

These paths also apply when running the application on another port or domain.

## Student management setup

Run `pnpm exec prisma migrate deploy` and `pnpm exec prisma generate` for the new schema. The initial migration is a baseline for existing installations; this workspace's existing schema was verified and marked as applied before the additive upgrade.

Run `pnpm setup:admin` to initialize a missing/placeholder administrator with a strong generated password. Existing real credentials are preserved. Local credentials are saved in `.local/admin-access.txt`, which is excluded from Git. After logging in, use `/users` to create class-manager/accountant accounts and assign classes.

Use `/registrations` for manual/late registration, transfers, rejection reasons, GCN/GXN tracking and Excel import/export. Transfers require matching program and tuition, available seats and no issued documents. Rejected/cancelled registrations do not occupy seats; restoring them checks capacity again. Unpaid reservations do not expire automatically.

Program landing pages use `/dao-tao/[slug]`, individual class pages use `/lop/[classId]`, and the existing first-aid landing remains `/hocsocapcuu`.

Validation: `pnpm test:management` uses an isolated database schema; `pnpm test:http` checks the running development server and requires the local admin-access file. Use `NEXT_BUILD_DIR=.next-build pnpm build` for a production build alongside a running dev server.


### Administrative navigation

- `/courses`: class list; **Quản lý học viên** opens `/courses/[classId]` with manual/late registration, transfers, Excel and certificate/payment management according to account permissions.
- `/registrations`: check registration information and attachments, approve or reject with a reason; initially lists pending applications.
- `/course-links`: copy direct, Facebook, Zalo and Fanpage links for the five main training programs.
- `/settings`, `/users`: settings and account management. Old `/admin/...` page URLs redirect to the corresponding new URLs.
- Public schedules now use `/hocsocapcuu/courses` to avoid conflicting with administrative `/courses`.
