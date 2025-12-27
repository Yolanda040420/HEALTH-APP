const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const exercises = db.collection('exercise_records');

exports.main = async (event, context) => {
  const { id, name, duration, kcal } = event;

  if (!id) {
    return { code: 400, message: "Missing exercise id" };
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (duration !== undefined) updateData.duration = duration;
  if (kcal !== undefined) updateData.kcal = kcal;
  updateData.updatedAt = new Date();

  try {
    await exercises.doc(id).update({
      data: updateData
    });

    return { code: 200, message: "Exercise updated successfully" };
  } catch (err) {
    return {
      code: 500,
      message: "Database error",
      error: err
    };
  }
};
