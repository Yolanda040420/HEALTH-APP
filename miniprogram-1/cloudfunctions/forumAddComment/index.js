const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;
const postsCollection = db.collection('forum_posts');
const commentsCollection = db.collection('forum_comments');

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { OPENID } = wxContext;

  const {
    postId,
    content,
    images = [],
    parentId = null  
  } = event;

  if (!postId || !content || !content.trim()) {
    return {
      code: 400,
      message: 'postId and content are required'
    };
  }

  try {
    // 1. make sure post exists
    const postRes = await postsCollection.doc(postId).get();
    if (!postRes.data) {
      return {
        code: 404,
        message: 'post not found'
      };
    }

    const now = new Date();

    // 2. add comment
    const addRes = await commentsCollection.add({
      data: {
        postId,
        userId: OPENID,
        content: content.trim(),
        images,
        parentId,
        likeCount: 0,
        createdAt: now,
        updatedAt: now
      }
    });

    // 3. increase commentCount on post
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
