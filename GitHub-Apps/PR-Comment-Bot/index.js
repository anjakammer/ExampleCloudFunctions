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
    if (payload.action === 'synchronize') {
      this.installationToken(payload.installation.id)
        .then(({
          token
        }) => {
          setTimeout(() => {
            const fullPreviewUrl = `${process.env.PREVIEW_URL}/${payload.after}`
            const comment = `Preview Environment is set up: [${fullPreviewUrl}](${fullPreviewUrl})`
            this.addComment(payload.pull_request.comments_url, comment, token)
          }, 120000)
          return res.status(200).send('OK')
        })
    }
  }
}
