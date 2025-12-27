const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const { userId, date, mealType, foodName, kcal } = event;

  try {
    await db.collection('diet_records').add({
      data: {
        userId,
        date,
        mealType, 
        foodName,
        kcal,
        createdAt: new Date()
      }
    });

    return { code: 200, message: "Meal added successfully" };

  } catch (e) {
    return { code: 500, message: "Database error", error: e };
  }
};
