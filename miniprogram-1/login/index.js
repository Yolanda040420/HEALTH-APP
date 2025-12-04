// cloudfunctions/login/index.js
const cloud = require('wx-server-sdk')
cloud.init()

const db = cloud.database()
const users = db.collection('users')

exports.main = async (event, context) => {
  const { username, password } = event

  const res = await users.where({ username, password }).get()

  if (res.data.length === 0) {
    return { success: false, msg: "Wrong username or password" }
  }

  return {
    success: true,
    msg: "Login success",
    user: res.data[0]
  }
}
