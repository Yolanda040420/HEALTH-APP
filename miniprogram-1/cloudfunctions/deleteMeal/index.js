const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

const diet = db.collection('diet_records')

exports.main = async (event, context) => {
  const { userId, recordId } = event

  if (!recordId) {
    return {
      code: 400,
      message: 'recordId is required'
    }
  }

  try {
    // Only delete this user's record with this id
    const res = await diet.where({
      _id: recordId,
      userId: userId
    }).remove()

    if (!res.stats || res.stats.removed === 0) {
      return {
        code: 404,
        message: 'Record not found or no permission'
      }
    }

    return {
      code: 200,
      message: 'Meal deleted successfully'
    }
  } catch (err) {
    return {
      code: 500,
      message: 'Database error',
      error: err
    }
  }
}
