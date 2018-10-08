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

exports.sendUpdate = (url, method, body, token) =>
  requestp({
    json: true,
    headers: {
      'Authorization': 'token ' + token,
      'User-Agent': process.env.APP_NAME,
      'Accept': 'application/vnd.github.antiope-preview+json'
    },
    method,
    url,
    body
  }).then((response) => {
    console.log(response)
    return response
  }).catch((error) => {
    console.error(error)
  })

exports.main = (req, res) => {
  if (typeof req.body === 'undefined') {
    res.status(400).send('No message defined!')
  } else {
    res.status(202).send('Accepted')
    const payload = req.body
    this.installationToken(payload.installation.id)
      .then(({
        token
      }) => {
        return this.sendUpdate(payload.url, payload.method, payload.body, token)
      })
  }
}
