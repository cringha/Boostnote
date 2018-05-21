import React from 'react'
import CSSModules from 'browser/lib/CSSModules'
import styles from './ConfigTab.styl'
import ConfigManager from 'browser/main/lib/ConfigManager'
import store from 'browser/main/store'
import PropTypes from 'prop-types'
import _ from 'lodash'
import i18n from 'browser/lib/i18n'

import MetaWeblogUtils from 'browser/lib/metaweblogutils';
const electron = require('electron')
const { shell } = electron
const ipc = electron.ipcRenderer
class Blog extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      config: props.config,
      BlogAlert: null
    }
  }

  handleLinkClick (e) {
    shell.openExternal(e.currentTarget.href)
    e.preventDefault()
  }

  clearMessage () {
    _.debounce(() => {
      this.setState({
        BlogAlert: null
      })
    }, 2000)()
  }

  componentDidMount () {
    this.handleSettingDone = () => {
      this.setState({BlogAlert: {
        type: 'success',
        message: i18n.__('Successfully applied!')
      }})
    }
    this.handleSettingError = (err) => {
      this.setState({BlogAlert: {
        type: 'error',
        message: err.message != null ? err.message : i18n.__('Error occurs!')
      }})
    }
    this.oldBlog = this.state.config.blog
    ipc.addListener('APP_SETTING_DONE', this.handleSettingDone)
    ipc.addListener('APP_SETTING_ERROR', this.handleSettingError)
  }

  handleBlogChange (e) {
    const { config } = this.state
    config.blog = {
      password: !_.isNil(this.refs.passwordInput) ? this.refs.passwordInput.value : config.blog.password,
      username: !_.isNil(this.refs.usernameInput) ? this.refs.usernameInput.value : config.blog.username,
             markdown: !_.isNil(this.refs.markdownInput) ? this.refs.markdownInput.checked : config.blog.markdown,
      token: !_.isNil(this.refs.tokenInput) ? this.refs.tokenInput.value : config.blog.token,
      authMethod: this.refs.authMethodDropdown.value,
      address: this.refs.addressInput.value,
      type: this.refs.typeDropdown.value
    }
    this.setState({
      config
    })
    if (_.isEqual(this.oldBlog, config.blog)) {
      this.props.haveToSave()
    } else {
      this.props.haveToSave({
        tab: 'Blog',
        type: 'warning',
        message: i18n.__('You have to save!')
      })
    }
  }

  handleSaveButtonClick (e) {
    const newConfig = {
      blog: this.state.config.blog
    }

// check metawblog config if correct and get blogid from server 
         var client = new MetaWeblogUtils.MetaWeblogClient(newConfig.blog);
         client.getBlogId()
             .then(blogs => {

                 var blogInfo = blogs;
                 if (Array.isArray(blogs) && blogs.length > 0)
                     blogInfo = blogs[0];

                 newConfig.blog.blogid = blogInfo.blogid;
                 newConfig.blog.blogName = blogInfo.blogName;
                 newConfig.blog.blogUrl = blogInfo.url;

                 ConfigManager.set(newConfig)

                 store.dispatch({
                     type: 'SET_UI',
                     config: newConfig
                 })
                 this.clearMessage()
                 this.props.haveToSave()
             })
             .catch(error => {
                 console.log(error);
                 this.handleSettingError(error);
             });
  }

  render () {
    const {config, BlogAlert} = this.state
    const blogAlertElement = BlogAlert != null
      ? <p className={`alert ${BlogAlert.type}`}>
        {BlogAlert.message}
      </p>
      : null
    return (
      <div styleName='root'>
        <div styleName='group'>
          <div styleName='group-header'>{i18n.__('Blog')}</div>
          <div styleName='group-section'>
            <div styleName='group-section-label'>
              {i18n.__('Blog Type')}
            </div>
            <div styleName='group-section-control'>
              <select
                value={config.blog.type}
                ref='typeDropdown'
                onChange={(e) => this.handleBlogChange(e)}
              >
                <option value='wordpress' key='wordpress'>{i18n.__('wordpress')}</option>
                <option value='metaWeblogApi' key='metaWeblogApi'>{i18n.__('metaWeblogApi')}</option>
              </select>
            </div>
          </div>
          <div styleName='group-section'>
            <div styleName='group-section-label'>{i18n.__('Blog Address')}</div>
            <div styleName='group-section-control'>
              <input styleName='group-section-control-input'
                onChange={(e) => this.handleBlogChange(e)}
                ref='addressInput'
                value={config.blog.address}
                type='text'
              />
            </div>
          </div>
          <div styleName='group-control'>
            <button styleName='group-control-rightButton'
              onClick={(e) => this.handleSaveButtonClick(e)}>{i18n.__('Save')}
            </button>
            {blogAlertElement}
          </div>
        </div>
        <div styleName='group-header2'>{i18n.__('Auth')}</div>

        <div styleName='group-section'>
          <div styleName='group-section-label'>
            {i18n.__('Authentication Method')}
          </div>
          <div styleName='group-section-control'>
            <select
              value={config.blog.authMethod}
              ref='authMethodDropdown'
              onChange={(e) => this.handleBlogChange(e)}
            >
              <option value='JWT' key='JWT'>{i18n.__('JWT')}</option>
              <option value='USER' key='USER'>{i18n.__('USER')}</option>
            </select>
          </div>
        </div>
        { config.blog.authMethod === 'JWT' &&
          <div styleName='group-section'>
            <div styleName='group-section-label'>{i18n.__('Token')}</div>
            <div styleName='group-section-control'>
              <input styleName='group-section-control-input'
                onChange={(e) => this.handleBlogChange(e)}
                ref='tokenInput'
                value={config.blog.token}
                type='text' />
            </div>
          </div>
        }
        { config.blog.authMethod === 'USER' &&
          <div>
            <div styleName='group-section'>
              <div styleName='group-section-label'>{i18n.__('UserName')}</div>
              <div styleName='group-section-control'>
                <input styleName='group-section-control-input'
                  onChange={(e) => this.handleBlogChange(e)}
                  ref='usernameInput'
                  value={config.blog.username}
                  type='text' />
              </div>
            </div>
            <div styleName='group-section'>
              <div styleName='group-section-label'>{i18n.__('Password')}</div>
              <div styleName='group-section-control'>
                <input styleName='group-section-control-input'
                  onChange={(e) => this.handleBlogChange(e)}
                  ref='passwordInput'
                  value={config.blog.password}
                  type='password' />
              </div>
            </div>
            <div styleName='group-section'>
              <div styleName='group-section-label'>{i18n.__('Markdown')}</div>
              <div styleName='group-section-control'>
                <input styleName='group-section-control-input'
                  onChange={(e) => this.handleBlogChange(e)}
                  ref='markdownInput'
                  checked={config.blog.markdown}
                  
                  type='checkbox' />
              </div>
            </div>
          </div>
        }
      </div>
    )
  }
}

Blog.propTypes = {
  dispatch: PropTypes.func,
  haveToSave: PropTypes.func
}

export default CSSModules(Blog, styles)
