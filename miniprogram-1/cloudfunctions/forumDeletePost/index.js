const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const postsCollection = db.collection('forum_posts');
const commentsCollection = db.collection('forum_comments');

exports.main = async (event, context) => {
  const { postId, userId } = event;  

  if (!postId) {
    return {
      code: 400,
      message: 'postId is required'
    };
  }

  if (!userId) {
    return {
      code: 401,
      message: 'userId is required'
    };
  }

  try {
    const postRes = await postsCollection.doc(postId).get();
    const post = postRes.data;
    if (!post) {
      return {
        code: 404,
        message: 'post not found'
      };
    }

    if (post.userId !== userId) {
      return {
        code: 403,
        message: 'no permission to delete this post'
      };
    }

    await postsCollection.doc(postId).remove();

    await commentsCollection.where({ postId }).remove();

    return {
      code: 0,
      message: 'ok'
    };
  } catch (err) {
    console.error('forumDeletePost error', err);
    return {
      code: 500,
      message: 'internal error',
      error: err
    };
  }
};
