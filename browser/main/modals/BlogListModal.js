import PropTypes from 'prop-types'
import React from 'react'
import CSSModules from 'browser/lib/CSSModules'
import styles from './BlogListModal.styl'
import dataApi from 'browser/main/lib/dataApi'
import store from 'browser/main/store'
import ModalEscButton from 'browser/components/ModalEscButton'

const { remote } = require('electron');
const { Menu, MenuItem, dialog } = remote;

import i18n from 'browser/lib/i18n'

import ConfigManager from 'browser/main/lib/ConfigManager';
import MetaWeblogUtils from 'browser/lib/metaweblogutils'


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


        showMessageBox(message , error ) {
            var msg = ''+ message ;
            if( error )
                msg = msg + "\n" + error ;
            dialog.showMessageBox(remote.getCurrentWindow(), {
                type: 'warning',
                message:  msg,
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
            newNote.content =    note.description ; // 

            var blog = {
                    address: address,
                    blogId: postId,
                    url: null,
                    imageUrls: []
                };
            newNote.blog =[
                 blog
            ];
            var that = this;

            // 将内容中http://.....image  url 图片下载，并替换
            newNote.content = MetaWeblogUtils.replaceContentUrl(storage.path, newNote.content , blog  , 
                function(){
                    newNote.content = MetaWeblogUtils.replaceContentUrl( storage.path , newNote.content , blog );
                    that.saveNote(newNote , storage.key);                    
                }
            );

            this.saveNote(newNote , storage.key );


        }





        saveNote(note1 , storage ) {
            
            const { dispatch, location } = this.props;
            if (this.pendingSaveNote) {
                clearTimeout(this.pendingSaveNote)
            }
            this.pendingSaveNote = setTimeout(() => {
                


                var st = storage || note1.storage ;

                if( note1.key ){
                    console.log('update note : ' + note1.title + ' ' + note1.key);
                    dataApi
                        .updateNote( st  , note1.key, note1)
                        .then((note) => {
                            dispatch({
                                type: 'UPDATE_NOTE',
                                note: note
                            });
                        });
                }else {
                    console.log('save new note : ' + note1.title );
                    dataApi.createNote( st , note1)
                        .then((note) => {
                            dispatch({
                                type: 'UPDATE_NOTE',
                                note: note
                            })
                        });
                }

                

            }, 2000);
        }




        overrideToNote(blogContent, postId, oldNote , blogConfig ){
            console.log(blogContent);
            const { dispatch } = this.props;
            const { storage, folder } = this.resolveTargetFolder();

            var blog = MetaWeblogUtils.findBlogInNote( oldNote , blogConfig.address );
            if(!blog ) {
                blog = {} ;
            }

            var that = this;
            blog.blogId = postId ;
            
            // var mz = new Date();
            oldNote.title =   blogContent.title ; // mz + blogContent.title + mz;
            oldNote.tags = blogContent.categories;
            oldNote.content =  blogContent.description;


            oldNote.content =   MetaWeblogUtils.replaceContentUrl(storage.path, blogContent.content , blog  , 
                function(){
                    oldNote.content = MetaWeblogUtils.replaceContentUrl( storage.path , blogContent.content , blog );
                    that.saveNote(oldNote);                    
                }
            );



            this.saveNote(oldNote);

      

        }



        downloadBlog(e, blog ){

            const config = ConfigManager.get();

            if(!blog || !blog.postid ) {
                console.log('postid is empty ' , blog );
                return ;
            }

            var client = new MetaWeblogUtils.MetaWeblogClient(config.blog);

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
                client.downloadBlogById(  blog.postid , 
                    function( blogContent ){
                        console.log(blogContent);
                        if( buttonIndex === 1   ) {
                            that.overrideToNote( blogContent , blog.postid,  blog.local , config.blog  );

                        }else if( buttonIndex === 2 ) {
                            that.writeToNewNote( blogContent , blog.postid ,  config.blog.address   );

                        }else {

                        }

                    }, function (msg, error){
                        that.showMessageBox(msg, error);

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
                    client.downloadBlogById(  blog.postid , 
                        function( blogContent ){
                            console.log(blogContent);
                            if( buttonIndex === 1   ) {
                                that.overrideToNote(  blogContent , blog.postid, findNote , config.blog  );

                            }else if( buttonIndex === 2 ) {
                                that.writeToNewNote( blogContent , blog.postid ,  config.blog.address   );

                            }else {

                            }

                        }, function (msg, error){
                            that.showMessageBox(msg, error);
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
                    client.downloadBlogById(   blog.postid , 
                        function( blogContent ){
                            console.log(blogContent);
                            that.writeToNewNote( blogContent  , blog.postid , config.blog.address);

                        }, function (msg, error){
                            that.showMessageBox(msg, error);
                        }
                    );
                }
                

            }
            


            

            
 
        }


        loadBlogs() {
            const config = ConfigManager.get();
              
            var {notes} = this.props ;
          
            var that = this;

            var client = new MetaWeblogUtils.MetaWeblogClient(config.blog);


            client.loadUserBlogs(  notes , function(blogs){
                that.setState({blogs : blogs });
            }, function(error){
                that.showMessageBox(error);
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
                    
                        { blog.title  }  
                     
                </td>
                <td styleName="td" > 
                    
                        { blog.local ? blog.local.title : ''  }  
                     
                </td>
                <td styleName="td" > { this.tagsToString(blog.categories) }  </td>
                <td styleName="td" >
                    <button  onMouseDown={(e) => this.downloadBlog(e, blog)} >
                        <img src='../resources/icon/icon-newnote.svg' />
                    </button>
                </td> 
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
            <thead>
            <tr styleName="th">
                <td styleName="td"> ID </td>
                <td styleName="td"> Title </td>
                <td styleName="td"> Local </td>
                <td styleName="td"> Tags </td>
                <td styleName="td"> Download </td>
            </tr>
            </thead>
            <tbody>
            {folderList}
            </tbody>
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
