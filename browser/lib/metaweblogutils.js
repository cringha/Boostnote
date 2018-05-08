import fs from 'fs'
import path from 'path';
import http  from 'http';
import Markdown from './markdown' 

var crypto = require('crypto');
// var MetaWeblog = require('metaweblog-api');
import MetaWeblog from 'browser/lib/metaweblogapi';

const IMAGE_REG = /!\[(.*?)\]\((.*)\)/gi;


export function findBlogInNote(note, addr, postId) {
    if (!note.blog)
        return null;

    for (let i = note.blog.length - 1; i >= 0; --i) {
        var blogz = note.blog[i];
        if (blogz.address === addr && blogz.blogId === postId)
            return blogz;
    }

    return null;
}

export function findNoteByPostId(notes, address, postId) {
    for (var i = 0; i < notes.length; i++) {
        var note = notes[i];
        var blogz = findBlogInNote(note, address, postId);
        if (blogz)
            return note;
    }

    return null;
}

// 
export function searchImages(content, regex) {
    //  const regex = IMAGE_REG ; /// /\{\w+\}/g;
    let m;
    let array = [];
    while ((m = regex.exec(content)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }
        var fx = m[0];
        if (fx) {
            var name = fx.substring(1, fx.length - 1);
            // console.log( 'm0  ' + m[0] ); 
            // console.log( 'm1  ' + m[1] ); 
            // console.log( 'm2  ' + m[2] ); 
            // console.log( '');
            if (m[2])
                array.push(m[2]);
        }
    }
    return array;
}



// 检查 Blog Image cache中 有没有缓存的数据
export function checkImageCache(blog, image, name) {
    if (!blog.imageUrls || blog.imageUrls.length == 0)
        return null;

    if (!name)
        name = 'src';

    for (var i = 0; i < blog.imageUrls.length; i++) {
        var im = blog.imageUrls[i];
        if (im[name] == image) {

            if( name === 'src') {
                if( im.sha1 ){
                    var csha1 = sha1File( im.src );
                    if( csha1 == im.sha1 )
                        return im ; 
                    else {
                        blog.imageUrls.splice(i,1); /// [i];
                        return null;
                    }
                }
            }

             
            

            return im;
        }
    }

    return null;

}



// 从服务器更新 内容，刷新本地程序
/**
 * [downloadBlogById description]
 * @param  {[type]} blogConfig [description]
 * @return {[type]}            [description]
 */
export function downloadBlogById(blogConfig, blogId, success, err) {

    const { address, token, authMethod, username, password } = blogConfig;

    // 'http://172.17.2.220:18080/solo/apis/metaweblog'; // use your blog API instead
    console.log("Fetch blog from " + address + " " + username + " blogId is " + blogId);
    var metaWeblog = new MetaWeblog(address);

    metaWeblog.getPost(blogId, username, password)
        .then(blogContent => {
            console.log(blogContent);
            success(blogContent);
        })
        .catch(error => {
            console.log(error);
            err('Fetch blog Error ' + address + " " + username + " " + blogId, error);
        });


}


function findBlog(blogs, address) {
    if (!blogs) return null;
    return blogs.find((blog) => blog.address === address);

}
// get current action blog config ;
export function findActiveBlogInNote(note, addr) {
    var address = addr;


    if (!Array.isArray(note.blog))
        note.blog = [];


    var blog = findBlog(note.blog, address); // firstNote.blog ;
    if (!blog) {
        blog = {
            address: address,
            blogId: null,
            url: null,
            imageUrls: []
        };
        note.blog.push(blog);
    }
    return blog;
}
export function removeActiveBlogInNote(note, addr) {
    var address = addr;

    if( !addr )
        return false;

    if (!Array.isArray(note.blog))
        return false;

    for (var i = 0; i < note.blog.length; i++) {
        if(note.blog[i].address === addr ){
            note.blog.splice( i, 1 );
            return true;
        }
    }
    return false;
    
}


