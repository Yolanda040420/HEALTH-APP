const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;
const postsCollection = db.collection('forum_posts');
const reactionsCollection = db.collection('forum_post_reactions');

exports.main = async (event, context) => {
  const { postId, action, userId } = event;  

  if (!postId || !action) {
    return {
      code: 400,
      message: 'postId and action are required'
    };
  }

  if (!userId) {
    return {
      code: 401,
      message: 'userId is required'
    };
  }

  let type = '';
  let delta = 0;
  let field = '';

  switch (action) {
    case 'like':
      type = 'like';
      delta = 1;
      field = 'likeCount';
      break;
    case 'unlike':
      type = 'like';
      delta = -1;
      field = 'likeCount';
      break;
    case 'fire':
      type = 'fire';
      delta = 1;
      field = 'fireCount';
      break;
    case 'unfire':
      type = 'fire';
      delta = -1;
      field = 'fireCount';
      break;
    default:
      return {
        code: 400,
        message: 'invalid action'
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

    const reactionRes = await reactionsCollection
      .where({
        postId,
        userId,
        type
      })
      .limit(1)
      .get();

    const hasReaction = reactionRes.data && reactionRes.data.length > 0;

    if (delta > 0) {
      // like / fire
      if (!hasReaction) {
        await reactionsCollection.add({
          data: {
            postId,
            userId,
            type, // 'like' | 'fire'
            createdAt: now
          }
        });

        await postsCollection.doc(postId).update({
          data: {
            [field]: _.inc(1),
            updatedAt: now
          }
        });
      }
    } else {
      if (hasReaction) {
        await reactionsCollection.doc(reactionRes.data[0]._id).remove();

        await postsCollection.doc(postId).update({
          data: {
            [field]: _.inc(-1),
            updatedAt: now
          }
        });
      }
    }

    const updatedPost = await postsCollection.doc(postId).get();

    return {
      code: 0,
      message: 'ok',
      data: {
        postId,
        likeCount: updatedPost.data.likeCount || 0,
        fireCount: updatedPost.data.fireCount || 0,
        type,
        action
      }
    };
  } catch (err) {
    console.error('forumLikePost error', err);
    return {
      code: 500,
      message: 'internal error',
      error: err
    };
  }
};
