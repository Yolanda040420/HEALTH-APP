const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;
const dishesCol = db.collection('dish');

exports.main = async (event, context) => {
  // frontend can pass these (all optional):
  // canteenId: 'taoli' | 'zijing' | ...
  // mealType: 'breakfast' | 'lunch' | 'dinner'
  // maxPrice: number (单道菜最高价)
  // tag: string (如 '高蛋白')
  const { canteenId, mealType, maxPrice, tag } = event || {};

  const where = {};

  if (canteenId) {
    where.canteenId = canteenId;
  }
  if (mealType) {
    where.mealType = mealType;
  }
  if (maxPrice) {
    where.price = _.lte(maxPrice);
  }
  if (tag) {
    // tag 在 tags 数组中
    where.tags = _.in([tag]);
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
    console.error('getDishes error:', err);
    return {
      code: 500,
      message: 'Database error',
      error: err
    };
  }
};
