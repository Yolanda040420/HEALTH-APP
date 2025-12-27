const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const exercises = db.collection('exercise_records');

exports.main = async (event, context) => {
  const { userId, date, name, duration, kcal } = event;

  if (!userId || !date || !name || !kcal) {
    return { code: 400, message: "Missing required fields" };
  }

  try {
    await exercises.add({
      data: {
        userId,
        date,         
        name,          
        duration,  
        kcal, 
        createdAt: new Date()
      }
    });

    return { code: 200, message: "Exercise added successfully" };
  } catch (e) {
    return { code: 500, message: "Database error", error: e };
  }
};
