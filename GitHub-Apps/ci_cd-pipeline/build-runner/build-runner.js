const requestp = require('request-promise')
const jwt = require('jsonwebtoken')

exports.buildRunner = (req, res) => {

  const cert = process.env.PRIVATE_KEY.replace(/###n/g, '\n');

  const webToken = jwt.sign({
      iss: process.env.APP_ID
    },
    cert, {
      algorithm: 'RS256',
      expiresIn: '10m'
    })

  const updateCheckRun = (owner, repo, body, token, check_run_id) =>
    requestp({
      json: true,
      headers: {
        'Authorization': 'token ' + token,
        'User-Agent': process.env.APP_NAME,
        'Accept': 'application/vnd.github.antiope-preview+json'
      },
      method: 'PATCH',
      url: `https://api.github.com/repos/${owner}/${repo}/check-runs/${check_run_id}`,
      body: body
    })

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

  console.log(req, res)
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
          const body = {
            "name": "Build",
            "head_sha": payload.head_sha,
            "status": "in_progress",
            "external_id": "42",
            "started_at": "2018-05-04T01:15:52Z",
            "output": {
              "title": "Build report",
              "summary": "A summery of the build report",
              "text": "The console output"
            },
            "actions": [{
              "label": "abort",
              "identifier": "abort_run",
              "description": "cancel this check"
            }, {
              "label": "notify me",
              "identifier": "notify_me",
              "description": "sends a notification for status updates"
            }]
          }
          return updateCheckRun(
            payload.owner,
            payload.repo,
            body,
            token,
            payload.check_run_id
          )
        })
    }
  }
}
