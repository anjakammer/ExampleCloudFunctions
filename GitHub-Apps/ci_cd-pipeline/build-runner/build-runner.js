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
      }
    )
    .on('error', (err) => console.error('ERR:REDIS:', err))
    // [END client]

  const updateCheckRun = (owner, repo, head_sha, token, check_run_id, status,
      conclusion, completed_at) =>
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
        'name': 'Build',
        'head_sha': head_sha,
        'status': status,
        'conclusion': conclusion,
        'started_at': '2018-05-04T01:15:52Z',
        'completed_at': completed_at,
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
        head_sha, 'owner', owner, 'repo', repo, 'step', 'build',
        'check_run_id', check_run_id, 'status', status, 'conclusion',
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

  if (req.body === undefined) {
    res.status(400)
      .send('No message defined!')
  } else {
    const payload = req.body
    if (payload.action !== undefined) {
      res.status(200)
        .send('OK')
      installationToken(payload.installation)
        .then(({
          token
        }) => {
          let status = payload.action
          let conclusion = ''
          let completed_at = ''
          if (status === 'abort_run') {
            status = 'completed'
            conclusion = 'cancelled'
            completed_at = '2018-05-05T01:15:52Z'
          }
          return updateCheckRun(
            payload.owner,
            payload.repo,
            payload.head_sha,
            token,
            payload.check_run_id,
            status,
            conclusion,
            completed_at
          )
        })
    }
  }
}
