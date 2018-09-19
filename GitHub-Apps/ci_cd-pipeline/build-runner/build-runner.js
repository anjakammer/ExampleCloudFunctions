const requestp = require('request-promise')
const jwt = require('jsonwebtoken')
const redis = require('redis')

exports.buildRunner = (req, res) => {
  const cert = process.env.PRIVATE_KEY.replace(/###n/g, '\n')

  const webToken = jwt.sign({
    iss: process.env.APP_ID
  },
  cert, {
    algorithm: 'RS256',
    expiresIn: '10m'
  })

  // [START client]
  // Connect to a redis server provisioned over at
  // Redis Labs. See the README for more info.
  const redisClient = redis.createClient(
    process.env.REDIS_PORT,
    process.env.REDIS_HOST, {
      'auth_pass': process.env.REDIS_KEY,
      'return_buffers': true
    })
    .on('error', (err) => console.error('ERR:REDIS:', err))
    // [END client]

  const updateCheckRun = (owner, repo, headSha, token, checkRunId, status,
    conclusion, completedAt) =>
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
        conclusion,
        'started_at': '2018-05-04T01:15:52Z',
        'completed_at': completedAt,
        'output': {
          'title': 'Build report',
          'summary': 'A summery of the build report',
          'text': 'The console output'
        },
        'actions': [{
          'label': 'abort',
          'identifier': 'abort_run',
          'description': 'cancel this build'
        }]
      }
    }).then((response) => {
      // TODO check for successful response (status code)
      redisClient.hmset(
        headSha, 'owner', owner, 'repo', repo, 'step', 'build',
        'check_run_id', checkRunId, 'status', status, 'conclusion',
        conclusion)
    }).then(() => redisClient.quit())

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

  if (typeof req.body === 'undefined') {
    res.status(400)
      .send('No message defined!')
  } else {
    const payload = req.body
    if (typeof payload.action !== 'undefined') {
      res.status(200)
        .send('OK')
      installationToken(payload.installation)
        .then(({
          token
        }) => {
          let status = payload.action
          let conclusion = ''
          let completedAt = ''
          if (status === 'abort_run') {
            status = 'completed'
            conclusion = 'cancelled'
            completedAt = '2018-05-05T01:15:52Z'
          }
          return updateCheckRun(
            payload.owner,
            payload.repo,
            payload.head_sha,
            token,
            payload.check_run_id,
            status,
            conclusion,
            completedAt
          )
        })
    }
  }
}
