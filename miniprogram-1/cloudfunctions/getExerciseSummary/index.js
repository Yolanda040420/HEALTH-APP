const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const exerciseCollection = db.collection('exercise_records')

exports.main = async (event, context) => {
  const { userId, startDate, endDate } = event

  if (!userId) {
    return {
      code: 400,
      message: "userId is required",
      data: null,
      timestamp: new Date().toISOString()
    }
  }

  const whereCond = { userId }

  if (startDate && endDate) {
    whereCond.date = _.gte(startDate).and(_.lte(endDate))
  } else if (startDate) {
    whereCond.date = _.gte(startDate)
  } else if (endDate) {
    whereCond.date = _.lte(endDate)
  }

  try {
    const res = await exerciseCollection.where(whereCond).get()

    const records = res.data || []

    // Aggregate
    let totalBurned = 0
    const byDateMap = {}

    records.forEach(item => {
      const kcal = item.kcal || 0
      const date = item.date || 'unknown'

      totalBurned += kcal

      if (!byDateMap[date]) {
        byDateMap[date] = {
          date,
          totalBurned: 0,
          records: []
        }
      }

      byDateMap[date].totalBurned += kcal
      byDateMap[date].records.push(item)
    })

    const byDate = Object.values(byDateMap).sort((a, b) =>
      a.date.localeCompare(b.date)
    )

    return {
      code: 200,
      message: "success",
      data: {
        totalBurned,
        count: records.length,
        byDate
      },
      timestamp: new Date().toISOString()
    }

  } catch (err) {
    console.error('getExerciseSummary error:', err)
    return {
      code: 500,
      message: "Database error",
      error: err,
      timestamp: new Date().toISOString()
    }
  }
}
