const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const { userId, startDate, endDate } = event

  try {
    const res = await db.collection('diet_records')
      .where({
        userId,
        date: db.command.gte(startDate).and(db.command.lte(endDate))
      })
      .orderBy('date', 'desc')
      .get()

    const totalIntake = res.data.reduce((sum, item) => sum + item.kcal, 0)

    return {
      code: 200,
      message: 'success',
      data: {
        records: res.data,
        totalIntake
      }
    }

  } catch (err) {
    return {
      code: 500,
      message: 'Database error',
      error: err
    }
  }
}
