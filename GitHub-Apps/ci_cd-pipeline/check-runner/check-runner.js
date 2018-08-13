const requestp = require('request-promise')
const jwt = require('jsonwebtoken')

exports.checkRunner = (req, res) => {

  const cert = process.env.PRIVATE_KEY.replace(/###n/g, '\n');

  const webToken = jwt.sign({
      iss: process.env.APP_ID
    },
    cert, {
      algorithm: 'RS256',
      expiresIn: '10m'
    })

  const queueAllChecks = (owner, repo, installation, topics, head_sha, token) => {
    console.log("queueAllChecks")
    topics.forEach(topic =>
      createCheckRun(owner, repo, topic, head_sha, token)
      .then(response => {
        console.log(topic)
        if (topic === "Build") {
          triggerBuild(owner, repo, head_sha, installation, response.id)
        }
      })
    )
  }

  const createCheckRun = (owner, repo, topic, head_sha, token) =>
    requestp({
      json: true,
      headers: {
        'Authorization': 'token ' + token,
        'User-Agent': process.env.APP_NAME,
        'Accept': 'application/vnd.github.antiope-preview+json'
      },
      method: 'POST',
      url: `https://api.github.com/repos/${owner}/${repo}/check-runs`,
      body: {
        "name": topic,
        "head_sha": head_sha,
        "status": "queued",
        "actions": [{
          "label": "abort",
          "identifier": "abort_run",
          "description": "cancel this"
        }]
      }
    }).then(response => {
      console.log(response)
      return response
    })

  const triggerBuild = (owner, repo, head_sha, installation, check_run_id) =>
    requestp({
      json: true,
      method: 'POST',
      url: process.env.BUILD_TRIGGER,
      body: {
        "action": "queue",
        "check_run_id": check_run_id,
        "owner": owner,
        "repo": repo,
        "head_sha": head_sha,
        "installation": installation
      }
    }).then(response => {
      console.log(response)
      return response
    })
    .catch(error => {
      console.error(error)
    });

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
    res.status(400).send('No message defined!')
  } else {
    const payload = req.body
    if (payload.action === 'requested') {
      res.status(200).send('OK');
      installationToken(payload.installation.id)
        .then(({
          token
        }) => {
          return queueAllChecks(
            payload.repository.owner.login,
            payload.repository.name,
            payload.installation.id, [
              'Build',
              'Test',
              'Deployment',
              'Post-Deployment Test'
            ],
            payload.check_suite.head_sha,
            token
          )
        })
    }
  }
}
