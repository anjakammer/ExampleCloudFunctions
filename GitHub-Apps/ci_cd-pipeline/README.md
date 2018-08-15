## Required Environment Variables

| Key             | Description             |
| ----------------|-------------------------|
| `APP_NAME`      | Developer or App Name   |
| `APP_ID`        | GitHub-App Id           |
| `PRIVATE_KEY`   | GitHub-App Private Key  |
| `BUILD_TRIGGER` | Trigger url             |
| `TEST_TRIGGER`  | Trigger url             |
| `DEPLOY_TRIGGER`| Trigger url             |
| `PDTEST_TRIGGER`| Trigger url             |
| `REDIS_HOST`    | redisHost               |
| `REDIS_PORT`    | redisPort               |
| `REDIS_KEY`     | redisKey                |


## Architecture

### Check-Runner
The `check-runner` is the gateway between GitHub and all services which trigger all steps of the ci/cd pipeline.
All GitHub hooks come in through the `check-runner`, which is validating the call, and triggers other functions accordingly.
