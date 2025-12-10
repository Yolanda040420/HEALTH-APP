const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const exercises = db.collection('exercise_records');

exports.main = async (event, context) => {
  const { id } = event;

  if (!id) {
    return { code: 400, message: "Missing exercise id" };
  }

  try {
    await exercises.doc(id).remove();

    return { code: 200, message: "Exercise deleted successfully" };
  } catch (err) {
    return {
      code: 500,
      message: "Database error",
      error: err
    };
  }
};
