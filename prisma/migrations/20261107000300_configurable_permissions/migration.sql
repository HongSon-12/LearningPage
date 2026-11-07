-- Make every built-in role configurable; preserve existing effective access.
ALTER TABLE "RolePolicy" DROP CONSTRAINT "RolePolicy_configurable_role";
INSERT INTO "RolePolicy" ("role") VALUES ('ADMIN') ON CONFLICT DO NOTHING;
INSERT INTO "RolePermission" ("role", "permission")
SELECT 'ADMIN'::"UserRole", permission FROM (VALUES
  ('dashboard.view'), ('dashboard.analytics'), ('classes.all'),
  ('classes.view'), ('classes.create'), ('classes.edit'), ('classes.delete'), ('classes.assign'),
  ('registrations.view'), ('registrations.create'), ('registrations.review'),
  ('registrations.transfer'), ('registrations.delete'), ('students.view'),
  ('students.identity'), ('students.edit'), ('sessions.manage'), ('attendance.manage'),
  ('payments.manage'), ('receipts.view'), ('invoices.manage'), ('certificates.manage'),
  ('excel.export'), ('excel.import'), ('links.view'), ('users.manage'), ('roles.manage'), ('settings.manage')
) AS permissions(permission) ON CONFLICT DO NOTHING;
INSERT INTO "RolePermission" ("role", "permission")
SELECT "role", 'classes.all' FROM "RolePolicy" WHERE "role" = 'ACCOUNTANT'
ON CONFLICT DO NOTHING;
UPDATE "RolePolicy" SET "version" = "version" + 1, "updatedAt" = CURRENT_TIMESTAMP
WHERE "role" = 'ACCOUNTANT';
-- Existing accounting-based custom roles previously saw all classes. Manager-based
-- roles remain scoped to their assignments until explicitly granted classes.all.
UPDATE "CustomRole" SET "permissions" = array_append("permissions", 'classes.all'),
  "version" = "version" + 1, "updatedAt" = CURRENT_TIMESTAMP
WHERE "baseRole" = 'ACCOUNTANT' AND NOT ('classes.all' = ANY("permissions"));
