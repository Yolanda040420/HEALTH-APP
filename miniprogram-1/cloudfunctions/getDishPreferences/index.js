// cloudfunctions/getDishPreferences/index.js
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const prefs = db.collection('user_dish_preferences');

exports.main = async (event, context) => {
  const { userId } = event || {};
  const uid = String(userId || '').trim();

  if (!uid) {
    return { code: 400, message: 'Missing userId' };
  }

  try {
    const res = await prefs.where({ userId: uid }).get();
    const list = res.data || [];

    // 返回带 name（用对象数组，前端更好用）
    const favorites = [];
    const blocked = [];

    list.forEach(item => {
      const obj = {
        dishId: item.dishId,
        dishName: item.dishName || '' // 兼容历史数据
      };

      if (item.type === 'favorite') favorites.push(obj);
      else if (item.type === 'blocked') blocked.push(obj);
    });

    return {
      code: 200,
      message: 'success',
      data: {
        favorites, // [{dishId, dishName}]
        blocked    // [{dishId, dishName}]
      }
    };
  } catch (err) {
    console.error('getDishPreferences error:', err);
    return {
      code: 500,
      message: 'internal error',
      error: err
    };
  }
};