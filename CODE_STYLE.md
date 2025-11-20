# HEALTH-APP 微信小程序代码规范（CODE_STYLE）

本项目为校园健康饮食微信小程序（HEALTH-APP）。  
本规范用于统一团队的代码风格和项目结构，提升可读性与可维护性。

---

## 1. 目录结构

小程序前端代码放在 `miniprogram/` 目录下，推荐结构如下：

```text
miniprogram/
  app.js
  app.json
  app.wxss

  pages/
    meal/
      recommend/      # 用餐 - 推荐页
      menu/           # 用餐 - 菜单页
    log/
    community/
    profile/

  components/
    dish-card/        # 菜品卡片组件
    ...

  utils/              # 工具函数（如请求封装）

cloudfunctions/       # 云函数（如使用）
project.config.json
README.md
CODE_STYLE.md
```

**约定：**

- 页面必须位于 `miniprogram/pages/` 下  
- 复用 UI 必须抽出为组件放在 `miniprogram/components/`  
- 公共工具函数放在 `miniprogram/utils/`  

---

## 2. 命名规范

### 2.1 文件与目录

- 目录名：全部小写，使用中划线  
  `dish-card`, `meal-recommend`
- 页面文件：与目录同名  
  如：`recommend.wxml`, `recommend.js`
- 组件文件：使用 `index` 或组件名（必须全项目统一）

---

## 3. WXML 规范

1. 结构层级清晰，避免过度嵌套
2. 列表必须使用 `wx:for` 与 `wx:key`
3. 页面事件统一命名为 `onXxx`
4. 组件使用 `triggerEvent` 与 `bind:xxx` 通信
5. 禁用 `&nbsp;` 等 HTML 实体

---

## 4. WXSS 规范

- 全项目使用 `rpx`
- 样式写在对应 `.wxss` 文件中，避免内联 style
- 类名语义化，例如：
  - `filter-header`
  - `dish-card-footer`

---

## 5. JavaScript 规范

- 使用 ES6+：`let/const`、模板字符串、箭头函数
- 不允许直接修改 `this.data`，必须使用 `setData`
- 页面结构示例：

```js
Page({
  data: {
    activeTab: 'recommend',
    dishes: []
  },

  onLoad() {
    this.loadMockDishes();
  }
});
```

---

## 6. 组件规范

- 使用 `Component` 构建组件
- 输入数据通过 `properties`
- 输出事件用 `triggerEvent`
- UI 重复必须封装成组件

---

## 7. 数据与逻辑

- 假数据放在独立函数（如 `loadMockDishes()`）
- 请求由 `utils/request.js` 统一封装
- 状态字段命名规范示例：
  - `activeTab`
  - `activeFilter`
  - `dropdownVisible`

---

## 8. 注释规范

函数与复杂逻辑必须写注释，例如：

```js
/**
 * 一键生成今日推荐
 */
```

---

## 9. Git 提交规范

格式：

```
类型: 简要描述
```

示例：

- `feat: add dish-card component`
- `fix: adjust rating star alignment`
- `style: update filter-header spacing`
- `docs: add CODE_STYLE.md`

---

## 10. 规范执行

- 所有人需遵守此规范  
- 规范更新需经小组确认后修改本文件  

---
