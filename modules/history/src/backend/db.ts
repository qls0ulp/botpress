import * as sdk from 'botpress/sdk'

import moment from 'moment'

const FLAGS_TABLE_NAME = 'history_flags'
const EVENTS_TABLE_NAME = 'events'

export default class HistoryDb {
  knex: any

  constructor(private bp: typeof sdk) {
    this.knex = bp.database
  }

  initialize = async () => {
    this.knex.createTableIfNotExists(FLAGS_TABLE_NAME, table => {
      table.string('flaggedMessageId').primary()
    })
  }

  flagMessages = async (messages: sdk.IO.Event[]) => {
    let newRows = messages.map(m => ({ flaggedMessageId: m.id }))
    const currentRows = await this.knex
      .select()
      .from(FLAGS_TABLE_NAME)
      .whereIn('flaggedMessageId', newRows.map(m => m.flaggedMessageId))
      .then(rows => rows.map(r => r.flaggedMessageId))

    newRows = newRows.filter(r => !currentRows.includes(r.flaggedMessageId))
    await this.knex.batchInsert(FLAGS_TABLE_NAME, newRows, 30)
  }

  getDistinctConversations = async (botId: string, from?: number, to?: number) => {
    const query = this.knex
      .select()
      .distinct('sessionId')
      .from(EVENTS_TABLE_NAME)
      .whereNotNull('sessionId')
      .andWhere({ botId })

    if (from) {
      const fromDate = moment.unix(from).toDate()
      query.andWhere(this.knex.date.isBefore(fromDate, 'createdOn'))
    }
    if (to) {
      const toDate = moment.unix(to).toDate()
      query.andWhere(this.knex.date.isAfter(toDate, 'createdOn'))
    }

    const queryResults = await query
    const uniqueConversations: string[] = queryResults.map(x => x.sessionId)

    const buildConversationInfo = async c => ({ id: c, count: await this.getConversationMessageCount(c) })
    return Promise.all(uniqueConversations.map(buildConversationInfo))
  }

  getMessagesOfConversation = async (sessionId, count, offset, filters) => {
    const incomingMessagesQuery = this.knex.select('event').from(EVENTS_TABLE_NAME)

    if (filters.flags) {
      incomingMessagesQuery.join(
        FLAGS_TABLE_NAME,
        `${EVENTS_TABLE_NAME}.incominEventId`,
        `${FLAGS_TABLE_NAME}.flaggedMessageId`
      )
    }

    const incomingMessages: sdk.IO.Event[] = await incomingMessagesQuery
      .orderBy('createdOn', 'desc')
      .where({ sessionId, direction: 'incoming' })
      .offset(offset)
      .limit(count)
      .then(rows => rows.map(r => this.knex.json.get(r.event)))

    const messages = await this.knex(EVENTS_TABLE_NAME)
      .whereIn('incomingEventId', incomingMessages.map(x => x.id))
      .then(rows => rows.map(r => this.knex.json.get(r.event)))

    return messages
  }

  getConversationMessageCount = async (sessionId: string) => {
    return this._getMessageCountWhere({ sessionId })
  }

  getConversationMessageGroupCount = async (sessionId: string) => {
    return this._getMessageCountWhere({ sessionId, direction: 'incoming' })
  }

  private async _getMessageCountWhere(whereParams) {
    const messageCountObject = await this.knex
      .from(EVENTS_TABLE_NAME)
      .count()
      .where(whereParams)

    return messageCountObject.pop()['count(*)']
  }
}
