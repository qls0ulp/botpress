import * as sdk from 'botpress/sdk'
import _ from 'lodash'
import moment from 'moment'

import Database from './db'

const N_MESSAGE_GROUPS_READ = 10

export default async (bp: typeof sdk, db: Database) => {
  const router = bp.http.createRouterForBot('history')

  router.get('/conversations', async (req, res) => {
    const { botId } = req.params
    const { from, to } = req.query

    const conversationsInfo = await db.getDistinctConversations(botId, from, to)

    res.send(conversationsInfo)
  })

  router.get('/messages/:convId', async (req, res) => {
    const convId = req.params.convId
    const { flag } = req.query
    const messageGroupsArray = await prepareMessagesRessource(db, convId, 0, flag)
    const messageCount = await db.getConversationMessageCount(convId)
    const messageGroupCount = await db.getConversationMessageGroupCount(convId)
    res.send({ messageGroupsArray, messageCount, messageGroupCount })
  })

  router.get('/more-messages/:convId', async (req, res) => {
    const convId = req.params.convId
    const { offset, clientCount, flag } = req.query

    const actualCount = await db.getConversationMessageGroupCount(convId)
    const unsyncOffset = Number(offset) + Math.max(actualCount - clientCount, 0)

    const messageGroupsArray = await prepareMessagesRessource(db, convId, unsyncOffset, flag)
    res.send(messageGroupsArray)
  })

  router.post('/flagged-messages', async (req, res) => {
    const messages = req.body
    await db.flagMessages(messages)
    res.sendStatus(201)
  })
}

async function prepareMessagesRessource(db, convId, offset, flag) {
  const filters = { flag }
  const messages = await db.getMessagesOfConversation(convId, N_MESSAGE_GROUPS_READ, offset, filters)

  const messageGroupKeyBuild = (msg: sdk.IO.Event) =>
    msg.direction === 'incoming' ? msg.id : (msg as sdk.IO.OutgoingEvent).incomingEventId
  const messageGroups = _.groupBy(messages, messageGroupKeyBuild)

  return _.sortBy(_.values(messageGroups), mg => moment(mg[0].createdOn).unix()).reverse()
}
