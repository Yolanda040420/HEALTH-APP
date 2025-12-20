const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const posts = db.collection('forum_posts');

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // add `images` here
  const { title, content, tags, images, authorNickname, authorAvatar } = event;

  if (!title || !content) {
    return {
      code: 400,
      message: 'title and content are required'
    };
  }

  // normalize images: must be array of strings (fileIDs)
  const imageList = Array.isArray(images)
    ? images.filter(i => typeof i === 'string' && i.trim() !== '')
    : [];

  try {
    const now = db.serverDate();
    const res = await posts.add({
      data: {
        title,
        content,                                   
        tags: Array.isArray(tags) ? tags : [],
        images: imageList,                        
        authorOpenid: openid,
        authorNickname: authorNickname || '',
        authorAvatar: authorAvatar || '',
        createdAt: now,
        updatedAt: now,
        likeCount: 0,
        fireCount: 0,                              
        commentCount: 0
      }
    });

    return {
      code: 200,
      message: 'success',
      data: {
        postId: res._id
      }
    };
  } catch (err) {
    console.error('forumCreatePost error:', err);
    return {
      code: 500,
      message: 'internal error',
      error: err
    };
  }
};
