const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const users = db.collection('users');

exports.main = async (event, context) => {
  const { username, password } = event;

  // 1. Check if username exists
  const check = await users.where({ username }).get();
  if (check.data.length > 0) {
    return {
      code: 400,
      message: "Username already exists"
    };
  }

  // 2. Insert new user
  await users.add({
    data: {
      username,
      password,
      createdAt: new Date()
    }
  });

  return {
    code: 200,
    message: "Register success"
  };
};
