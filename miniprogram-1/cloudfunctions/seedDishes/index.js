const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const dishesCol = db.collection('dish');

// just insert, no pre-check
async function insertDish(dish) {
  return dishesCol.add({
    data: {
      ...dish,
      createdAt: db.serverDate(),
      rating: dish.rating || 4,
      kcal: dish.kcal ?? null,
      protein: dish.protein ?? null
    }
  });
}

exports.main = async (event, context) => {
  const dishList = [
    // 紫荆园
    {
      name: '泰式炒米粉',
      canteenId: 'zijing',
      canteenName: '紫荆园',
      location: '紫荆园 · 泰式档口',
      mealType: 'lunch',
      price: 10,
      tags: ['主食', '泰式', '微辣']
    },
    {
      name: '东北炖菜',
      canteenId: 'zijing',
      canteenName: '紫荆园',
      location: '紫荆园 · 炖菜档口',
      mealType: 'lunch',
      price: 12,
      tags: ['家常菜', '炖菜']
    },
    {
      name: '白玉菇炖鸡块',
      canteenId: 'zijing',
      canteenName: '紫荆园',
      location: '紫荆园 · 炖菜档口',
      mealType: 'dinner',
      price: 14,
      tags: ['鸡肉', '高蛋白']
    },
    {
      name: '麻辣烫',
      canteenId: 'zijing',
      canteenName: '紫荆园',
      location: '紫荆园 · 麻辣烫',
      mealType: 'dinner',
      price: 15,
      tags: ['麻辣', '可自选']
    },
    {
      name: '葱花鸡蛋',
      canteenId: 'zijing',
      canteenName: '紫荆园',
      location: '紫荆园 · 家常小炒',
      mealType: 'lunch',
      price: 6,
      tags: ['鸡蛋', '素菜']
    },
    {
      name: '紫米饭',
      canteenId: 'zijing',
      canteenName: '紫荆园',
      location: '紫荆园 · 米饭窗口',
      mealType: 'lunch',
      price: 2,
      tags: ['主食', '粗粮']
    },
    {
      name: '海南鸡饭',
      canteenId: 'zijing',
      canteenName: '紫荆园',
      location: '紫荆园 · 套餐档口',
      mealType: 'lunch',
      price: 16,
      tags: ['套餐', '鸡肉', '高蛋白']
    },
    {
      name: '鸡汤',
      canteenId: 'zijing',
      canteenName: '紫荆园',
      location: '紫荆园 · 汤类',
      mealType: 'dinner',
      price: 5,
      tags: ['汤品', '清淡']
    },
    {
      name: '兰州拉面',
      canteenId: 'zijing',
      canteenName: '紫荆园',
      location: '紫荆园 · 兰州拉面',
      mealType: 'lunch',
      price: 12,
      tags: ['面食', '牛肉']
    },

    // 观畴园
    {
      name: '北京烤鸭',
      canteenId: 'guanchou',
      canteenName: '观畴园',
      location: '观畴园 · 烤鸭档',
      mealType: 'dinner',
      price: 20,
      tags: ['禽肉', '多人分享']
    },
    {
      name: '阳春面',
      canteenId: 'guanchou',
      canteenName: '观畴园',
      location: '观畴园 · 面食档',
      mealType: 'breakfast',
      price: 8,
      tags: ['面食', '清淡']
    },
    {
      name: '鱼香肉丝',
      canteenId: 'guanchou',
      canteenName: '观畴园',
      location: '观畴园 · 川菜',
      mealType: 'lunch',
      price: 13,
      tags: ['川菜', '微辣', '猪肉']
    },
    {
      name: '酸菜鱼',
      canteenId: 'guanchou',
      canteenName: '观畴园',
      location: '观畴园 · 酸菜鱼',
      mealType: 'dinner',
      price: 18,
      tags: ['鱼', '酸辣']
    },
    {
      name: '石锅拌饭',
      canteenId: 'guanchou',
      canteenName: '观畴园',
      location: '观畴园 · 韩式',
      mealType: 'lunch',
      price: 16,
      tags: ['韩式', '拌饭']
    },

    // 清芬园
    {
      name: '冬瓜炖排骨',
      canteenId: 'qingfen',
      canteenName: '清芬园',
      location: '清芬园 · 汤类',
      mealType: 'dinner',
      price: 14,
      tags: ['排骨', '汤品']
    },
    {
      name: '宜宾燃面',
      canteenId: 'qingfen',
      canteenName: '清芬园',
      location: '清芬园 · 川味面',
      mealType: 'lunch',
      price: 10,
      tags: ['川菜', '面食', '微辣']
    },
    {
      name: '黄焖鸡',
      canteenId: 'qingfen',
      canteenName: '清芬园',
      location: '清芬园 · 黄焖鸡',
      mealType: 'lunch',
      price: 15,
      tags: ['鸡肉', '高蛋白']
    },
    {
      name: '羊肉泡馍',
      canteenId: 'qingfen',
      canteenName: '清芬园',
      location: '清芬园 · 西北风味',
      mealType: 'dinner',
      price: 18,
      tags: ['羊肉', '主食']
    },

    // 听涛园
    {
      name: '腊汁肉拌面',
      canteenId: 'tingtao',
      canteenName: '听涛园',
      location: '听涛园 · 陕西风味',
      mealType: 'lunch',
      price: 13,
      tags: ['面食', '猪肉']
    },
    {
      name: '酸菜鱼',
      canteenId: 'tingtao',
      canteenName: '听涛园',
      location: '听涛园 · 酸菜鱼',
      mealType: 'dinner',
      price: 18,
      tags: ['鱼', '酸辣']
    },
    {
      name: '鸡块面',
      canteenId: 'tingtao',
      canteenName: '听涛园',
      location: '听涛园 · 面食',
      mealType: 'lunch',
      price: 11,
      tags: ['鸡肉', '面食']
    },
    {
      name: '麻辣香锅',
      canteenId: 'tingtao',
      canteenName: '听涛园',
      location: '听涛园 · 麻辣香锅',
      mealType: 'dinner',
      price: 18,
      tags: ['麻辣', '多配菜']
    },

    // 桃李园
    {
      name: '煲仔排骨饭',
      canteenId: 'taoli',
      canteenName: '桃李园',
      location: '桃李园 · 煲仔饭',
      mealType: 'lunch',
      price: 16,
      tags: ['煲仔饭', '排骨']
    },
    {
      name: '肉酱拌面',
      canteenId: 'taoli',
      canteenName: '桃李园',
      location: '桃李园 · 面食',
      mealType: 'lunch',
      price: 11,
      tags: ['面食', '猪肉']
    },
    {
      name: '大盘鸡',
      canteenId: 'taoli',
      canteenName: '桃李园',
      location: '桃李园 · 西北风味',
      mealType: 'dinner',
      price: 20,
      tags: ['鸡肉', '土豆', '多人分享']
    },
    {
      name: '黄焖鸡米线',
      canteenId: 'taoli',
      canteenName: '桃李园',
      location: '桃李园 · 黄焖鸡/米线',
      mealType: 'lunch',
      price: 15,
      tags: ['鸡肉', '米线']
    }
  ];

  try {
    const results = [];
    for (const dish of dishList) {
      const r = await insertDish(dish);
      results.push(r);
    }

    return {
      code: 200,
      message: 'success',
      inserted: results.length
    };
  } catch (err) {
    console.error('seedDishes error', err);
    return {
      code: 500,
      message: 'Database error',
      error: err
    };
  }
};
