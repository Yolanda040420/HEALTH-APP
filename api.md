水木健康助手API文档

1. 用户登录
   
接口: POST /api/auth/login

功能: 微信小程序登录

2. 食堂菜单接口
   
2.1 获取食堂列表

接口: GET /api/canteens

功能: 获取所有食堂信息

返回: 食堂列表及基本信息

2.2 获取菜单信息

接口: GET /api/menus

功能: 获取菜单信息

2.3 获取菜品详情

接口: GET /api/items/{id}1

功能: 获取单个菜品的详细信息，包括营养成分、价格等

参数:id: 菜品ID

3.计划与筛选接口

3.1 生成推荐计划

接口: POST /api/plan/generate

功能: 基于用户目标和偏好生成日/周推荐计划

参数（暂定仅供参考）:

json
{  
  "type": "day|week",  
  "preferences": {  
    "spicy": true/false,  
    "vegetarian": true/false,  
    "halal": true/false,  
    "max_calories": 数值,  
    "min_protein": 数值,  
    "price_range": [min, max],  
    "meal_time": "breakfast|lunch|dinner"  
  }  
}  

3.2 获取筛选选项

接口: GET /api/filters

功能: 获取可用的筛选条件选项

4. 收藏/黑名单/评分接口
   
4.1 收藏管理

添加收藏: POST /api/favorites

删除收藏: DELETE /api/favorites/{item_id}

功能: 管理用户收藏的菜品，影响推荐优先级

4.2 黑名单管理

添加黑名单: POST /api/blacklist

删除黑名单: DELETE /api/blacklist/{scope}:{id}

功能: 管理用户不想看到的菜品

4.3 评分系统

提交评分: POST /api/ratings1

功能: 用户对菜品进行1-5星评分，影响推荐排序

5. 数据记录接口
   
5.1 饮食记录

接口: POST /api/track/food

功能: 记录用户饮食，支持三种方式：食堂菜品库、通用食物搜索、手动录入

参数（仅供参考）:

json
{  
  "source": "db|common|manual",  
  "item_id": "菜品ID(db模式)",  
  "food_name": "食物名称",  
  "grams": 重量克数,  
  "servings": 份数,  
  "nutrition": {  
    "calories": 卡路里,  
    "protein": 蛋白质,  
    "fat": 脂肪,  
    "carbs": 碳水化合物  
  }  
}  

5.2 锻炼记录

接口: POST /api/track/exercise

功能: 记录用户运动类型和时长，系统估算热量消耗

参数:

json
{  
  "type": "运动类型",  
  "duration_min": 时长分钟  
}  

5.3 获取统计摘要

接口: GET /api/track/summary?date=

功能: 获取指定日期的饮食和运动统计，包括总摄入、总消耗、净热量

6. 论坛接口
   
6.1 帖子管理

获取帖子列表: GET /api/forum/posts

发布帖子: POST /api/forum/posts

功能: 支持用户发布文字+图片帖子，按时间或热度排序

6.2 评论功能

接口: POST /api/forum/comments

功能: 对帖子进行评论互动

7. 健康指南接口（可选）
   
7.1 获取健康指南

接口: GET /api/guides

功能: 获取基础健身指南等健康资讯

7.2 获取季节性提示

接口: GET /api/tips?season=

功能: 获取换季提醒、过敏原提示等信息

8. 通知接口（可选）
   
8.1 订阅通知

接口: POST /api/notify/subscribe

功能: 保存模板ID与用户授权，用于推送健康提醒

8.2 计划通知

接口: POST /api/notify/plan

功能: 将订阅消息加入推送队列
