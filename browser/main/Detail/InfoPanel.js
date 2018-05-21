import PropTypes from 'prop-types'
import React from 'react'
import CSSModules from 'browser/lib/CSSModules'
import styles from './InfoPanel.styl'
import copy from 'copy-to-clipboard'
import i18n from 'browser/lib/i18n'
import _ from 'lodash'
class InfoPanel extends React.Component {
  constructor(props) {
    super(props)
   // let code = this.props.code ;
    this.state = {
        code :  '' 
    };
  }
  componentDidMount() {
    let code = this.props.code ? this.props.code : '' ; 
    this.setState({
        code: code
    })
    
  }
  componentWillReceiveProps(nextProps) {
    let code = nextProps.code ? nextProps.code : '' ; 
     this.state = {
        code :  code 
     };
  } 
  handleChange(event){
     this.props.code =  event.target.value; 
     this.setState({
                 code: event.target.value
             })
  }
  setAccessCode(){
     var code = !_.isNil(this.refs.code) ? this.refs.code.value : this.props.code ;
     const {
        setCode
    } = this.props
    setCode( code );
  }
  copyNoteLink () {
    const {noteLink} = this.props
    this.refs.noteLink.select()
    copy(noteLink)
  }

  render () {
    let {code} = this.state  ;
    const {
      storageName, folderName, noteLink, updatedAt, createdAt, exportAsMd, exportAsTxt, exportAsHtml, wordCount, letterCount, type, print  ,setCode 
    } = this.props;
    return (
      <div className='infoPanel' styleName='control-infoButton-panel' style={{display: 'none'}}>
        <div>
          <p styleName='modification-date'>{updatedAt}</p>
          <p styleName='modification-date-desc'>{i18n.__('MODIFICATION DATE')}</p>
        </div>

        <hr />

        {type === 'SNIPPET_NOTE'
          ? ''
          : <div styleName='count-wrap'>
            <div styleName='count-number'>
              <p styleName='infoPanel-defaul-count'>{wordCount}</p>
              <p styleName='infoPanel-sub-count'>{i18n.__('Words')}</p>
            </div>
            <div styleName='count-number'>
              <p styleName='infoPanel-defaul-count'>{letterCount}</p>
              <p styleName='infoPanel-sub-count'>{i18n.__('Letters')}</p>
            </div>
          </div>
        }

        {type === 'SNIPPET_NOTE'
          ? ''
          : <hr />
        }

        <div>
          <p styleName='infoPanel-default'>{storageName}</p>
          <p styleName='infoPanel-sub'>{i18n.__('STORAGE')}</p>
        </div>

        <div>
          <p styleName='infoPanel-default'>{folderName}</p>
          <p styleName='infoPanel-sub'>{i18n.__('FOLDER')}</p>
        </div>

        <div>
          <p styleName='infoPanel-default'>{createdAt}</p>
          <p styleName='infoPanel-sub'>{i18n.__('CREATION DATE')}</p>
        </div>

        <div>
          <input styleName='infoPanel-noteLink' ref='noteLink' value={noteLink} onClick={(e) => { e.target.select() }} />
          <button onClick={() => this.copyNoteLink()} styleName='infoPanel-copyButton'>
            <i className='fa fa-clipboard' />
          </button>
          <p styleName='infoPanel-sub'>{i18n.__('NOTE LINK')}</p>
        </div>
        <div>
          <input styleName='infoPanel-noteLink' ref='code' value={code}  onChange={ e => this.handleChange (e) }  />
          <button onClick={(e) => this.setAccessCode()} styleName='infoPanel-copyButton'>
            <i className='fa fa-clipboard' />
          </button>
          <p styleName='infoPanel-sub'>{i18n.__('NOTE ACCESS CODE')}</p>
        </div>
        <hr />

        <div id='export-wrap'>
          <button styleName='export--enable' onClick={(e) => exportAsMd(e)}>
            <i className='fa fa-file-code-o' />
            <p>{i18n.__('.md')}</p>
          </button>

          <button styleName='export--enable' onClick={(e) => exportAsTxt(e)}>
            <i className='fa fa-file-text-o' />
            <p>{i18n.__('.txt')}</p>
          </button>

          <button styleName='export--enable' onClick={(e) => exportAsHtml(e)}>
            <i className='fa fa-html5' />
            <p>{i18n.__('.html')}</p>
          </button>

          <button styleName='export--enable' onClick={(e) => print(e)}>
            <i className='fa fa-print' />
            <p>{i18n.__('Print')}</p>
          </button>
        </div>
      </div>
    )
  }
}

InfoPanel.propTypes = {
  storageName: PropTypes.string.isRequired,
  folderName: PropTypes.string.isRequired,
  noteLink: PropTypes.string.isRequired,
  updatedAt: PropTypes.string.isRequired,
  createdAt: PropTypes.string.isRequired,
  exportAsMd: PropTypes.func.isRequired,
  exportAsTxt: PropTypes.func.isRequired,
  exportAsHtml: PropTypes.func.isRequired,
  setCode : PropTypes.func.isRequired,
  wordCount: PropTypes.number,
  letterCount: PropTypes.number,
  type: PropTypes.string.isRequired,
  code: PropTypes.string.isRequired,
  print: PropTypes.func.isRequired
}

export default CSSModules(InfoPanel, styles)
