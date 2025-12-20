const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const postsCollection = db.collection('forum_posts');

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { OPENID } = wxContext;

  const {
    postId,
    title,
    content,
    images,
    tags
  } = event;

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

    // 2. Permission check: only owner can edit
    if (post.userId !== OPENID) {
      return {
        code: 403,
        message: 'no permission to edit this post'
      };
    }

    // 3. Build update data (only update provided fields)
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (images !== undefined) updateData.images = images;
    if (tags !== undefined) updateData.tags = tags;
    updateData.updatedAt = new Date();

    if (Object.keys(updateData).length === 1) {
      return {
        code: 400,
        message: 'no fields to update'
      };
    }

    await postsCollection.doc(postId).update({
      data: updateData
    });

    return {
      code: 0,
      message: 'ok'
    };
  } catch (err) {
    console.error('forumEditPost error', err);
    return {
      code: 500,
      message: 'internal error',
      error: err
    };
  }
};
