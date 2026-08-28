# V62 FINAL FIX

- Fixed legacy MongoDB indexes on `studentId` that could cause MongoDB E11000 errors after Student ID was removed.
- Registration API now catches duplicate-key failures and returns JSON instead of an opaque HTTP 500.
- Teacher frontend now reports the actual HTTP status/message returned by the API.
- Student ID remains excluded from the application UI/API payloads.
- Existing student/registration documents are preserved; only obsolete Student ID indexes are removed when the database connection initializes.
- No database records are deleted by this release.

Deployment requirements: `MONGODB_URI`; admin features also require `ADMIN_PIN`.
