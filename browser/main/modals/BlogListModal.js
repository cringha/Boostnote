import PropTypes from 'prop-types'
import React from 'react'
import CSSModules from 'browser/lib/CSSModules'
import styles from './BlogListModal.styl'
import dataApi from 'browser/main/lib/dataApi'
import store from 'browser/main/store'
import ModalEscButton from 'browser/components/ModalEscButton'
import {findNoteByPostId} from 'browser/lib/noteutils'
const { remote } = require('electron');
const { Menu, MenuItem, dialog } = remote;

import i18n from 'browser/lib/i18n'
var MetaWeblog = require('metaweblog-api');
import ConfigManager from 'browser/main/lib/ConfigManager';
import {downloadBlogById  , findActiveBlogInNote , replaceContentUrl  } from 'browser/lib/noteutils'


class BlogListModal extends React.Component {
        constructor(props) {
            super(props)

            this.state = {
                blogs: []
            }
        }

        componentDidMount() {
            // this.refs.name.focus()
            // this.refs.name.select()
            this.loadBlogs();
        }

        handleCloseButtonClick(e) {
            this.props.close()
        }

        handleChange(e) {
            // this.setState({
            //     name: this.refs.name.value
            // })
        }

        handleKeyDown(e) {
            if (e.keyCode === 27) {
                this.props.close()
            }
        }

        handleRefreshButtonClick(e) {
             this.loadBlogs();
        }

        handleConfirmButtonClick(e) {
            this.confirm()
        }


        showMessageBox(message) {
            dialog.showMessageBox(remote.getCurrentWindow(), {
                type: 'warning',
                message: message,
                buttons: [i18n.__('OK')]
            })
        }

 
        resolveTargetFolder() {
            const { data, params } = this.props
            let storage = data.storageMap.get(params.storageKey)

            // Find first storage
            if (storage == null) {
                for (const kv of data.storageMap) {
                    storage = kv[1]
                    break
                }
            }

            if (storage == null) this.showMessageBox('No storage for importing note(s)')
            const folder = _.find(storage.folders, { key: params.folderKey }) || storage.folders[0]
            if (folder == null) this.showMessageBox('No folder for importing note(s)')

            return {
                storage,
                folder
            }
        }

        // new note 
        writeToNewNote(note , postId, address ){
            const { storage, folder } = this.resolveTargetFolder();
             const { dispatch } = this.props;
            const newNote = {
                folder: folder.key,
                type: 'MARKDOWN_NOTE',
                 
            };

            newNote.title = note.title ; // mz + blogContent.title + mz;
            newNote.tags = note.categories;
            newNote.content = note.description ; // 
            newNote.blog =[
                {
                    address: address,
                    blogId: postId,
                    url: null,
                    imageUrls: []
                }
            ];


            dataApi.createNote(storage.key, newNote)
                .then((note) => {
                    dispatch({
                        type: 'UPDATE_NOTE',
                        note: note
                    })
                     
                })

        }

        overrideToNote(blogContent, postId, oldNote , blogConfig ){
            console.log(blogContent);
            const { dispatch } = this.props;
            var blog = findActiveBlogInNote( oldNote , blogConfig.address );
            if(!blog ) {
                blog = {} ;
            }

            blog.blogId = postId ;
            
            // var mz = new Date();
            oldNote.title =   blogContent.title ; // mz + blogContent.title + mz;
            oldNote.tags = blogContent.categories;
            oldNote.content = replaceContentUrl( blogContent.description , blog );


            dataApi
                .updateNote(oldNote.storage, oldNote.key, oldNote)
                .then((note) => {
                    dispatch({
                        type: 'UPDATE_NOTE',
                        note: note
                    });
 
                });

        }



