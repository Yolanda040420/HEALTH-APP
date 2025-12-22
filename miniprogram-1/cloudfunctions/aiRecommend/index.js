const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const dishCol = db.collection('dish')

const CANTEENS = [
  { id: 'zijing', name: '紫荆园' },
  { id: 'taoli', name: '桃李园' },
  { id: 'qingfen', name: '清芬园' },
  { id: 'tingtao', name: '听涛园' },
  { id: 'guanchou', name: '观畴园' }
]

function pickRandomCanteen () {
  const idx = Math.floor(Math.random() * CANTEENS.length)
  return CANTEENS[idx]
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const {
    type = 'diet',                 // 预留：以后做运动推荐用
    mealType = 'lunch',            // 'breakfast' | 'lunch' | 'dinner'
    budget = 20,                   // 预算（元）
    maxCaloriesPerMeal = 800,      // 单餐最大 kcal
    minProtein = 20,               // 最少蛋白质 g
    userProfile = {}               // { sex, age, height, weight, goal }
  } = event || {}

  try {
    const canteen = pickRandomCanteen()

    const where = {
      canteenId: canteen.id,
      mealType: mealType
    }

    where.price = _.lte(budget + 5)

    const dishesRes = await dishCol.where(where).limit(50).get()
    const dishes = dishesRes.data || []

    if (!dishes.length) {
      console.warn('no dishes found for', canteen, mealType)
      return {
        code: 404,
        message: 'no dishes found in DB for this canteen/mealType'
      }
    }

    const candidates = dishes.map(d => ({
      id: d._id,                     
      name: d.name,
      canteenId: d.canteenId,
      canteenName: d.canteenName,
      location: d.location,
      price: d.price,
      kcal: d.kcal ?? null,
      protein: d.protein ?? null,
      tags: d.tags || []
    }))

    const profileText = `
性别: ${userProfile.sex === 'female' ? '女' : '男'}
年龄: ${userProfile.age || 21}
身高: ${userProfile.height || 170} cm
体重: ${userProfile.weight || 60} kg
目标: ${userProfile.goal || '减脂'}
预算: ${budget} 元
单餐最大热量: ${maxCaloriesPerMeal} kcal
希望蛋白质不少于: ${minProtein} g
用餐时间: ${mealType}
`.trim()

    const systemPrompt = '你是一个严谨的营养师，只用中文回答，并且严格按照要求返回 JSON。'

    const userPrompt = `
你在清华大学食堂工作，现在根据用户信息推荐菜品。

【用户基本信息】
${profileText}

【候选菜品列表（JSON 数组）】
每个元素包含字段：
- id: string（数据库里的真实 id）
- name: 菜名
- canteenName: 食堂名称
- location: 详细档口信息
- price: 价格（元）
- kcal: 单份估算热量（可能为 null）
- protein: 单份蛋白质（g，可能为 null）
- tags: 标签数组

候选列表如下（JSON）：
${JSON.stringify(candidates, null, 2)}

要求：
1. 只能从上面的候选菜品中选择，禁止自己编造新的菜品或新的 id。
2. 请推荐最多 3 个最合适的菜品。
3. 返回时，必须使用候选菜品里的 "id" 作为 "sourceId"，保持完全一致。
4. 优先选择高蛋白、热量适中、价格不超预算的菜。
5. 如果 kcal/protein 为 null，可以根据常识做一个合理估计。
6. 必须返回【严格 JSON】，不要包含任何额外文字，格式如下：

{
  "items": [
    {
      "sourceId": "候选菜品的 id",
      "name": "菜名",
      "reason": "简短中文推荐理由",
      "estimatedKcal": 400,
      "protein": 25,
      "price": 12
    }
  ]
}
`.trim()

    const apiKey = process.env.API_KEY
    const API_URL = 'https://api.vectorengine.ai/v1/chat/completions';
    const model = process.env.AI_MODEL || 'qwen2.5-32b-instruct'

    const resp = await axios.post(
      API_URL,
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.6,
        max_tokens: 512
      },
      {
        timeout: 25000,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    )

    const choice = resp.data && resp.data.choices && resp.data.choices[0]
    const content = choice && choice.message && choice.message.content

    let parsed
    try {
      parsed = JSON.parse(content)
    } catch (e) {
      const match = content && content.match(/\{[\s\S]*\}/)
      if (match) {
        parsed = JSON.parse(match[0])
      } else {
        throw new Error('AI result is not valid JSON: ' + content)
      }
    }

    const items = Array.isArray(parsed.items) ? parsed.items : []

    const safeItems = items
      .map(it => {
        const found = dishes.find(d => d._id === it.sourceId)
        if (!found) return null
        return {
          sourceId: found._id,                              // 真实 id
          name: found.name,
          reason: it.reason || '',
          estimatedKcal: Number(it.estimatedKcal) || found.kcal || null,
          protein: Number(it.protein) || found.protein || null,
          price: Number(it.price) || found.price || null,
          canteenName: found.canteenName,
          location: found.location
        }
      })
      .filter(Boolean)

    return {
      code: 200,
      message: 'success',
      data: {
        canteenId: canteen.id,
        canteenName: canteen.name,
        items: safeItems
      }
    }
  } catch (err) {
    console.error('aiRecommend error', err)
    return {
      code: 500,
      message: 'AI request failed',
      error: err.toString()
    }
  }
}
