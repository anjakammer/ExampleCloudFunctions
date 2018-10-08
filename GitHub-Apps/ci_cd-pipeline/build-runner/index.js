const requestp = require('request-promise')
const jwt = require('jsonwebtoken')

exports.webToken = () => {
  const cert = process.env.PRIVATE_KEY.replace(/###n/g, '\n')

  return jwt.sign({
    iss: process.env.APP_ID
  },
  cert, {
    algorithm: 'RS256',
    expiresIn: '10m'
  })
}

exports.installationToken = (installationId) => requestp({
  url: `https://api.github.com/installations/${installationId}/access_tokens`,
  json: true,
  headers: {
    'Authorization': 'Bearer ' + this.webToken(),
    'User-Agent': process.env.APP_NAME,
    'Accept': 'application/vnd.github.machine-man-preview+json'
  },
  method: 'POST'
})

exports.updateCheckRun = (owner, repo, headSha, token, checkRunId, status) =>
  requestp({
    json: true,
    headers: {
      'Authorization': 'token ' + token,
      'User-Agent': process.env.APP_NAME,
      'Accept': 'application/vnd.github.antiope-preview+json'
    },
    method: 'PATCH',
    url: `https://api.github.com/repos/${owner}/${repo}/check-runs/${checkRunId}`,
    body: {
      'name': 'Build',
      'head_sha': headSha,
      status,
      'started_at': new Date().toISOString(),
      'actions': [{
        'label': 'abort',
        'identifier': 'abort_build',
        'description': 'cancel this build'
      }]
    }
  })

exports.abortBuild = (owner, repo, headSha, token, checkRunId) =>
  requestp({
    json: true,
    headers: {
      'Authorization': 'token ' + token,
      'User-Agent': process.env.APP_NAME,
      'Accept': 'application/vnd.github.antiope-preview+json'
    },
    method: 'PATCH',
    url: `https://api.github.com/repos/${owner}/${repo}/check-runs/${checkRunId}`,
    body: {
      'name': 'Build',
      'head_sha': headSha,
      status: 'completed',
      conclusion: 'cancelled',
      'started_at': new Date().toISOString(),
      'completed_at': new Date().toISOString(),
      'output': {
        'title': 'Build report',
        'summary': 'A summery of the build report',
        'text': 'The console output'
      },
      'actions': [{
        'label': 're-run',
        'identifier': 'rerun_build',
        'description': 're-run this build'
      }]
    }
  })

exports.main = (req, res) => {
  if (typeof req.body === 'undefined') {
    res.status(400)
      .send('No message defined!')
  } else {
    const payload = req.body
    if (typeof payload.action !== 'undefined') {
      res.status(200)
        .send('OK')
      this.installationToken(payload.installation)
        .then(({
          token
        }) => {
          const status = payload.action
          if (status === 'abort_build') {
            return this.abortBuild(
              payload.owner,
              payload.repo,
              payload.head_sha,
              token,
              payload.check_run_id)
          } else {
            return this.updateCheckRun(
              payload.owner,
              payload.repo,
              payload.head_sha,
              token,
              payload.check_run_id,
              status
            )
          }
        })
    }
  }
}
