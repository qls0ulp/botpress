import React from 'react'
import style from './style.scss'

import classnames from 'classnames'
import { MessageGroup } from './MessageGroup'
import { MessagesHeader } from './MessagesHeader'
import { MessageInspector } from './MessageInspector'

import { IoMdFlag } from 'react-icons/io'

import ReactTooltip from 'react-tooltip'

function NoConversationSelected() {
  return (
    <div className={style['message-list']}>
      <div className={style['no-conv']}>
        <h3>No conversations selected</h3>
        <p>
          Please select a conversation on the left pane to see a message history. If there are no conversations
          available, try talking to your bot and refresh conversations by clicking on the round arrow
        </p>
      </div>
    </div>
  )
}

class MessagesTaskBar extends React.Component {
  filters = {
    flag: false
  }

  toggleFlagFilter() {
    this.filters.flag = !this.filters.flag
    this.props.updateFilters(this.filters)
  }

  render() {
    return (
      <div className={style.messageTaskBar}>
        {!this.props.useAsFilter && (
          <div>
            <IoMdFlag
              className={style.messageTaskBarFlagIcon}
              data-tip
              data-for="flag"
              onClick={() => this.props.flag()}
            />
            <ReactTooltip id="flag" effect="solid">
              <div>Mark selected messages as not good</div>
            </ReactTooltip>
          </div>
        )}
        {this.props.useAsFilter && <input type="checkbox" onChange={() => this.toggleFlagFilter()} />}
      </div>
    )
  }
}

export class MessageViewer extends React.Component {
  state = {
    inspectorIsShown: false,
    currentlyFocusedMessage: null,
    areMessagesSelected: false
  }

  selectedMessages = []
  handleSelection(isSelected, message) {
    if (isSelected) {
      this.selectMessage(message)
    } else {
      this.unSelectMessage(message)
    }

    const areMessagesSelected = !!this.selectedMessages.length
    this.setState({ areMessagesSelected })
  }

  selectMessage(message) {
    this.selectedMessages.push(message)
  }

  unSelectMessage(message) {
    const idx = this.selectedMessages.indexOf(message)
    if (idx !== -1) {
      this.selectedMessages.splice(idx, 1)
    }
  }

  render() {
    if (!this.props.conversation || !this.props.messageGroups.length) {
      return <NoConversationSelected />
    }
    return (
      <div className={style['message-viewer']}>
        <div
          className={classnames(
            style['message-list'],
            this.state.inspectorIsShown ? style['message-list-partial'] : style['message-list-full']
          )}
        >
          <MessagesHeader conversation={this.props.conversation} messageGroups={this.props.messageGroups} />
          <MessagesTaskBar
            useAsFilter={!this.state.areMessagesSelected}
            flag={() => this.props.flagMessages(this.selectedMessages)}
            updateFilters={f => this.props.updateConversationWithFilters(f)}
          />
          {this.props.messageGroups &&
            this.props.messageGroups.map(group => {
              return (
                <MessageGroup
                  key={group[0].id}
                  messages={group}
                  focusMessage={m => this.setState({ currentlyFocusedMessage: m, inspectorIsShown: true })}
                  handleSelection={(isSelected, m) => this.handleSelection(isSelected, m)}
                />
              )
            })}
          {this.props.isThereStillMessagesLeft && (
            <div className={style['fetch-more']} onClick={this.props.fetchNewMessages}>
              Load More...
            </div>
          )}
        </div>
        <MessageInspector
          currentlyFocusedMessage={this.state.currentlyFocusedMessage}
          closeInspector={() => this.setState({ inspectorIsShown: false })}
        />
      </div>
    )
  }
}
