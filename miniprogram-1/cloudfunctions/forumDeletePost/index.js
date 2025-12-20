const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const postsCollection = db.collection('forum_posts');
const commentsCollection = db.collection('forum_comments');

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { OPENID } = wxContext;
  const { postId } = event;

  if (!postId) {
    return {
      code: 400,
      message: 'postId is required'
    };
  }

  try {
    // 1. Load post
    const postRes = await postsCollection.doc(postId).get();
    const post = postRes.data;
    if (!post) {
      return {
        code: 404,
        message: 'post not found'
      };
    }

    // 2. Permission check: only owner can delete
    if (post.userId !== OPENID) {
      return {
        code: 403,
        message: 'no permission to delete this post'
      };
    }

    // 3. Delete post
    await postsCollection.doc(postId).remove();

    // 4. Delete its comments
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
