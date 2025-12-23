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

  const {
    name,
    sex,          
    age,
    weight,
    height,
    targetIntake,
    fitnessGoal
  } = event

  if (!name) {
    return { code: 400, message: 'name is required' }
  }

  const profile = {
    name,
    sex,
    age,
    weight,
    height,
    targetIntake,
    fitnessGoal,
    updatedAt: db.serverDate()
  }

  try {
    const res = await users.where({ openid }).limit(1).get()

    if (!res.data.length) {
      await users.add({
        data: {
          openid,
          ...profile,
          createdAt: db.serverDate()
        }
      })
    } else {
      // update existing user
      const docId = res.data[0]._id
      await users.doc(docId).update({
        data: profile
      })
    }

    return {
      code: 200,
      message: 'save profile success'
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
