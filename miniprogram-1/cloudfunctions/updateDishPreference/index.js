// cloudfunctions/updateDishPreference/index.js
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const prefs = db.collection('user_dish_preferences');

exports.main = async (event, context) => {
  let { userId, dishId, dishName, type, action } = event || {};

  userId = String(userId || '').trim();
  dishId = String(dishId || '').trim();
  dishName = String(dishName || '').trim();

  if (!userId) {
    return { code: 400, message: 'Missing userId' };
  }

  if (!dishId) {
    return { code: 400, message: 'Missing dishId' };
  }

  // 你要求：update 时一定同时提供 id 和 name
  if (!dishName) {
    return { code: 400, message: 'Missing dishName' };
  }

  if (!['favorite', 'blocked'].includes(type) || !['add', 'remove'].includes(action)) {
    return {
      code: 400,
      message: 'invalid params',
      data: { userId, dishId, dishName, type, action }
    };
  }

  try {
    const now = db.serverDate();

    if (action === 'add') {
      // 只要已存在同(userId, dishId, type)，就更新 dishName / updatedAt；不存在就新增
      const existing = await prefs.where({
        userId,
        dishId,
        type
      }).limit(1).get();

      if (existing.data && existing.data.length) {
        const docId = existing.data[0]._id;
        await prefs.doc(docId).update({
          data: {
            dishName,       // 同步更新名称（防止菜名变更）
            updatedAt: now
          }
        });
      } else {
        await prefs.add({
          data: {
            userId,
            dishId,
            dishName,
            type,
            createdAt: now,
            updatedAt: now
          }
        });
      }

      return {
        code: 200,
        message: 'success',
        data: { dishId, dishName, type, isActive: true }
      };
    }

    // action === 'remove'
    await prefs.where({
      userId,
      dishId,
      type
    }).remove();

    return {
      code: 200,
      message: 'success',
      data: { dishId, dishName, type, isActive: false }
    };
  } catch (err) {
    console.error('updateDishPreference error:', err);
    return {
      code: 500,
      message: 'internal error',
      error: err
    };
  }
};