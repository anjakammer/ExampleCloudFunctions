const requestp = require('request-promise')

exports.forwardCall = (url, body) =>
  requestp({
    json: true,
    headers: {
      'User-Agent': 'inbox'
    },
    method: 'POST',
    url,
    body
  }).then((response) => {
    console.log(response)
    return response
  }).catch((error) => {
    console.error(error)
  })

exports.getURL = (action, customAction) => {
  if (action === 'requested') {
    return process.env.CREATE_TRIGGER
  }

  if (action === 'requested_action') {
    if (customAction === 'abort_build') {
      return process.env.ABORT_BUILD_TRIGGER
    }
  }

  return ''
}

exports.main = (req, res) => {
  if (typeof req.body === 'undefined') {
    res.status(400).send('No message defined!')
  } else {
    res.status(202).send('Accepted')
    const payload = req.body
    let customAction = ''
    try {
      customAction = payload.requested_action.identifier
    } catch (err) {
      // nothing to do
    }
    return this.forwardCall(
      this.getURL(payload.action, customAction),
      payload
    )
  }
}
