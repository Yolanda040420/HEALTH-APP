// cloudfunctions/forumCreatePost/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const posts = db.collection('forum_posts');

exports.main = async (event) => {
  const { title, content, tags, images, userId } = event || {};

  if (!title || !content) return { code: 400, message: 'title and content are required' };
  if (!userId) return { code: 401, message: 'userId is required' };

  const imageList = Array.isArray(images) ? images.filter(i => typeof i === 'string' && i.trim()) : [];

  try {
    const now = db.serverDate();
    const res = await posts.add({
      data: {
        title,
        content,
        tags: Array.isArray(tags) ? tags : [],
        images: imageList,
        userId,
        createdAt: now,
        updatedAt: now,
        likeCount: 0,
        fireCount: 0,
        commentCount: 0
      }
    });

    return { code: 200, message: 'success', data: { postId: res._id } };
  } catch (err) {
    console.error('forumCreatePost error:', err);
    return { code: 500, message: 'internal error', error: err };
  }
};