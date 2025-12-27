// cloudfunctions/forumGetPosts/index.js
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

const posts = db.collection('forum_posts');
const users = db.collection('users');

// 内部小工具：按 userIds 批量拉 users，避免单个查询
async function fetchUsersByIds(userIds) {
  const ids = Array.from(
    new Set((userIds || []).map(x => String(x || '').trim()).filter(Boolean))
  );
  if (!ids.length) return {};

  const CHUNK = 10; // 保险起见分片（in 条件大小在不同环境可能有限制）
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
  const { page = 0, pageSize = 10, tag } = event || {};
  const skip = Number(page) * Number(pageSize);

  let query = posts;

  if (tag) {
    query = query.where({
      tags: db.command.all([tag])
    });
  }

  try {
    // total count
    const countRes = await query.count();
    const total = countRes.total || 0;

    // list
    const listRes = await query
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(Number(pageSize))
      .get();

    const list = listRes.data || [];

    // 批量查 users
    const userIds = list.map(p => p.userId).filter(Boolean);
    const userMap = await fetchUsersByIds(userIds);

    // 拼接 authorName / authorAvatar / authorUsername
    const merged = list.map(p => {
      const u = userMap[String(p.userId || '')];
      return {
        ...p,
        authorUsername: u ? (u.username || '') : '',
        authorName: pickName(u),
        authorAvatar: pickAvatar(u)
      };
    });

    return {
      code: 200,
      message: 'success',
      data: {
        total,
        page,
        pageSize,
        list: merged
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