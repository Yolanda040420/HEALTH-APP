const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const users = db.collection('users')

exports.main = async (event, context) => {
  const { username, password } = event || {}

  if (!username || !password) {
    return {
      code: 400,
      message: 'username and password are required'
    }
  }

  try {
    const res = await users.where({ username, password }).limit(1).get()
    const user = res.data[0]

    if (!user) {
      return {
        code: 401,
        message: 'invalid username or password'
      }
    }

    return {
      code: 200,
      message: 'login success',
      data: {
        userId: user._id,                 
        username: user.username,
        name: user.name || '',
        sex: user.sex || '',              
        age: user.age ?? null,
        weight: user.weight ?? null,      
        height: user.height ?? null,      
        targetIntake: user.targetIntake ?? null, 
        fitnessGoal: user.fitnessGoal || ''      // "fat_loss" | "muscle_gain" | ...
      }
    }
  } catch (err) {
    console.error('login error', err)
    return {
      code: 500,
      message: 'database error',
      error: err
    }
  }
}
