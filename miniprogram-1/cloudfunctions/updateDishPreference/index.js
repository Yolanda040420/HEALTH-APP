const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const prefs = db.collection('user_dish_preferences');

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  let { dishId, type, action } = event;

  dishId = String(dishId || '').trim();

  if (!dishId || !['favorite', 'blocked'].includes(type) || !['add', 'remove'].includes(action)) {
    return {
      code: 400,
      message: 'invalid params',
      data: { dishId, type, action }
    };
  }

  try {
    const now = db.serverDate();

    if (action === 'add') {
      const existing = await prefs.where({
        openid,
        dishId,
        type
      }).get();

      if (!existing.data.length) {
        await prefs.add({
          data: {
            openid,
            dishId,
            type,
            createdAt: now
          }
        });
      }

      return {
        code: 200,
        message: 'success',
        data: {
          dishId,
          type,
          isActive: true
        }
      };
    } else {
      // action === 'remove'
      await prefs.where({
        openid,
        dishId,
        type
      }).remove();

      return {
        code: 200,
        message: 'success',
        data: {
          dishId,
          type,
          isActive: false
        }
      };
    }
  } catch (err) {
    console.error('updateDishPreference error:', err);
    return {
      code: 500,
      message: 'internal error',
      error: err
    };
  }
};
