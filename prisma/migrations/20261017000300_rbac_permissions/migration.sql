CREATE TABLE "RolePolicy" (
  "role" "UserRole" NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RolePolicy_pkey" PRIMARY KEY ("role"),
  CONSTRAINT "RolePolicy_configurable_role" CHECK ("role" IN ('CLASS_MANAGER','ACCOUNTANT'))
);
CREATE TABLE "RolePermission" (
  "role" "UserRole" NOT NULL,
  "permission" TEXT NOT NULL,
  CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("role","permission"),
  CONSTRAINT "RolePermission_role_fkey" FOREIGN KEY ("role") REFERENCES "RolePolicy"("role") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "RolePolicy" ("role") VALUES ('CLASS_MANAGER'),('ACCOUNTANT');
INSERT INTO "RolePermission" ("role","permission") VALUES
('CLASS_MANAGER', 'classes.view'),
('CLASS_MANAGER', 'classes.edit'),
('CLASS_MANAGER', 'registrations.view'),
('CLASS_MANAGER', 'registrations.create'),
('CLASS_MANAGER', 'registrations.review'),
('CLASS_MANAGER', 'registrations.transfer'),
('CLASS_MANAGER', 'students.view'),
('CLASS_MANAGER', 'students.identity'),
('CLASS_MANAGER', 'sessions.manage'),
('CLASS_MANAGER', 'attendance.manage'),
('CLASS_MANAGER', 'receipts.view'),
('CLASS_MANAGER', 'certificates.manage'),
('CLASS_MANAGER', 'excel.export'),
('CLASS_MANAGER', 'excel.import'),
('CLASS_MANAGER', 'links.view'),
('ACCOUNTANT', 'classes.view'),
('ACCOUNTANT', 'registrations.view'),
('ACCOUNTANT', 'students.view'),
('ACCOUNTANT', 'payments.manage'),
('ACCOUNTANT', 'receipts.view'),
('ACCOUNTANT', 'invoices.manage'),
('ACCOUNTANT', 'excel.export'),
('ACCOUNTANT', 'excel.import'),
('ACCOUNTANT', 'links.view');
