const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const postsCollection = db.collection('forum_posts');
const commentsCollection = db.collection('forum_comments');

exports.main = async (event, context) => {
  const { postId, commentPage = 1, pageSize = 20 } = event;

  if (!postId) {
    return {
      code: 400,
      message: 'postId is required'
    };
  }

  const page = commentPage < 1 ? 1 : commentPage;
  const size = pageSize > 50 ? 50 : pageSize; // 防止一次拉太多
  const skip = (page - 1) * size;

  try {
    // 1. Get post
    const postRes = await postsCollection.doc(postId).get();
    if (!postRes.data) {
      return {
        code: 404,
        message: 'post not found'
      };
    }

    // 2. Get comments (paged)
    const commentsRes = await commentsCollection
      .where({ postId })
      .orderBy('createdAt', 'asc')
      .skip(skip)
      .limit(size)
      .get();

    // 3. Total comment count
    const countRes = await commentsCollection
      .where({ postId })
      .count();

    return {
      code: 0,
      message: 'ok',
      data: {
        post: postRes.data,
        comments: commentsRes.data || [],
        commentTotal: countRes.total || 0,
        commentPage: page,
        pageSize: size
      }
    };
  } catch (err) {
    console.error('forumGetPostDetail error', err);
    return {
      code: 500,
      message: 'internal error',
      error: err
    };
  }
};
