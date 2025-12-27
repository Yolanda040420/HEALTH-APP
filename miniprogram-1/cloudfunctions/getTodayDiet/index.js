// getTodayDiet
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const diet = db.collection('diet_records')

exports.main = async (event, context) => {
  const { userId } = event

  // ✅ 用 UTC+8 生成今天日期字符串（避免云端时区导致“还停留在昨天”）
  const now = new Date()
  const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  const yyyy = utc8.getUTCFullYear()
  const mm = String(utc8.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(utc8.getUTCDate()).padStart(2, '0')
  const todayStr = `${yyyy}-${mm}-${dd}`

  try {
    const res = await diet.where({
      userId,
      date: todayStr
    }).get()

    const totalKcal = res.data.reduce((sum, item) => sum + item.kcal, 0)

    return {
      code: 200,
      message: "success",
      data: {
        records: res.data,
        totalIntake: totalKcal
      }
    }

  } catch (err) {
    return {
      code: 500,
      message: "Database error",
      error: err
    }
  }
}