//const virtual_machine = (bp: SDK) => {

import { OAuth2Client } from 'google-auth-library'

const sendAuthLink = () => {
  console.log('hello1')
  const googleConfig = {
    clientId: '775299701273-i1874h2ja7rkasec33d8f3jaa6q021r0.apps.googleusercontent.com',
    clientSecret: 'FHZRyK_nBSrqlQN58tMRbT80',
    redirect: 'http://localhost:3000/api/v1/bots/franco/mod/channel-web/google-auth'
  }

  console.log('hello2')
  const auth = new OAuth2Client(googleConfig.clientId, googleConfig.clientSecret, googleConfig.redirect)

  const defaultScope = ['https://www.googleapis.com/auth/plus.me', 'https://www.googleapis.com/auth/userinfo.email']

  console.log('hello3')
  const url = auth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // access type and approval prompt will force a new refresh token to be made each time signs in
    scope: defaultScope
  })

  console.log(`hello4 : ${url}`)

  const postbackEvent = bp.IO.Event({
    type: 'text',
    channel: 'web',
    direction: 'outgoing',
    target: event.target,
    botId: event.botId,
    payload: {
      text: url
    }
  })

  bp.events.sendEvent(postbackEvent)
}

return sendAuthLink()
