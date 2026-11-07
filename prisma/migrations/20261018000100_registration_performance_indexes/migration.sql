-- Additive indexes only: no deduplication or deletion of existing registrations.
CREATE INDEX "Registration_classId_cccd_idx" ON "Registration"("classId", "cccd");
CREATE INDEX "Registration_classId_createdAt_id_idx" ON "Registration"("classId", "createdAt", "id");
CREATE INDEX "Registration_status_createdAt_id_idx" ON "Registration"("status", "createdAt", "id");
CREATE INDEX "Registration_createdAt_id_idx" ON "Registration"("createdAt", "id");
CREATE INDEX "TrackingEvent_sessionId_eventName_idx" ON "TrackingEvent"("sessionId", "eventName");
CREATE INDEX "Class_status_startDate_id_idx" ON "Class"("status", "startDate", "id");
CREATE INDEX "Class_managerId_startDate_idx" ON "Class"("managerId", "startDate");
