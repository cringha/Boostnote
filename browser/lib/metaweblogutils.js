import fs from 'fs'
import path from 'path'
import http from 'http'
import Markdown from './markdown'
const xmlrpc = require('xmlrpc')

var crypto = require('crypto')
const DESTINATION_FOLDER = 'attachments'
const IMAGE_REG = /!\[(.*?)\]\((.*)([\s+=\d+x\d+]?)\)/gi

function MetaWeblog(opts) {
    let address = opts.address
    var client = null
        // var opts = opts;
    var blogId = opts.blogid;

    if (typeof address === 'string') {
        if (address.match(/^https/i)) {
            client = xmlrpc.createSecureClient(address);
        } else {
            client = xmlrpc.createClient(address);
        }

    } else {
        client = xmlrpc.createClient(address);
    }

    function methodCall(methodName, params) {
        return new Promise(function(resolve, reject) {
            client.methodCall(methodName, params, function(error, data) {
                if (!error) {
                    resolve(data);
                } else {
                    reject(error);
                }
            });
        });
    }

    this.getUsersBlogs = function(appKey) {
        return methodCall('blogger.getUsersBlogs', [appKey, opts.username, opts.password]);
    };
    this.getRecentPosts = function(numberOfPosts) {
        return methodCall('metaWeblog.getRecentPosts', [blogId, opts.username, opts.password, numberOfPosts]);
    };

    this.getCategories = function() {
        return methodCall('metaWeblog.getCategories', [blogId, opts.username, opts.password]);
    };

    this.getPost = function(postid) {
        return methodCall('metaWeblog.getPost', [postid, opts.username, opts.password]);
    };
    this.editPost = function(postid, post, publish) {
        return methodCall('metaWeblog.editPost', [postid, opts.username, opts.password, post, publish]);
    };

    this.newPost = function(post, publish) {
        return methodCall('metaWeblog.newPost', [blogId, opts.username, opts.password, post, publish]);
    };

    this.deletePost = function(appKey, postid, publish) {
        return methodCall('blogger.deletePost', [appKey, postid, opts.username, opts.password, publish]);
    };

    this.newMediaObject = function(mediaObject) {
        return methodCall('metaWeblog.newMediaObject', [blogId, opts.username, opts.password, mediaObject]);
    };
};



    function escapeHtml(unsafe) {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
     }

class MetaWeblogClient {

    constructor(blogConfig) {

        this.opts = blogConfig;
        this.appKey = blogConfig.appKey;
        this.address = blogConfig.address;
        this.username = blogConfig.username;
        this.client = new MetaWeblog(blogConfig);
    }



    getBlogId() {
        return this.client.getUsersBlogs(this.appKey);
    }


    // 'http://172.17.2.220:18080/solo/apis/metaweblog'; // use your blog API instead




    // 从服务器更新 内容，刷新本地程序
    /**
     * [downloadBlogById description]
     * @param  {[type]} blogConfig [description]
     * @return {[type]}            [description]
     */
    downloadBlogById(blogId, success, err) {

        // 'http://172.17.2.220:18080/solo/apis/metaweblog'; // use your blog API instead
        // console.log("Fetch blog from " + address + " " + username + " blogId is " + blogId);
        // var metaWeblog = new MetaWeblog(address);

        this.client.getPost(blogId)
            .then(blogContent => {
                console.log(blogContent);



                if (!hasTitle(blogContent.description, blogContent.title)) {
                    blogContent.description = "# " + blogContent.title + "\n\n" + blogContent.description;
                }

                
                success(blogContent);
            })
            .catch(error => {
                console.log(error);
                err('Fetch blog Error ' + this.address + " " + this.username + " " + blogId, error);
            });


    }



    // findTitle(content, title) {
    //     var reg = /^\s*#+\s+(.*)\s*/i;
    //     // var patt1=new RegExp("e");
    //     // 
    //     var lines = str.trim().split('\n');
    //     for (var i = 0; i < lines.length; i++) {
    //         var line = lines[i];
    //         line = line.trim();
    //         if (line.length > 0) {
    //             // 第一行 

