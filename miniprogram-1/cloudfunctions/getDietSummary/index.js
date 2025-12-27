const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const diet = db.collection('diet_records')

exports.main = async (event, context) => {
  const { userId, startDate, endDate } = event

  if (!userId || !startDate || !endDate) {
    return {
      code: 400,
      message: 'userId, startDate, endDate are required'
    }
  }

  try {
    const res = await diet.where({
      userId,
      date: _.gte(startDate).and(_.lte(endDate))
    }).get()

    const list = res.data || []

    // Group by date
    const summaryMap = {}
    list.forEach(item => {
      const d = item.date
      if (!summaryMap[d]) {
        summaryMap[d] = {
          date: d,
          totalIntake: 0,
          mealCount: 0
        }
      }
      const kcal = Number(item.kcal) || 0
      summaryMap[d].totalIntake += kcal
      summaryMap[d].mealCount += 1
    })

    // Convert to sorted array (newest first or oldest first)
    const summaryList = Object.values(summaryMap).sort((a, b) => {
      // ascending by date
      return a.date.localeCompare(b.date)
    })

    return {
      code: 200,
      message: 'success',
      data: {
        summary: summaryList
      }
    }
  } catch (err) {
    console.error(err)
    return {
      code: 500,
      message: 'Database error',
      error: err
    }
  }
}