        downloadBlog(e, blog ){

            const config = ConfigManager.get();

            if(!blog || !blog.postid ) {
                console.log('postid is empty ' , blog );
                return ;
            }
            var that = this;
            if( blog.local ){
                const buttonIndex = dialog.showMessageBox(remote.getCurrentWindow(), {
                    type: 'warning',
                    message: i18n.__('Local note exist!' ),
                    detail: blog.local.title ,
                    buttons: [i18n.__('Exit'), i18n.__('Override'), i18n.__('Write New Note')]
                })

                if (buttonIndex === 0 ) {
                    return ;
                }
                downloadBlogById( config.blog , blog.postid , 
                    function( blogContent ){
                        console.log(blogContent);
                        if( buttonIndex === 1   ) {
                            that.overrideToNote( blogContent , blog.postid,  blog.local , config.blog  );

                        }else if( buttonIndex === 2 ) {
                            that.writeToNewNote( blogContent , blog.postid ,  config.blog.address   );

                        }else {

                        }

                    }, function (msg, error){
                            console.log(msg, error);
                    }
                );
                
            }else {


                var {notes} = this.props ;

                /// 找到一个重名的 Note
                var findNote = notes.find((nt) => nt.title === blog.title);
                if( findNote ){
                    const buttonIndex = dialog.showMessageBox(remote.getCurrentWindow(), {
                        type: 'warning',
                        message: i18n.__('Dup tilte note exist!' ),
                        detail: findNote.title ,
                        buttons: [i18n.__('Exit'), i18n.__('Override'), i18n.__('Write New Note')]
                    })

                    if (buttonIndex === 0 ) {
                        return ;
                    }
                    downloadBlogById( config.blog , blog.postid , 
                        function( blogContent ){
                            console.log(blogContent);
                            if( buttonIndex === 1   ) {
                                that.overrideToNote(  blogContent , blog.postid, findNote , config.blog  );

                            }else if( buttonIndex === 2 ) {
                                that.writeToNewNote( blogContent , blog.postid ,  config.blog.address   );

                            }else {

                            }

                        }, function (msg, error){
                                console.log(msg, error);
                        }
                    );
                }else {

                    const buttonIndex = dialog.showMessageBox(remote.getCurrentWindow(), {
                        type: 'warning',
                        message: i18n.__('Download Note?' ),
                        detail:  '',
                        buttons: [i18n.__('Exit') , i18n.__('Write New Note')]
                    })

                    if (buttonIndex === 0 ) {
                        return ;
                    }
                    downloadBlogById( config.blog , blog.postid , 
                        function( blogContent ){
                            console.log(blogContent);
                            that.writeToNewNote( blogContent  , blog.postid , config.blog.address);

                        }, function (msg, error){
                                console.log(msg, error);
                        }
                    );
                }
                

            }
            


            

            
 
        }


        loadBlogs() {
            const config = ConfigManager.get();
            const { address, token, authMethod, username, password } = config.blog

            // 'http://172.17.2.220:18080/solo/apis/metaweblog'; // use your blog API instead
            var metaWeblog = new MetaWeblog(address);

            var {notes} = this.props ;
            var blogId = username; //  "liu.kang@siemens.com";

            metaWeblog.getRecentPosts(blogId, username, password, 50)
                .then(blogs => {
                    // handle the blog information here
                    // console.log(blogs);

                    for (var i = 0; i < blogs.length; i++) {
                        var blog = blogs[i];
                        console.log(blog.postid, blog.title, blog.categories);

                        if( notes ){
                            var note = findNoteByPostId(notes, address, blog.postid);
                            if(note){
                                blog.local = note ;
                                blog.localTitle = note.title;
                            }
                        }

                    }




                    this.setState({blogs : blogs });

                })
                .catch(error => {
                    console.log(error);
                });

        }


        getBlogTitle(blog){
            if( blog.local )
                return blog.title +' [ ' + blog.localTitle + ' ] ' ;
            return blog.title ;
        }


        tagsToString(tags ){
            if(!tags) return '';
            var out = '';
            for (var i = 0; i < tags.length; i++) {
                out += tags[i];
                if( i < tags.length -1 )
                    out += ', ';

            }
            return out;

        }

        confirm() {
            // if (this.state.name.trim().length > 0) {
            //     const { storage, folder } = this.props
            //     dataApi
            //         .updateFolder(storage.key, folder.key, {
            //             name: this.state.name,
            //             color: folder.color
            //         })
            //         .then((data) => {
            //             store.dispatch({
            //                 type: 'UPDATE_FOLDER',
            //                 storage: data.storage
            //             })
            //             this.props.close()
            //         })
            // }
        }

  render () {
 
    const   blogs   = this.state.blogs ;

    const folderList = blogs.map((blog, index) => {
      return (
            <tr styleName="tr">
                <td styleName="td" > {blog.postid} </td>
                <td styleName="td" > 
                    <a 
                        onMouseDown={(e) => this.downloadBlog(e, blog)} 
                    >  
                        { this.getBlogTitle(blog)  }  
                    </a>  
                </td>
                <td styleName="td" > { this.tagsToString(blog.categories) }  </td>
                 
            </tr>
      )
    });


    return (
      <div styleName='root'
        tabIndex='-1'
        
      >
        <div styleName='header'>
          <div styleName='title'>{i18n.__('Blogs List')}</div>
        </div>
        <button styleName='refreshButton'
            onMouseDown={(e) => this.handleRefreshButtonClick(e)}
          >
            <img src='../resources/icon/icon-list-active.svg'/>
        </button>

        <ModalEscButton handleEscButtonClick={(e) => this.handleCloseButtonClick(e)} />

        <table styleName='table'>
            <tr styleName="tr">
                <td styleName="td"> ID </td>
                <td styleName="td"> Title </td>
                <td styleName="td"> Tags </td>
                
            </tr>
            {folderList}
        </table>

         
      </div>
    )
  }
}

BlogListModal.propTypes = {
  storage: PropTypes.shape({
    key: PropTypes.string
  }),
  folder: PropTypes.shape({
    key: PropTypes.string,
    name: PropTypes.string
  })
}

export default CSSModules(BlogListModal, styles)
