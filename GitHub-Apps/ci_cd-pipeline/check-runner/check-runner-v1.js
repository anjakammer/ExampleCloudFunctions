const requestp = require('request-promise')
const jwt = require('jsonwebtoken')

exports.checkRunner = (req, res) => {
  const cert = process.env.PRIVATE_KEY.replace(/###n/g, '\n')

  const webToken = jwt.sign({
    iss: process.env.APP_ID
  },
  cert, {
    algorithm: 'RS256',
    expiresIn: '10m'
  })

  const createCheckRun = (owner, repo, body, token) =>
    requestp({
      json: true,
      headers: {
        'Authorization': 'token ' + token,
        'User-Agent': process.env.APP_NAME,
        'Accept': 'application/vnd.github.antiope-preview+json'
      },
      method: 'POST',
      url: `https://api.github.com/repos/${owner}/${repo}/check-runs`,
      body
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
  if (typeof req.body === 'undefined') {
    res.status(400).send('No message defined!')
  } else {
    const payload = req.body
    if (payload.action === 'requested') {
      res.status(200).send('OK')
      installationToken(payload.installation.id)
        .then(({
          token
        }) => {
          const body = {
            'name': 'mighty_readme',
            'head_sha': payload.check_suite.head_sha,
            'status': 'in_progress',
            'external_id': '42',
            'started_at': '2018-05-04T01:14:52Z',
            'output': {
              'title': 'Mighty Readme report',
              'summary': 'A Summery',
              'text': 'the text'
            },
            'actions': [{
              'label': 'abort',
              'identifier': 'abort_run',
              'description': 'cancel this check'
            }, {
              'label': 'notify me',
              'identifier': 'notify_me',
              'description': 'sends a notification for status updates'
            }]
          }
          return createCheckRun(
            payload.repository.owner.login,
            payload.repository.name,
            body,
            token
          )
        })
    }
  }
}
