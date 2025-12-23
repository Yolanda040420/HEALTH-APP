const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;
const postsCollection = db.collection('forum_posts');
const commentsCollection = db.collection('forum_comments');

exports.main = async (event, context) => {
  const {
    postId,
    content,
    images = [],
    parentId = null,

    userId,
    username,
    name,
    avatar    
  } = event;

  if (!postId || !content || !content.trim()) {
    return {
      code: 400,
      message: 'postId and content are required'
    };
  }

  if (!userId || !username) {
    return {
      code: 401,
      message: 'userId and username are required'
    };
  }

  try {
    const postRes = await postsCollection.doc(postId).get();
    if (!postRes.data) {
      return {
        code: 404,
        message: 'post not found'
      };
    }

    const now = new Date();

    const addRes = await commentsCollection.add({
      data: {
        postId,
        userId,                    
        username,
        name: name || '',
        avatar: avatar || '',

        content: content.trim(),
        images,
        parentId,
        likeCount: 0,
        createdAt: now,
        updatedAt: now
      }
    });

    await postsCollection.doc(postId).update({
      data: {
        commentCount: _.inc(1),
        updatedAt: now
      }
    });

    return {
      code: 0,
      message: 'ok',
      data: {
        commentId: addRes._id
      }
    };
  } catch (err) {
    console.error('forumAddComment error', err);
    return {
      code: 500,
      message: 'internal error',
      error: err
    };
  }
};
