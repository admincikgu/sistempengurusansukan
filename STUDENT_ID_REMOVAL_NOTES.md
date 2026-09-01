# Student ID Removal

Student ID has been removed from client-facing forms, tables, suggestions, profile display, and CSV instructions.

The internal `studentId` field is intentionally preserved in the backend/database so existing MongoDB records, duplicate checks, edit/delete flows, results, and dashboards continue to work unchanged.

Teacher registration gets the internal ID from the selected student record; the teacher never types or sees it.

CSV imports may omit Student ID; an internal deterministic key is generated for backward compatibility.

JavaScript syntax errors after changes: 0
