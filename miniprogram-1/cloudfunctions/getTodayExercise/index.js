const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const exercises = db.collection('exercise_records');

exports.main = async (event, context) => {
  const { userId } = event;

  if (!userId) {
    return { code: 400, message: "Missing userId" };
  }

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  try {
    const res = await exercises.where({
      userId,
      date: todayStr
    }).get();

    const totalBurned = res.data.reduce((sum, item) => sum + (item.kcal || 0), 0);

    return {
      code: 200,
      message: "success",
      data: {
        records: res.data,
        totalBurned
      }
    };
  } catch (err) {
    return {
      code: 500,
      message: "Database error",
      error: err
    };
  }
};
