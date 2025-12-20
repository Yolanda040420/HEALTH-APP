const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const posts = db.collection('forum_posts');

exports.main = async (event, context) => {
  const { page = 0, pageSize = 10, tag } = event;

  const skip = page * pageSize;

  let query = posts;

  if (tag) {
    query = query.where({
      tags: db.command.all([tag])
    });
  }

  try {
    // total count (for pagination)
    const countRes = await query.count();
    const total = countRes.total;

    // list
    const listRes = await query
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();

    return {
      code: 200,
      message: 'success',
      data: {
        total,
        page,
        pageSize,
        list: listRes.data
      }
    };
  } catch (err) {
    console.error('forumGetPosts error:', err);
    return {
      code: 500,
      message: 'internal error',
      error: err
    };
  }
};
