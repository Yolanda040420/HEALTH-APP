const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const diet = db.collection('diet_records');

exports.main = async (event, context) => {
  const { recordId, foodName, kcal, mealType } = event;

  // Basic check
  if (!recordId) {
    return {
      code: 400,
      message: "recordId is required"
    };
  }

  // Build update object dynamically
  const dataToUpdate = {};
  if (foodName !== undefined) dataToUpdate.foodName = foodName;
  if (kcal !== undefined) dataToUpdate.kcal = Number(kcal) || 0;
  if (mealType !== undefined) dataToUpdate.mealType = mealType;
  dataToUpdate.updatedAt = new Date();

  try {
    const res = await diet.doc(recordId).update({
      data: dataToUpdate
    });

    return {
      code: 200,
      message: "Meal updated successfully",
      data: res
    };

  } catch (err) {
    console.error('editMeal error:', err);
    return {
      code: 500,
      message: "Database error",
      error: err
    };
  }
};
