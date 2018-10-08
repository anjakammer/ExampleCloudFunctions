## Required Environment Variables

| Key                   | Description             |
| ----------------      |-------------------------|
| `APP_NAME`            | Developer or App Name   |
| `APP_ID`              | GitHub-App Id           |
| `PRIVATE_KEY`         | GitHub-App Private Key  |
| `OUTBOX_TRIGGER`      | Trigger url             |
| `CREATE_TRIGGER`      | Trigger url             |
| `RERUN_TRIGGER`       | Trigger url             |
| `BUILD_TRIGGER`       | Trigger url             |
| `ABORT_BUILD_TRIGGER` | Trigger url             |
| `TEST_TRIGGER`        | Trigger url             |
| `DEPLOY_TRIGGER`      | Trigger url             |
| `PDTEST_TRIGGER`      | Trigger url             |

## What it does
The _inbox_ collects all webhook calls and distributes it.
