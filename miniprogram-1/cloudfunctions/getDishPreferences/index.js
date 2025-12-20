const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const prefs = db.collection('user_dish_preferences');

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    const res = await prefs.where({
      openid
    }).get();

    const favoriteIds = [];
    const blockedIds = [];

    res.data.forEach(item => {
      if (item.type === 'favorite') {
        favoriteIds.push(item.dishId);
      } else if (item.type === 'blocked') {
        blockedIds.push(item.dishId);
      }
    });

    return {
      code: 200,
      message: 'success',
      data: {
        favorites: favoriteIds,
        blocked: blockedIds
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
