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

  const { commentId } = event;

  if (!commentId) {
    return {
      code: 400,
      message: 'commentId is required'
    };
  }

  try {
    // 1. load comment
    const commentRes = await commentsCollection.doc(commentId).get();
    const comment = commentRes.data;
    if (!comment) {
      return {
        code: 404,
        message: 'comment not found'
      };
    }

    // 2. load post (to check post owner)
    const postRes = await postsCollection.doc(comment.postId).get();
    const post = postRes.data;

    // 3. permission check: comment owner OR post owner
    const isCommentOwner = comment.userId === OPENID;
    const isPostOwner = post && post.userId === OPENID;

    if (!isCommentOwner && !isPostOwner) {
      return {
        code: 403,
        message: 'no permission to delete this comment'
      };
    }

    // 4. delete comment
    await commentsCollection.doc(commentId).remove();

    // 5. decrease commentCount on post
    if (post) {
      await postsCollection.doc(comment.postId).update({
        data: {
          commentCount: _.inc(-1),
          updatedAt: new Date()
        }
      });
    }

    return {
      code: 0,
      message: 'ok'
    };
  } catch (err) {
    console.error('forumDeleteComment error', err);
    return {
      code: 500,
      message: 'internal error',
      error: err
    };
  }
};