export function findTitle(content, title) {
    var reg = /^\s*#+\s+(.*)\s*/i;
    // var patt1=new RegExp("e");
    // 
    var lines = str.trim().split('\n');
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        line = line.trim();
        if (line.length > 0) {
            // 第一行 

        }
    }
}


export function publishMarkdownContent(blogConfig, note, blog, success, err) {

    const { address, token, authMethod, username, password } = blogConfig;
    let blogId = null;

    blogId = blog.blogId;

    const contentToRender = note.content.replace(`# ${note.title}`, '')

    // 将本地图片替换为 HTTP 图片
    let exportedData = contentToRender.replace(IMAGE_REG, (match, dstFilename, srcFilename) => {
        var im = checkImageCache(blog, srcFilename);
        if (im) {
            srcFilename = im.url;
        }
        return `![${dstFilename}](${srcFilename})`;
    });


    if( blogConfig.markdown !== true ){
        const markdown = new Markdown();
        exportedData = markdown.render(exportedData);

    }

    var post = {
        title: note.title,
        description: exportedData,
        categories: note.tags
    };

    var metaWeblog = new MetaWeblog(address);


    if (blogId) {
        console.log('editPost ' + blogId + ' ' + username + ' ' + post.title);
        metaWeblog.editPost(blogId, username, password, post, true)
            .then(blogId2 => {
                // handle the blog information here


                console.log('after EditPost ' + blogId + ' ' + username + ' ' + post.title + ' new id ' + blogId2);

                if (_.isNil(blogId2)) {
                    return Promise.reject()
                }

                if( typeof blogId2 == 'string') {
                    success(blogId2);    
                }else {

                }

                

            })
            .catch(error => {
                console.error(error);
                err(error);
            });

    } else {
        console.log('newPost ' + blogId + ' ' + username + ' ' + post.title);
        metaWeblog.newPost(username, username, password, post, true)
            .then(blogId2 => {
                // handle the blog information here

                console.log('after newPost ' + blogId + ' ' + username + ' ' + post.title + ' new id ' + blogId2);
                if (_.isNil(blogId2)) {
                    return Promise.reject()
                }

                success(blogId2);

            })
            .catch(error => {
                console.error(error)
                err(error)
            });

    }

}


export function loadUserBlogs(blogConfig, notes, success, err) {

    const { address, token, authMethod, username, password } = blogConfig;

    // 'http://172.17.2.220:18080/solo/apis/metaweblog'; // use your blog API instead
    var metaWeblog = new MetaWeblog(address);


    var blogId = username; //  "liu.kang@siemens.com";

    metaWeblog.getRecentPosts(blogId, username, password, 50)
        .then(blogs => {
            if (notes) {
                for (var i = 0; i < blogs.length; i++) {
                    var blog = blogs[i];
                    console.log(blog.postid, blog.title, blog.categories);

                    if (notes) {
                        var note = findNoteByPostId(notes, address, blog.postid);
                        if (note) {
                            blog.local = note;
                            blog.localTitle = note.title;
                        }
                    }

                }
            }

            success(blogs);
        })
        .catch(error => {
            console.log(error);
            err(error);
        });
}


export function sha1File( file ){

  var shasum = crypto.createHash('sha1');
  var content = fs.readFileSync(file);
    shasum.update(content);
    return shasum.digest('hex');
}

