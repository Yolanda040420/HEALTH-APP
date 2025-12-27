// cloudfunctions/getUserProfile/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const users = db.collection('users');

exports.main = async (event, context) => {
  const { userId } = event;

  if (!userId) {
    return { code: 400, message: 'userId is required' };
  }

  try {
    const res = await users.doc(userId).get();
    const user = res.data;

    if (!user) {
      return { code: 404, message: 'user not found' };
    }

    return {
      code: 200,
      message: 'success',
      data: {
        name: user.name || '',
        avatarUrl: user.avatarUrl || '',     
        sex: user.sex || 'male',
        age: user.age ?? null,
        weight: user.weight ?? null,
        height: user.height ?? null,
        targetIntake: user.targetIntake ?? 2000,
        fitnessGoal: user.fitnessGoal || 'fat_loss'
      }
    };
  } catch (e) {
    return { code: 500, message: 'db error', error: e };
  }
};