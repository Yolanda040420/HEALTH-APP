const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const users = db.collection('users')

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return { code: 401, message: 'not logged in' }
  }

  try {
    const res = await users.where({ openid }).limit(1).get()
    const user = res.data[0]

    if (!user) {
      return {
        code: 200,
        message: 'no profile yet',
        data: {
          name: '',
          sex: 'male',
          age: null,
          weight: null,
          height: null,
          targetIntake: 2000,
          fitnessGoal: 'fat_loss'
        }
      }
    }

    return {
      code: 200,
      message: 'success',
      data: {
        name: user.name || '',
        sex: user.sex || 'male',
        age: user.age || null,
        weight: user.weight || null,
        height: user.height || null,
        targetIntake: user.targetIntake || 2000,
        fitnessGoal: user.fitnessGoal || 'fat_loss'
      }
    }
  } catch (e) {
    console.error(e)
    return {
      code: 500,
      message: 'db error',
      error: e.toString()
    }
  }
}
