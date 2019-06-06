import React from 'react'
import style from './style.scss'
import { MdSearch } from 'react-icons/md'
import classnames from 'classnames'

export class MessageGroup extends React.Component {
  state = {
    messages: [],
    userMessage: null,
    botMessages: null
  }

  componentDidMount() {
    const messages = [...this.props.messages]

    const userMessageIndex = messages.findIndex(m => m.direction === 'incoming')
    const userMessage = messages[userMessageIndex]
    if (userMessage) {
      messages.splice(userMessageIndex, 1)
    }

    this.setState({ messages, userMessage, botMessages: messages })
  }

  isSelected = false
  handleSelection() {
    this.isSelected = !this.isSelected
    this.props.handleSelection(this.isSelected, this.state.userMessage)
  }

  render() {
    if (!this.state.messages) {
      return null
    }
    return (
      <div className={style['message-group']}>
        <div className={style['message-group-header']}>
          {this.state.userMessage && this.state.userMessage.decision && (
            <div className={style['message-group-explanation']}>
              <div className={style['message-group-confidence']}>{`${Math.round(
                this.state.userMessage.decision.confidence * 10000
              ) / 100}% decision:`}</div>
              <div className={style['message-group-decision']}>{` ${
                this.state.userMessage.decision.sourceDetails
              }`}</div>
            </div>
          )}
          <div className={style['message-inspect']} onClick={() => this.props.focusMessage(this.state.userMessage)}>
            <MdSearch />
          </div>
          <input type="checkbox" onChange={() => this.handleSelection()} />
        </div>
        <div className={style['message-sender']}>User:</div>
        {this.state.userMessage && (
          <div className={classnames(style['message-elements'], style['message-incomming'])}>
            {this.state.userMessage.preview}
          </div>
        )}
        <div className={style['message-sender']}>Bot:</div>
        {this.state.botMessages &&
          this.state.botMessages.map(m => {
            return (
              <div
                className={classnames(
                  style['message-elements'],
                  m.direction === 'outgoing' ? style['message-outgoing'] : style['message-incomming']
                )}
                key={`${m.id}: ${m.direction}`}
                value={m.id}
              >
                {m.preview}
              </div>
            )
          })}
      </div>
    )
  }
}
