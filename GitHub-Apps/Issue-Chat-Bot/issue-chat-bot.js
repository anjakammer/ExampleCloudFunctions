const requestp = require('request-promise')
const jwt = require('jsonwebtoken')

exports.main = (req, res) => {
  const cert = process.env.PRIVATE_KEY.replace(/###n/g, '\n')

  const webToken = jwt.sign({
    iss: process.env.APP_ID
  },
  cert, {
    algorithm: 'RS256',
    expiresIn: '10m'
  })

  const postRequest = (url, body, token) => requestp({
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

  const getInput = (payload) => {
    if (payload.action === 'opened') {
      return payload.issue.body
    } else if (payload.action === 'created') {
      return payload.comment.body
    }
  }

  const sendReaction = (payload, token) => {
    const request = getInput(payload).toLowerCase()
    let response = 'I don\'t understand what you mean.'
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
      postRequest(`${payload.issue.url}/labels`, [newLabel], token)
    }

    postRequest(payload.issue.comments_url, response, token)
  }

  if (req.body === undefined) {
    res.status(400).send('No message defined!')
  } else {
    const payload = req.body
    if (payload.sender.type !== 'User') {
      return res.status(200).send('Wrong user type. No action required.')
    }
    installationToken(payload.installation.id)
      .then(({
        token
      }) => {
        sendReaction(payload, token)
        return res.status(200).send('OK')
      })
  }
}
