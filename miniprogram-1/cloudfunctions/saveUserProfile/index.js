// cloudfunctions/saveUserProfile/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const users = db.collection('users');

exports.main = async (event, context) => {
  const {
    userId,
    name,
    avatarUrl,          // ✅新增
    sex,
    age,
    weight,
    height,
    targetIntake,
    fitnessGoal
  } = event;

  if (!userId) return { code: 400, message: 'userId is required' };
  if (!name) return { code: 400, message: 'name is required' };

  const profile = {
    name,
    sex,
    age,
    weight,
    height,
    targetIntake,
    fitnessGoal,
    updatedAt: db.serverDate()
  };

  if (typeof avatarUrl === 'string') {
    profile.avatarUrl = avatarUrl;
  }

  try {
    await users.doc(userId).update({ data: profile });
    return { code: 200, message: 'save profile success' };
  } catch (e) {
    return { code: 500, message: 'db error', error: e };
  }
};