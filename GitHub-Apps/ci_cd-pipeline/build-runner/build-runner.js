const requestp = require('request-promise')
const jwt = require('jsonwebtoken')
const redis = require('redis');

exports.buildRunner = (req, res) => {

  const cert = process.env.PRIVATE_KEY.replace(/###n/g, '\n');

  const webToken = jwt.sign({
      iss: process.env.APP_ID
    },
    cert, {
      algorithm: 'RS256',
      expiresIn: '10m'
    })

  const updateCheckRun = (owner, repo, head_sha, token, check_run_id) =>
    requestp({
      json: true,
      headers: {
        'Authorization': 'token ' + token,
        'User-Agent': process.env.APP_NAME,
        'Accept': 'application/vnd.github.antiope-preview+json'
      },
      method: 'PATCH',
      url: `https://api.github.com/repos/${owner}/${repo}/check-runs/${check_run_id}`,
      body: {
        "name": "Build",
        "head_sha": head_sha,
        "status": "in_progress",
        "started_at": "2018-05-04T01:15:52Z",
        "output": {
          "title": "Build report",
          "summary": "A summery of the build report",
          "text": "The console output"
        },
        "actions": [{
          "label": "abort",
          "identifier": "abort_run",
          "description": "cancel this build"
        }, {
          "label": "re-run",
          "identifier": "re-run",
          "description": "runs this build again"
        }]
      }
    }).then(
      redisClient.hmset(
        head_sha, "owner", owner, "repo", repo, "check_run_id",
        check_run_id, "status", "in_progress"
      )
    )

  const installationToken = (installationId) => requestp({
    url: `https://api.github.com/installations/${installationId}/access_tokens`,
    json: true,
    headers: {
      'Authorization': 'Bearer ' + webToken,
      'User-Agent': process.env.APP_NAME,
      'Accept': 'application/vnd.github.machine-man-preview+json'
    },
    method: 'POST'
  })

  // [START client]
  // Connect to a redis server provisioned over at
  // Redis Labs. See the README for more info.
  const redisClient = redis.createClient(
    process.env.REDIS_PORT,
    process.env.REDIS_HOST, {
      'auth_pass': process.env.REDIS_KEY,
      'return_buffers': true
    }
  ).on('error', (err) => console.error('ERR:REDIS:', err));
  // [END client]

  if (req.body === undefined) {
    res.status(400).send('No message defined!')
  } else {
    const payload = req.body
    if (payload.action === 'queue') {
      res.status(200).send('OK');
      installationToken(payload.installation)
        .then(({
          token
        }) => {
          return updateCheckRun(
            payload.owner,
            payload.repo,
            payload.head_sha,
            token,
            payload.check_run_id
          )
        })
    }
  }
}
