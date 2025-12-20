const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;
const postsCollection = db.collection('forum_posts');
const reactionsCollection = db.collection('forum_post_reactions');

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { OPENID } = wxContext;

  const { postId, action } = event;

  if (!postId || !action) {
    return {
      code: 400,
      message: 'postId and action are required'
    };
  }

  // map action -> type + delta
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
    // 1. check post exists
    const postRes = await postsCollection.doc(postId).get();
    if (!postRes.data) {
      return {
        code: 404,
        message: 'post not found'
      };
    }

    const now = new Date();

    // 2. check existing reaction record
    const reactionRes = await reactionsCollection
      .where({
        postId,
        userId: OPENID,
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
            userId: OPENID,
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
      // unlike / unfire
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

    // optional: return latest counters
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
