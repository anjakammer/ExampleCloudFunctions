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
| `REDIS_HOST`          | redisHost               |
| `REDIS_PORT`          | redisPort               |
| `REDIS_KEY`           | redisKey                |

## Architecture

### Inbox
The `inbox` is the gateway between GitHub and all services which trigger all steps of the ci/cd pipeline.
All GitHub hooks come in through the `inbox`, which is validating the call, and triggers other functions accordingly.
