const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const reactionsCollection = db.collection('forum_post_reactions')

exports.main = async (event, context) => {
  const { postId, userId } = event || {}

  if (!postId || !userId) {
    return {
      code: 400,
      message: 'postId and userId are required'
    }
  }

  try {
    const res = await reactionsCollection
      .where({
        postId,
        userId,
        type: 'like'        
      })
      .limit(1)
      .get()

    const liked = res.data && res.data.length > 0

    return {
      code: 0,
      message: 'ok',
      data: {
        liked
      }
    }
  } catch (err) {
    console.error('forumHasLikedPost error', err)
    return {
      code: 500,
      message: 'internal error',
      error: err
    }
  }
}
