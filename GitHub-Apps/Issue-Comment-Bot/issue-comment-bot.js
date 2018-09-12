const requestp = require('request-promise')
const jwt = require('jsonwebtoken')

exports.autoComment = (req, res) => {

  const cert = process.env.PRIVATE_KEY.replace(/###n/g, '\n');

  const webToken = jwt.sign({
      iss: process.env.APP_ID
    },
    cert, {
      algorithm: 'RS256',
      expiresIn: '10m'
    })

  const addComment = (url, body, token) =>
    requestp({
      json: true,
      headers: {
        'Authorization': 'token ' + token,
        'User-Agent': process.env.APP_NAME,
        'Accept': 'application/vnd.github.machine-man-preview+json'
      },
      method: 'POST',
      url,
      body: {
        body
      }
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
    res.status(200).send('OK');
    const payload = req.body
    if (payload.action === 'opened') {
      installationToken(payload.installation.id)
        .then(({
          token
        }) => {
          const comment = 'yeah baby!'
          return addComment(payload.issue.comments_url, comment, token)
        })
    }
  }
}
