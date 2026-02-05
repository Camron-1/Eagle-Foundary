# Lambda Consumer Contracts

This document defines the event payloads consumed by AWS Lambda functions triggered by SQS events from the backend.

## Architecture
- **Backend** publishes events to SNS/SQS.
- **Lambda Functions** consume these events to perform async tasks (emails, notifications, etc.).

## Event Types

### `AUTH.OTP_REQUESTED`
Triggered when a user requests an OTP for login or verification.

**Payload:**
```json
{
  "email": "student@ashland.edu",
  "otp": "123456",
  "type": "LOGIN" | "VERIFICATION"
}
```

### `STUDENT.WELCOME`
Triggered when a student successfully verifies their email/signup.

**Payload:**
```json
{
  "userId": "uuid",
  "email": "student@ashland.edu",
  "name": "John Doe"
}
```

### `OPPORTUNITY.PUBLISHED`
Triggered when a company publishes a new opportunity.

**Payload:**
```json
{
  "opportunityId": "uuid",
  "title": "Software Engineer Intern",
  "orgId": "uuid",
  "orgName": "TechCorp"
}
```

### `APPLICATION.STATUS_UPDATED`
Triggered when a student's application status changes.

**Payload:**
```json
{
  "applicationId": "uuid",
  "studentId": "uuid",
  "status": "APPROVED" | "REJECTED" | "INTERVIEW",
  "opportunityTitle": "Software Engineer Intern"
}
```

## Lambda Processing Rules
1. **Idempotency**: Consumers must handle duplicate events gracefully using `eventId`.
2. **Error Handling**: Failed events should be retried 3 times before moving to DLQ.
3. **Logging**: All events must be logged with `correlationId`.
