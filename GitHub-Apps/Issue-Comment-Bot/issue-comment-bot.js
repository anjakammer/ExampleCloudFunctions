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

exports.addComment = (url, body, token) => requestp({
  url,
  json: true,
  headers: {
    'Authorization': 'token ' + token,
    'User-Agent': process.env.APP_NAME,
    'Accept': 'application/vnd.github.machine-man-preview+json'
  },
  method: 'POST',
  body: {
    body
  }
})

exports.main = (req, res) => {
  console.log(req, res)
  if (typeof req.body === 'undefined') {
    res.status(400).send('No message defined!')
  } else {
    const payload = req.body
    if (payload.action === 'opened') {
      this.installationToken(payload.installation.id)
        .then(({
          token
        }) => {
          const comment = 'yeah baby!'
          this.addComment(payload.issue.comments_url, comment, token)
          return res.status(200).send('OK')
        })
    }
  }
}
