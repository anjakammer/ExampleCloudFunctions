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

exports.postRequest = (url, body, token) => requestp({
  url,
  json: true,
  headers: {
    'Authorization': 'token ' + token,
    'User-Agent': process.env.APP_NAME,
    'Accept': 'application/vnd.github.machine-man-preview+json'
  },
  method: 'POST',
  body
})

exports.getInput = (payload) => {
  if (payload.action === 'opened') {
    return payload.issue.body
  } else if (payload.action === 'created') {
    return payload.comment.body
  }
}

exports.sendReaction = (payload, token) => {
  const request = this.getInput(payload).toLowerCase()
  let response = { 'body': 'I don\'t understand what you mean.' }
  let newLabel = ''

  if (request.includes('help')) {
    response = { 'body': 'This is your Help. What do you want to do? "Report a Bug" or  "Request a Feature"' }
  } else if (request.includes('bug')) {
    newLabel = 'bug'
  } else if (request.includes('feature')) {
    newLabel = 'enhancement'
  }

  if (newLabel !== '') {
    response = { 'body': `I will add the '${newLabel}' label for you.` }
    this.postRequest(`${payload.issue.url}/labels`, [newLabel], token)
  }

  this.postRequest(payload.issue.comments_url, response, token)
}

exports.main = (req, res) => {
  if (typeof req.body === 'undefined') {
    res.status(400).send('No message defined!')
  } else {
    const payload = req.body
    if (payload.sender.type !== 'User') {
      return res.status(200).send('Wrong user type. No action required.')
    }
    this.installationToken(payload.installation.id)
      .then(({
        token
      }) => {
        this.sendReaction(payload, token)
        return res.status(200).send('OK')
      })
  }
}
