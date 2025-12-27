// cloudfunctions/forumGetPostDetail/index.js
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

const postsCollection = db.collection('forum_posts');
const commentsCollection = db.collection('forum_comments');
const users = db.collection('users');

async function fetchUsersByIds(userIds) {
  const ids = Array.from(
    new Set((userIds || []).map(x => String(x || '').trim()).filter(Boolean))
  );
  if (!ids.length) return {};

  const CHUNK = 10;
  const map = {};

  for (let i = 0; i < ids.length; i += CHUNK) {
    const part = ids.slice(i, i + CHUNK);
    const res = await users.where({ _id: _.in(part) }).get();
    (res.data || []).forEach(u => {
      map[String(u._id)] = u;
    });
  }
  return map;
}

function pickName(u) {
  if (!u) return '匿名用户';
  return (u.name && String(u.name).trim()) || (u.username && String(u.username).trim()) || '匿名用户';
}

function pickAvatar(u) {
  if (!u) return '/images/tabbar/mine.png';
  return (u.avatarUrl && String(u.avatarUrl).trim()) || '/images/tabbar/mine.png';
}

exports.main = async (event, context) => {
  const { postId, commentPage = 1, pageSize = 20 } = event || {};

  if (!postId) {
    return { code: 400, message: 'postId is required' };
  }

  const page = commentPage < 1 ? 1 : Number(commentPage);
  const size = Number(pageSize) > 50 ? 50 : Number(pageSize);
  const skip = (page - 1) * size;

  try {
    // 1) post
    const postRes = await postsCollection.doc(postId).get();
    if (!postRes.data) {
      return { code: 404, message: 'post not found' };
    }
    const post = postRes.data;

    // 2) comments (paged)
    const commentsRes = await commentsCollection
      .where({ postId })
      .orderBy('createdAt', 'asc')
      .skip(skip)
      .limit(size)
      .get();

    const comments = commentsRes.data || [];

    // 3) total comment count
    const countRes = await commentsCollection.where({ postId }).count();
    const commentTotal = countRes.total || 0;

    // 4) 批量查 users（post作者 + 本页评论作者）
    const userIds = []
      .concat([post.userId])
      .concat(comments.map(c => c.userId))
      .filter(Boolean);

    const userMap = await fetchUsersByIds(userIds);

    // 5) 拼接作者信息到 post
    const postUser = userMap[String(post.userId || '')];
    const mergedPost = {
      ...post,
      authorUsername: postUser ? (postUser.username || '') : '',
      authorName: pickName(postUser),
      authorAvatar: pickAvatar(postUser)
    };

    // 6) 拼接作者信息到 comments（给前端用：name/avatar/username）
    const mergedComments = comments.map(c => {
      const u = userMap[String(c.userId || '')];
      return {
        ...c,
        username: u ? (u.username || '') : '',
        name: pickName(u),
        avatar: pickAvatar(u)
      };
    });

    return {
      code: 0,
      message: 'ok',
      data: {
        post: mergedPost,
        comments: mergedComments,
        commentTotal,
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