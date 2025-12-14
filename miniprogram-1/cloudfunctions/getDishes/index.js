const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const dishesCol = db.collection('dishes');

exports.main = async (event, context) => {
  const { canteenId, mealType } = event;

  const where = {};
  if (canteenId) {
    where.canteenId = canteenId;
  }
  if (mealType) {
    // "breakfast" | "lunch" | "dinner"
    where.mealType = mealType;
  }

  try {
    const res = await dishesCol.where(where).get();

    return {
      code: 200,
      message: 'success',
      data: {
        count: res.data.length,
        dishes: res.data
      }
    };
  } catch (err) {
    console.error('getDishes error', err);
    return {
      code: 500,
      message: 'Database error',
      error: err
    };
  }
};