// publish markdown &images to weblog 
export function uploadMarkdownImages(blogConfig, note, success, error) {

    const { address, token, authMethod, username, password } = blogConfig

    const contentToRender = note.content.replace(`# ${note.title}`, '')


    // 'http://172.17.2.220:18080/solo/apis/metaweblog'; // use your blog API instead
    var metaWeblog = new MetaWeblog(address);

    var blog = findActiveBlogInNote(note, address);



    // process local images ;
    var list = searchImages(contentToRender, IMAGE_REG);
    var ims = [];

    var tasks = [];
    if (list) {
        for (var i = 0; i < list.length; i++) {
            var file = list[i];
            try {

                if (file.match(/^http/i)) {
                    continue;
                }

                // ¼ì²éÍ¼Æ¬ÊÇ·ñÒÑ¾­ÉÏ´«¹ý
                var im = checkImageCache(blog, file);
                if (!im) {
                    var imageContent = null;
                    if (file.match(/^\\\:storage/i) || file.match(/^\/\:storage/i)) {

                        // lenght of "/:storage"
                        var name = file.substring(10);
                        const { storage, folder } = this.resolveTargetFolder();
                        var fullPath = path.join(storage.path, IMAGES_FOLDER_NAME, name);

                        imageContent = fs.readFileSync(fullPath);
                    } else {
                        imageContent = fs.readFileSync(file);
                    }


                    if (imageContent) {
                        // if( !Buffer.isBuffer(imageContent))
                        if (imageContent.length > 0) {
                            imageContent = new Buffer(imageContent);
                        }
                    }



                    var image = {
                        name: file,
                        type : 'image/png',
                        bits: imageContent // { base64 : base64file}

                    };
                    console.log('upload image ', file);
                    // 
                    var p = metaWeblog.newMediaObject('', username, password, image, true);
                    tasks.push(p);
                    ims.push(file);

                }
            } catch (e) {
                console.log(e);
            }

        }
    }

    var that = this;
    if (tasks && tasks.length > 0) {
        Promise.all(tasks)
            .then(results => {

                for (var i = 0; i < results.length; i++) {
                    var ret = results[i];
                    var file = ims[i];
                    if (file) {
                        if (!blog.imageUrls) blog.imageUrls = [];

                        var sha1val = sha1File(file);

                        blog.imageUrls.push({
                            src: file,
                            sha1: sha1val,
                            url: ret.url
                        });
                    }
                }
                success(note, blog);

            }).catch(err => {
                console.log(err)
                error(err);
            });
    } else {
        success(note, blog);
    }

}

 

function randName(){
    return crypto.randomBytes(10).toString('hex');
}

export function replaceContentUrl(base, content, localBlog , cb ) {

    // https 

    if (content && localBlog && localBlog.imageUrls) {
        // 将远程服务器图片替换为本地 图片，如果有的话
        let exportedData = content.replace(IMAGE_REG, (match, dstFilename, srcFilename) => {
            var im = checkImageCache(localBlog, srcFilename, 'url');
            if (im) {
                srcFilename = im.src;
            }else {

                if (srcFilename.match(/^http/i)) {
                     
              

                    const imageDir = path.join(base, 'images')
                    if (!fs.existsSync(imageDir)) fs.mkdirSync(imageDir)
                    

                    var request = http.get(srcFilename, function(response) {

                        const imageExt = path.extname(srcFilename);
                        var localFile = path.join(imageDir, 'cache-' + randName() + imageExt ) ;
                        var file = fs.createWriteStream(localFile);

                        console.log('download file ' + srcFilename + ' save to ' + localFile);

                        response.pipe(file);
                        file.on('finish', function() {
                           file.close( function(){
                                var csha1 = sha1File(localFile );
                                localBlog.imageUrls.push({
                                    src: localFile,
                                    sha1: csha1,
                                    url: srcFilename
                                });

                                if(cb){
                                    cb();
                                }

                           });  // close() is async, call cb after close completes.

                        });

                    }).on('error', function(err) { // Handle errors
                        console.log(err)
                    })   ;
                }
               
            }


            return `![${dstFilename}](${srcFilename})`;

        });
        return exportedData;
    } else {
        return content;
    }


}

export default {
    findNoteByPostId,
    downloadBlogById,
    checkImageCache,
    searchImages,
    findActiveBlogInNote,
    uploadMarkdownImages,
    publishMarkdownContent,
    replaceContentUrl,
    loadUserBlogs,
    removeActiveBlogInNote
}