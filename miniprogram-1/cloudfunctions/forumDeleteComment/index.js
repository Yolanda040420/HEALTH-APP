const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;
const postsCollection = db.collection('forum_posts');
const commentsCollection = db.collection('forum_comments');

exports.main = async (event, context) => {
  const { commentId, userId } = event;   

  if (!commentId) {
    return {
      code: 400,
      message: 'commentId is required'
    };
  }

  if (!userId) {
    return {
      code: 401,
      message: 'userId is required'
    };
  }

  try {
    const commentRes = await commentsCollection.doc(commentId).get();
    const comment = commentRes.data;
    if (!comment) {
      return {
        code: 404,
        message: 'comment not found'
      };
    }

    const postRes = await postsCollection.doc(comment.postId).get();
    const post = postRes.data;

    const isCommentOwner = comment.userId === userId;
    const isPostOwner = post && post.userId === userId;

    if (!isCommentOwner && !isPostOwner) {
      return {
        code: 403,
        message: 'no permission to delete this comment'
      };
    }

    await commentsCollection.doc(commentId).remove();

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
