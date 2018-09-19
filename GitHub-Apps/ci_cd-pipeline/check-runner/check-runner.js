const requestp = require('request-promise')
const jwt = require('jsonwebtoken')
const eachSeries = require('async/eachSeries')

exports.checkRunner = (req, res) => {
  const cert = process.env.PRIVATE_KEY.replace(/###n/g, '\n')

  const webToken = jwt.sign({
    iss: process.env.APP_ID
  },
  cert, {
    algorithm: 'RS256',
    expiresIn: '10m'
  })

  const createCheckRun = (owner, repo, topic, headSha, token) =>
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
        'name': topic,
        'head_sha': headSha,
        'status': 'queued',
        'actions': [{
          'label': 'abort',
          'identifier': 'abort_run',
          'description': 'cancel this'
        }]
      }
    }).then(response => {
      console.log(response)
      return response
    }).catch(error => {
      console.error(error)
    })

  const triggerBuild = (owner, repo, headSha, installation, checkRunId,
    action) =>
    requestp({
      json: true,
      method: 'POST',
      url: process.env.BUILD_TRIGGER,
      body: {
        action,
        'check_run_id': checkRunId,
        owner,
        repo,
        'head_sha': headSha,
        installation
      }
    }).then((response) => {
      console.log(response)
      return response
    }).catch((error) => {
      console.error(error)
    })

  const queueAllChecks = (owner, repo, installation, topics, headSha, token) => {
    console.log('queueAllChecks')
    eachSeries(topics, (topic, next) => {
      return createCheckRun(owner, repo, topic, headSha, token)
        .then((response) => {
          console.log(topic)
          if (topic === 'Build') {
            triggerBuild(owner, repo, headSha, installation,
              response.id, 'in_progress')
          }
          next()
        })
    })
  }

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
      res.status(200).send('OK')
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
    } else if (
      payload.action === 'requested_action' && payload.check_run.name ===
      'Build'
    ) {
      res.status(200).send('OK')
      console.log('requested costum action: ' + payload.requested_action.identifier)
      return triggerBuild(
        payload.repository.owner.login,
        payload.repository.name,
        payload.check_run.head_sha,
        payload.installation.id,
        payload.check_run.id,
        payload.requested_action.identifier
      )
    } else {
      res.status(200).send('skipped this action')
    }
  }
}