    //         }
    //     }
    // }

    /**
     * @param  {note}
     * @param  {[type]}
     * @param  {[type]}
     * @param  {[type]}
     * @return {[type]}
     */
    publishMarkdownContent(note, blog, success, err) {

        //       const { address, token, authMethod, username, password } = blogConfig;
        let blogId = null;

        blogId = blog.blogId;

        // get first line ;

        let noteContent = note.content;

        if (hasTitle(noteContent, note.title)) {
            noteContent = trimFirstLine(noteContent);
        }


        // const contentToRender = note.content.replace(`# ${note.title}`, '')

        // 将本地图片替换为 HTTP 图片
        let exportedData = noteContent.replace(IMAGE_REG, (match, dstFilename, srcFilename) => {
            var im = checkImageCache(blog, srcFilename);
            if (im) {
                srcFilename = im.url;
            }
            return `![${dstFilename}](${srcFilename})`;
        });


        if (this.opts.markdown !== true) {
            const markdown = new Markdown();
            exportedData = markdown.render(exportedData);

        }else {
            exportedData = escapeHtml(exportedData);
        }

        var post = {
            title: note.title,
            description: exportedData,
            categories: note.tags,
            password : note.code 
        };

        // var metaWeblog = new MetaWeblog(address);


        if (blogId) {
            console.log('editPost ' + blogId + ' ' + this.username + ' ' + post.title);
            this.client.editPost(blogId, post, true)
                .then(blogId2 => {
                    // handle the blog information here


                    console.log('after EditPost ' + blogId + ' ' + this.username + ' ' + post.title + ' new id ' + blogId2);

                    if (_.isNil(blogId2)) {
                        return Promise.reject()
                    }

                    if (typeof blogId2 == 'string') {
                        success(blogId2);
                    } else {

                    }



                })
                .catch(error => {
                    console.error(error);
                    err(error);
                });

        } else {
            console.log('newPost ' + blogId + ' ' + this.username + ' ' + post.title);
            this.client.newPost(post, true)
                .then(blogId2 => {
                    // handle the blog information here

                    console.log('after newPost ' + blogId + ' ' + this.username + ' ' + post.title + ' new id ' + blogId2);
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


    loadUserBlogs(notes, success, err) {

        this.client.getRecentPosts(50)
            .then(blogs => {
                if (notes) {
                    for (var i = 0; i < blogs.length; i++) {
                        var blog = blogs[i];
                        console.log(blog.postid, blog.title, blog.categories);

                        if (notes) {
                            var note = findNoteByPostId(notes, this.address, blog.postid);
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



    // publish markdown &images to weblog 
    uploadMarkdownImages( storage , note, success, error) {


        var blog = findBlogInNote(note, this.address);

        // process local images ;
        var list = searchImages(note.content, IMAGE_REG);
        var ims = [];

        var tasks = [];
        if (list) {
            for (var i = 0; i < list.length; i++) {
                var url = list[i];
                try {

                    if (url.match(/^http/i)) {
                        continue;
                    }

                    // check if image has uploaded 
                    var im = checkImageCache(blog, url);
                    if (!im) {
                        var fullPath = null ;
                        var imageContent = null;

                        fullPath = replaceRealPath( url, storage.path );

                        // if (startWith(url,"\\:storage") || startWith(url,"/:storage")   || startWith(url,":storage") ) {

                        //     // lenght of "/:storage"
                        //     var name = this.trimStoragePrefix(url); // .substring(10);
                             
                        //     fullPath = path.join(storage.path, DESTINATION_FOLDER, name);

                        //     imageContent = fs.readFileSync(fullPath);

                             
                        // } else {
                        //     
                        //     fullPath = url;
                        // }

                        imageContent = fs.readFileSync(fullPath); 
                        if (imageContent) {
                            // if( !Buffer.isBuffer(imageContent))
                            if (imageContent.length > 0) {
                                imageContent = new Buffer(imageContent);
                            }
                        }



                        var image = {
                            name: fullPath,
                            //    type: 'image/png',
                            bits: imageContent // { base64 : base64file}

                        };
                        console.log('upload image ', fullPath , url );
                        // 
                        var p = this.client.newMediaObject(image);
                        tasks.push(p);
                        ims.push( {
                            path : fullPath , 
                            url  : url 
                        });

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

                            var sha1val = sha1File(file.path);

                            blog.imageUrls.push({
                                src: file.url,
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



};


function startWith(s , s1 ){
    return s.indexOf( s1 ) == 0 ;
}

/**
  find blog local record in notes 
*/
export
function findNoteByPostId(notes, address, postId) {
    for (var i = 0; i < notes.length; i++) {
        var note = notes[i];
        var blogz = findBlogInNote(note, address, postId);
        if (blogz) {
            if (blogz.blogId === postId)
                return note;
        }

    }

    return null;
}



function findBlog(blogs, address) {
    if (!blogs) return null;
    return blogs.find((blog) => blog.address === address);

}


function sha1File(file) {

    var shasum = crypto.createHash('sha1');
    var content = fs.readFileSync(file);
    shasum.update(content);
    return shasum.digest('hex');
}


function randName() {
    return crypto.randomBytes(10).toString('hex');
}


/**
 * trim 
 * @param  {[type]} file [description]
 * @return {[type]}      [description]
 */
function    trimStoragePrefix( file ){
    var name = null;
    if (startWith(file,"\\:storage") ) {
        name = file.substring(10);
    }else if (startWith(file,"/:storage") ) {
         name = file.substring(10);
     }else if (startWith(file,":storage") ) {
         name = file.substring(9);
    }else {
        name = file;
    }

    return name;
}

function isStroagePrefix(url){
    return  startWith(url,"\\:storage") || startWith(url,"/:storage")   || startWith(url,":storage")  ;
}
/**
 * 将 :storage 前缀的替换为 完全路径
 * @param  {[type]} url         [description]
 * @param  {[type]} storagePath [description]
 * @return {[type]}             [description]
 */
function replaceRealPath( url  , storagePath  ){
    var fullPath = null ;
     
    if (startWith(url,"\\:storage") || startWith(url,"/:storage")   || startWith(url,":storage") ) {

        // lenght of "/:storage"
        var name = trimStoragePrefix(url); // .substring(10);
        fullPath = path.join(storagePath, DESTINATION_FOLDER, name);

         
    } else {
        fullPath = url;
    }

    return fullPath;
}

/**
 * \be9ecfe3-6223-4be6-8470-af119e0aedc3\27bd0500.png =100x200
 * 
 * @param  {[type]} name [description]
 * @return {[type]}      [description]
 */


function getRealImagePath(name){
    //TODO: name 格式  zzzzzzzzzzzzzz =100x200 
    
    let regex = /(\S*)(\s+=\d+x\d+$)?/gi
    let m;
    let array = [];
    while ((m = regex.exec(name)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }
        return m[1];
        // var fx = m[0];
        // if (fx) {
        //     var name = fx.substring(1, fx.length - 1);
        //     // console.log( 'm0  ' + m[0] ); 
        //     // console.log( 'm1  ' + m[1] ); 
        //     // console.log( 'm2  ' + m[2] ); 
        //     // console.log( '');
        //     if (m[2])
        //         array.push(m[2]);
        // }
    }
    return name ;
    // return array;
}


// 检查 Blog Image cache中 有没有缓存的数据
export 
function checkImageCache(blog, image, name) {
    if (!blog.imageUrls || blog.imageUrls.length == 0)
        return null;

    if (!name)
        name = 'src';

    image = getRealImagePath(image);


    for (var i = 0; i < blog.imageUrls.length; i++) {
        var im = blog.imageUrls[i];
        if (im[name] == image) {

            if (name === 'src') {
                if (im.sha1) {


                    if(!isStroagePrefix( im.src )){
                        var csha1 = sha1File(im.src);
                        if (csha1 == im.sha1)
                            return im;
                        else {
                            blog.imageUrls.splice(i, 1); /// [i];
                            return null;
                        }
                    }else {
                        return im;
                    }

                     
                }
            }
            return im;
        }
    }
    return null;
}

// get current action blog config ;
export

function findBlogInNote(note, addr) {
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

export

function removeBlogInNote(note, addr) {
    var address = addr;

    if (!addr)
        return false;

    if (!Array.isArray(note.blog))
        return false;

    for (var i = 0; i < note.blog.length; i++) {
        if (note.blog[i].address === addr) {
            note.blog.splice(i, 1);
            return true;
        }
    }
    return false;

}


// 
export

function replaceContentUrl(base, content, localBlog, cb) {

    // https 

    if (content && localBlog && localBlog.imageUrls) {
        // 将远程服务器图片替换为本地 图片，如果有的话
        let exportedData = content.replace(IMAGE_REG, (match, dstFilename, srcFilename) => {
            var im = checkImageCache(localBlog, srcFilename, 'url');
            if (im) {
                srcFilename = im.src;
            } else {

                if (srcFilename.match(/^http/i)) {



                    const imageDir = path.join(base, 'images')
                    if (!fs.existsSync(imageDir)) fs.mkdirSync(imageDir)


                    var request = http.get(srcFilename, function(response) {

                        const imageExt = path.extname(srcFilename);
                        var localFile = path.join(imageDir, 'cache-' + randName() + imageExt);
                        var file = fs.createWriteStream(localFile);

                        console.log('download file ' + srcFilename + ' save to ' + localFile);

                        response.pipe(file);
                        file.on('finish', function() {
                            file.close(function() {
                                var csha1 = sha1File(localFile);
                                localBlog.imageUrls.push({
                                    src: localFile,
                                    sha1: csha1,
                                    url: srcFilename
                                });

                                if (cb) {
                                    cb();
                                }

                            }); // close() is async, call cb after close completes.

                        });

                    }).on('error', function(err) { // Handle errors
                        console.log(err)
                    });
                }

            }


            return `![${dstFilename}](${srcFilename})`;

        });
        return exportedData;
    } else {
        return content;
    }


}

// exports = module.exports = MetaWeblogClient;
// 
export

function searchImages(content, regex) {
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

export

function trimFirstLine(content) {
    // 
    var outs = [];
    var find = false;
    var lines = content.trim().split('\n');
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (!find) {
            line = line.trim();
            if (line.length > 0) {
                find = true;
            }
        } else {
            outs.push(line);
        }
    }

    return outs.join('\n');
}



export

function hasTitle(content, title) {
    // 
    // get first line ;
    var line = getFirstLine(content);
    if (line) {
        var m = testTitle(line, title);
        return m;
    }

    return false;

}




export

function getFirstLine(content) {
    // 
    var lines = content.trim().split('\n');
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        line = line.trim();
        if (line.length > 0) {
            return line;
        }
    }

    return null;
}

// export
//     function testTitle2( line , title ){
//         var regex = new RegExp("^#+\\s+" + title +"\\s*$") ; // /^\s*#+\s+(.*)\s*/i;
//         // var patt1=new RegExp("e");
//         // 
//         // 第一行 
//         var m = regex.exec(line) ;   
//         if(m)
//             return true;
//         else 
//             return false;


// }


// test if title exist in line  
function testTitle(line, title) {

    if (!line) return false;
    if (!title) return false;

    line = line.trim();

    let rml = line.replace(/^\s*#+\s+/, '');
    return rml === title || rml.indexOf(title) >= 0;
}


export default {
    replaceContentUrl,
    checkImageCache,
    findBlogInNote,
    removeBlogInNote,
    MetaWeblogClient
}