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

  const getRequest = (payload) => {
    if (payload.action === 'opened') {
      return payload.issue.body
    } else if (payload.action === 'created') {
      return payload.comment.body
    }
  }

  const getResponse = (request) => {
    request = request.toLowerCase()
    let response = 'I don\'t understand what you mean.'

    if (request.includes("help")) {
      response = 'This is your Help. What do you want to do? "Report a Bug" or  "Request a Feature"'
    } else if(request.includes('bug')) {
      response = 'go left to "Labels" > "bug"'
    } else if(request.includes('feature')) {
      response = 'go left to "Labels" > "enhancement"'
    }

    return response
  }

  console.log(req, res)
  if (req.body === undefined) {
    res.status(400).send('No message defined!')
  } else {
    const payload = req.body
    if (payload.sender.type !== 'User') {
      res.status(200).send('Wrong User type');
      return
    }
    installationToken(payload.installation.id)
      .then(({
        token
      }) => {
        res.status(200).send('OK');
        const request = getRequest(payload)
        const response = getResponse(request)
        return addComment(payload.issue.comments_url, response, token)
    })
  }
}
