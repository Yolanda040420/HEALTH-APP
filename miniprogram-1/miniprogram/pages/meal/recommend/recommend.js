// pages/meal/recommend/recommend.js
// 接入云函数：getDishes / getDishPreferences / updateDishPreference / seedDishes(可选) / aiRecommend

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function uniq(arr) {
  const m = {};
  const out = [];
  (arr || []).forEach(x => {
    const k = String(x);
    if (!m[k]) {
      m[k] = true;
      out.push(k);
    }
  });
  return out;
}

// =========================
// 本地估算 kcal / protein（当后端为 null 时用）
// =========================
function estimateKcalFallback(dish) {
  const tags = dish.tags || [];
  const mt = String(dish.mealType || '').toLowerCase();

  if (tags.includes('汤品') || tags.includes('清淡') || tags.includes('粥')) return 120;

  if (
    tags.includes('套餐') ||
    tags.includes('拌饭') ||
    tags.includes('盖浇饭') ||
    tags.includes('煲仔饭') ||
    (tags.includes('主食') && !tags.includes('粗粮'))
  ) return 650;

  if (tags.includes('面食') || tags.includes('米线') || tags.includes('粉')) return 550;
  if (tags.includes('粗粮')) return 350;

  if (mt === 'breakfast' || dish.mealType === '早餐') return 350;
  if (mt === 'dinner' || dish.mealType === '晚餐') return 550;
  return 600;
}

function estimateProteinFallback(dish) {
  const tags = dish.tags || [];
  if (tags.includes('高蛋白')) return 30;
  if (tags.some(t => ['鸡肉', '牛肉', '羊肉', '猪肉', '鱼', '虾'].includes(t))) return 22;
  if (tags.includes('鸡蛋')) return 15;
  if (tags.includes('素菜') || tags.includes('素')) return 8;
  return 15;
}

Page({
  data: {
    activeTab: 'recommend', // 'recommend' | 'menu'

    // 下拉筛选（推荐tab）
    dropdownVisible: false,
    activeFilter: '',
    dropdownOptions: [],
    currentDropdownSelected: '',

    filterOptions: {
      taste: ['不限', '微辣', '清淡', '麻辣', '咖喱', '甜口', '咸口', '酸口'],
      nutrition: ['不限', '猪肉', '鸡肉', '素菜', '牛肉', '鱼', '虾', '豆制品'],
      price: ['不限', '≤5元', '≤10元', '≤15元', '≤20元'],
      time: ['不限', '早餐', '午餐', '晚餐']
    },
    selectedFilters: {
      taste: '',
      nutrition: '',
      price: '',
      time: ''
    },

    // 快捷标签（推荐tab）
    quickTags: [
      { label: '早餐', value: 'breakfast' },
      { label: '午餐', value: 'lunch' },
      { label: '晚餐', value: 'dinner' },
      { label: '低脂', value: 'lowfat' },
      { label: '微辣', value: 'mild' },
      { label: '≤5元', value: 'lt5' },
      { label: '≤10元', value: 'lt10' }
    ],
    activeQuickTag: '',

    // 推荐列表（展示用）
    recommendDishes: [],

    // 菜单tab筛选
    menuDropdownVisible: false,
    activeMenuFilter: '',
    menuDropdownOptions: [],
    currentMenuDropdownSelected: '',

    menuFilterOptions: {
      canteen: ['不限', '紫荆园', '桃李园', '清芬园', '听涛园', '观畴园'],
      window: ['不限', '面食', '点心', '甜品', '热菜', '汤类', '主食', '饮品', '轻食'],
      type: ['不限', '早餐', '午餐', '晚餐']
    },
    selectedMenuFilters: {
      canteen: '紫荆园',
      window: '不限',
      type: '午餐'
    },

    // 菜单列表（展示用）
    menuDishes: [],

    // 收藏/拉黑弹窗
    modalVisible: false,
    modalType: '', // 'favorites' | 'blocked'
    favoriteDishes: [],
    blockedDishes: [],

    // 详情弹窗
    detailModalVisible: false,
    detailDish: null,

    // ✅偏好 id 列表（用于打标）
    prefsFavoriteIds: [],
    prefsBlockedIds: []
  },

  // =========================
  // 生命周期
  // =========================
  onLoad() {
    this._prefs = { favorites: [], blocked: [] };
    this._recommendPool = [];
    this._menuPool = [];
    this.bootstrap();
  },

  onShow() {
    this.refreshCurrentTab();
  },

  // -------------------------
  // 获取 userId（users 集合的 _id）
  // -------------------------
  getUserId() {
    const app = getApp();
    const fromGlobal = (app && app.globalData && app.globalData.userId) ? String(app.globalData.userId).trim() : '';
    if (fromGlobal) return fromGlobal;

    const fromStorage = wx.getStorageSync('userId');
    if (fromStorage) return String(fromStorage).trim();

    const currentUser = wx.getStorageSync('currentUser');
    if (currentUser && currentUser._id) return String(currentUser._id).trim();

    return '';
  },

  async bootstrap() {
    wx.showLoading({ title: '加载中...' });
    try {
      await this.loadDishPreferences();
      if (this.data.activeTab === 'recommend') {
        await this.loadRecommendPool();
        this.generateRecommendDishes(); // ✅默认仍然走随机（不调用 AI）
      } else {
        await this.loadMenuDishes();
      }
    } catch (e) {
      console.error('[bootstrap] error:', e);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  async refreshCurrentTab() {
    try {
      await this.loadDishPreferences();
      if (this.data.activeTab === 'recommend') {
        await this.loadRecommendPool();
        this.generateRecommendDishes(); // ✅默认仍然走随机（不调用 AI）
      } else {
        await this.loadMenuDishes();
      }
      if (this.data.modalVisible) {
        this.refreshModalList();
      }
    } catch (e) {
      console.error('[refreshCurrentTab] error:', e);
    }
  },

  // =========================
  // 云函数调用封装
  // =========================
  callCloud(name, data) {
    return wx.cloud.callFunction({ name, data: data || {} })
      .then(res => (res && res.result) ? res.result : {})
      .catch(err => {
        console.error('[callCloud] fail:', name, err);
        throw err;
      });
  },

  // =========================
  // ✅偏好：收藏/拉黑（核心修复在这里）
  // =========================
  _normalizePrefArray(arr) {
    if (!Array.isArray(arr)) return [];
    const out = [];

    arr.forEach(x => {
      // 新格式：{ id, name }
      if (x && typeof x === 'object') {
        const id = String(x.id || x._id || x.dishId || '').trim();
        if (!id) return;
        out.push({ id, name: String(x.name || x.dishName || x.title || '').trim() });
        return;
      }
      // 老格式：'dishId'
      if (typeof x === 'string') {
        const id = String(x).trim();
        if (!id) return;
        out.push({ id, name: '' });
      }
    });

    const seen = {};
    return out.filter(it => {
      if (seen[it.id]) return false;
      seen[it.id] = true;
      return true;
    });
  },

  // ✅从本页已加载的菜列表里补 name（prefs 只有 id 时非常关键）
  _buildDishNameIndex() {
    const map = {};
    const add = (d) => {
      const id = String(d && (d.id || d._id) || '').trim();
      if (!id) return;
      const name = String(d.name || '').trim();
      if (name && !map[id]) map[id] = name;
    };

    safeArray(this.data.recommendDishes).forEach(add);
    safeArray(this.data.menuDishes).forEach(add);
    safeArray(this._recommendPool).forEach(add);
    safeArray(this._menuPool).forEach(add);

    return map;
  },

  _hydratePrefNames(prefList) {
    const idx = this._buildDishNameIndex();
    return (prefList || []).map(it => {
      const id = String(it.id || '').trim();
      const name = String(it.name || '').trim();
      if (name) return { id, name };
      return { id, name: idx[id] || '' };
    });
  },

  async loadDishPreferences() {
    const userId = this.getUserId();

    if (!userId) {
      this._prefs = { favorites: [], blocked: [] };
      this.setData({
        prefsFavoriteIds: [],
        prefsBlockedIds: [],
        favoriteDishes: [],
        blockedDishes: []
      });
      return;
    }

    let data = null;

    // 1) 先走云函数（推荐）
    try {
      const r = await this.callCloud('getDishPreferences', { userId });

      // ✅修复：兼容 code=0 / code=200
      const ok = r && (r.code === 200 || r.code === 0) && r.data;
      if (ok) data = r.data;
    } catch (e) {
      console.warn('[getDishPreferences] cloud fail, try db fallback...', e);
    }

    // 2) 云函数失败时，直接读云数据库兜底（需要你权限允许）
    if (!data) {
      try {
        const db = wx.cloud.database();
        const res = await db.collection('user_dish_preferences').where({ userId: String(userId) }).limit(1).get();
        if (res && res.data && res.data.length) {
          data = res.data[0];
        }
      } catch (e2) {
        console.warn('[user_dish_preferences] direct db fallback fail:', e2);
      }
    }

    if (!data) {
      // 拉不到就清空
      this._prefs = { favorites: [], blocked: [] };
      this.setData({
        prefsFavoriteIds: [],
        prefsBlockedIds: [],
        favoriteDishes: [],
        blockedDishes: []
      });
      return;
    }

    // ✅兼容不同字段名
    const favRaw =
      data.favorites ||
      data.favoriteDishes ||
      (data.prefs && data.prefs.favorites) ||
      [];

    const blkRaw =
      data.blocked ||
      data.blockList ||
      data.blacklist ||
      (data.prefs && data.prefs.blocked) ||
      [];

    let favList = this._normalizePrefArray(favRaw);
    let blkList = this._normalizePrefArray(blkRaw);

    // ✅补全 name（prefs 可能只有 id）
    favList = this._hydratePrefNames(favList);
    blkList = this._hydratePrefNames(blkList);

    this._prefs = { favorites: favList, blocked: blkList };

    const favIds = favList.map(x => x.id);
    const blkIds = blkList.map(x => x.id);

    this.setData({
      prefsFavoriteIds: favIds,
      prefsBlockedIds: blkIds,
      favoriteDishes: favList.map(x => ({ id: x.id, name: x.name || '（未命名菜品）' })),
      blockedDishes: blkList.map(x => ({ id: x.id, name: x.name || '（未命名菜品）' }))
    });
  },

  // 对一批菜品打标（collected/blocked）
  applyPrefsToDishes(list) {
    const favIds = new Set((this.data.prefsFavoriteIds || []).map(String));
    const blkIds = new Set((this.data.prefsBlockedIds || []).map(String));

    const apply = (arr) => (Array.isArray(arr) ? arr : []).map(d => {
      const id = String(d.id || d._id || '');
      return {
        ...d,
        collected: id ? favIds.has(id) : false,
        blocked: id ? blkIds.has(id) : false
      };
    });

    if (list !== undefined) return apply(list);

    this.setData({
      recommendDishes: apply(this.data.recommendDishes),
      menuDishes: apply(this.data.menuDishes)
    });
  },

  // 切换偏好：favorite/blocked
  async togglePreference(dishId, type, dishName) {
    const userId = this.getUserId();
    if (!userId) {
      wx.showToast({ title: '未获取到用户信息，请先登录', icon: 'none' });
      return;
    }

    const id = String(dishId || '').trim();
    if (!id) return;

    let name = (dishName !== undefined && dishName !== null) ? String(dishName) : '';
    name = String(name || '').trim();

    if (!name) {
      const findIn = (list) => (list || []).find(d => String(d.id || d._id || '') === id);
      const hit = findIn(this.data.recommendDishes) || findIn(this.data.menuDishes) || null;
      if (hit && hit.name) name = String(hit.name).trim();
      else if (this.data.detailDish && String(this.data.detailDish.id || this.data.detailDish._id || '') === id) {
        name = String(this.data.detailDish.name || '').trim();
      }
    }

    const pref = this._prefs || { favorites: [], blocked: [] };
    const listKey = (type === 'favorite') ? 'favorites' : 'blocked';
    const list = pref[listKey] || [];
    const has = list.some(x => String((x && (x.id || x.dishId)) || x) === id);

    const action = has ? 'remove' : 'add';

    const resp = await wx.cloud.callFunction({
      name: 'updateDishPreference',
      data: {
        userId,
        dishId: id,
        dishName: name,
        name: name,
        type,
        action
      }
    });

    const r = resp && resp.result ? resp.result : {};
    if (r.code !== 200 && r.code !== 0) {
      const msg = r.message || '操作失败';
      wx.showToast({ title: msg, icon: 'none' });
      throw new Error(msg);
    }

    // ✅本地更新 prefs（不用等下一次 load）
    const normItem = { id, name: name || '' };

    const toObjList = (arr) => (arr || []).map(x => {
      if (typeof x === 'string') return { id: x, name: '' };
      const xid = x.id || x.dishId || '';
      const xname = x.name || x.dishName || '';
      return { id: String(xid).trim(), name: String(xname || '').trim() };
    }).filter(x => x.id);

    const cur = toObjList(pref[listKey] || []);
    let nextList = cur;

    if (action === 'add') {
      const exists = cur.some(x => x.id === id);
      if (!exists) nextList = cur.concat([normItem]);
      else {
        nextList = cur.map(x => (x.id === id && !x.name && normItem.name) ? normItem : x);
      }
    } else {
      nextList = cur.filter(x => x.id !== id);
    }

    this._prefs = {
      favorites: listKey === 'favorites' ? nextList : toObjList(pref.favorites || []),
      blocked: listKey === 'blocked' ? nextList : toObjList(pref.blocked || [])
    };

    // ✅补全 name 再写入 data（避免弹窗空名）
    const favList = this._hydratePrefNames(this._prefs.favorites);
    const blkList = this._hydratePrefNames(this._prefs.blocked);
    this._prefs = { favorites: favList, blocked: blkList };

    this.setData({
      prefsFavoriteIds: favList.map(x => x.id),
      prefsBlockedIds: blkList.map(x => x.id),
      favoriteDishes: favList.map(x => ({ id: x.id, name: x.name || '（未命名菜品）' })),
      blockedDishes: blkList.map(x => ({ id: x.id, name: x.name || '（未命名菜品）' }))
    });

    this.syncDishFlagsEverywhere(id);
    this.refreshModalList();
  },

  // 在 recommendDishes / menuDishes / 详情里同步 collected/blocked 状态
  syncDishFlagsEverywhere(dishId) {
    const id = String(dishId || '');
    if (!id) return;

    const favIds = new Set((this.data.prefsFavoriteIds || []).map(String));
    const blkIds = new Set((this.data.prefsBlockedIds || []).map(String));

    const update = (listName) => {
      const list = this.data[listName] || [];
      let changed = false;
      const next = list.map(d => {
        const did = String(d.id || d._id || '');
        if (did !== id) return d;
        changed = true;
        return {
          ...d,
          collected: favIds.has(id),
          blocked: blkIds.has(id)
        };
      });
      if (changed) this.setData({ [listName]: next });
    };

    update('recommendDishes');
    update('menuDishes');

    const detail = this.data.detailDish;
    if (detail && String(detail.id || detail._id || '') === id) {
      this.setData({
        detailDish: {
          ...detail,
          collected: favIds.has(id),
          blocked: blkIds.has(id)
        }
      });
    }
  },

  // =========================
  // 拉菜品：getDishes
  // =========================
  mapMealTypeCNToEn(v) {
    if (v === '早餐') return 'breakfast';
    if (v === '午餐') return 'lunch';
    if (v === '晚餐') return 'dinner';
    return '';
  },

  parseMaxPrice(v) {
    if (!v || v === '不限') return null;
    const m = String(v).match(/(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  },

  mapCanteenNameToId(name) {
    const m = {
      '紫荆园': 'zijing',
      '桃李园': 'taoli',
      '清芬园': 'qingfen',
      '听涛园': 'tingtao',
      '观畴园': 'guanchou'
    };
    return m[name] || '';
  },

  buildGetDishesParamsForRecommend() {
    const f = this.data.selectedFilters || {};

    const mealType = this.mapMealTypeCNToEn(f.time);
    const maxPrice = this.parseMaxPrice(f.price);

    let tag = '';
    if (f.nutrition && f.nutrition !== '不限') tag = f.nutrition;
    else if (f.taste && f.taste !== '不限') tag = f.taste;

    const params = {};
    if (mealType) params.mealType = mealType;
    if (typeof maxPrice === 'number') params.maxPrice = maxPrice;
    if (tag) params.tag = tag;

    return params;
  },

  clientFilterForRecommend(list) {
    const tagId = this.data.activeQuickTag || '';
    if (!tagId) return list;

    if (tagId === 'lt500' || tagId === 'lt700') {
      const limit = tagId === 'lt500' ? 500 : 700;
      return (list || []).filter(d => {
        const kcal = (d.kcal === null || d.kcal === undefined) ? null : Number(d.kcal);
        if (kcal === null || isNaN(kcal)) return true;
        return kcal <= limit;
      });
    }

    return list;
  },

  mapBackendDish(d) {
    const tags = safeArray(d.tags);

    let kcal = d.kcal;
    if (kcal === undefined || kcal === null) {
      kcal = estimateKcalFallback({ tags, mealType: d.mealType });
    }

    let protein = d.protein;
    if (protein === undefined || protein === null) {
      protein = estimateProteinFallback({ tags });
    }

    return {
      id: d._id,
      name: d.name || '',
      location: d.location || (d.canteenName ? (d.canteenName + ' · ') : '') + (d.canteenId || ''),
      canteenId: d.canteenId || '',
      canteenName: d.canteenName || '',
      mealType: d.mealType || '',
      price: Number(d.price) || 0,
      tags: tags,
      rating: Number(d.rating) || 4,
      kcal,
      protein,
      collected: false,
      blocked: false
    };
  },

  async loadRecommendPool() {
    const params = this.buildGetDishesParamsForRecommend();
    const r = await this.callCloud('getDishes', params);

    if (r.code !== 200 && r.code !== 0) {
      this._recommendPool = [];
      this.setData({ recommendDishes: [] });
      return;
    }

    const dishes = safeArray((r.data && r.data.dishes) || []).map(this.mapBackendDish.bind(this));

    const f = this.data.selectedFilters || {};
    let filtered = dishes;

    if (f.nutrition && f.nutrition !== '不限' && f.taste && f.taste !== '不限') {
      filtered = filtered.filter(x => safeArray(x.tags).indexOf(f.taste) >= 0);
    }

    filtered = this.clientFilterForRecommend(filtered);
    filtered = this.applyPrefsToDishes(filtered);
    filtered = filtered.filter(x => !x.blocked);

    this._recommendPool = filtered;

    // ✅有了池子后，再补一次 prefs 的 name（避免 prefs 只有 id）
    const pref = this._prefs || { favorites: [], blocked: [] };
    this._prefs = {
      favorites: this._hydratePrefNames(pref.favorites || []),
      blocked: this._hydratePrefNames(pref.blocked || [])
    };
    if (this.data.modalVisible) this.refreshModalList();
  },

  // =========================
  // ✅随机推荐（原逻辑保留：最多6个）
  // =========================
  generateRecommendDishes() {
    const pool = (this._recommendPool || []).filter(x => !x.blocked);
    if (!pool.length) {
      this.setData({ recommendDishes: [] });
      return;
    }

    const arr = pool.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }

    const N = 6;
    const pick = arr.slice(0, Math.min(N, arr.length));
    this.setData({ recommendDishes: pick });
  },

  generateRecommendations() {
    this.generateRecommendDishes();
  },

  async loadMenuDishes() {
    const f = this.data.selectedMenuFilters || {};

    const mealType = this.mapMealTypeCNToEn(f.type);
    const canteenId = this.mapCanteenNameToId(f.canteen);
    const params = {};
    if (mealType) params.mealType = mealType;
    if (canteenId) params.canteenId = canteenId;

    const windowText = f.window;

    const r = await this.callCloud('getDishes', params);
    if (r.code !== 200 && r.code !== 0) {
      this._menuPool = [];
      this.setData({ menuDishes: [] });
      return;
    }

    let dishes = safeArray((r.data && r.data.dishes) || []).map(this.mapBackendDish.bind(this));

    // 兜底：后端没按 canteenId 过滤时，前端再补一遍
    if (!canteenId && f.canteen && f.canteen !== '不限') {
      dishes = dishes.filter(x => x.canteenName === f.canteen);
    }

    // ✅ window 改为按 tags 判定（与 loadRecommendPool 一致）
    if (windowText && windowText !== '不限') {
      dishes = dishes.filter(x => safeArray(x.tags).indexOf(windowText) >= 0);
    }

    dishes = this.applyPrefsToDishes(dishes).filter(x => !x.blocked);

    this._menuPool = dishes;
    this.setData({ menuDishes: dishes });

    // ✅菜单池也能补 prefs 名字
    const pref = this._prefs || { favorites: [], blocked: [] };
    this._prefs = {
      favorites: this._hydratePrefNames(pref.favorites || []),
      blocked: this._hydratePrefNames(pref.blocked || [])
    };
    if (this.data.modalVisible) this.refreshModalList();
  },

  // =========================
  // ✅AI 推荐：仅 onGenerate 调用
  // - 只保留“符合当前 filter”的：必须出现在 _recommendPool 里
  // - AI 无有效结果 => 返回 false，让外层走随机
  // =========================
  _getUserProfileForAI() {
    // 你们本地 userData 的结构（mine/index 里保存的）
    const userData = wx.getStorageSync('userData') || {};
    const genderCN = String(userData.gender || '男').trim();
    const sex = (genderCN === '女') ? 'female' : 'male';

    const age = Number(userData.age) || 21;
    const height = Number(userData.height) || 170;
    const weight = Number(userData.weight) || 60;

    // selectedGoal: lose / maintain / gain
    const goalKey = String(userData.selectedGoal || 'lose').trim();
    let goalCN = '减脂';
    if (goalKey === 'gain') goalCN = '增肌';
    else if (goalKey === 'maintain') goalCN = '维持';

    return { sex, age, height, weight, goal: goalCN };
  },

  _getMealTypeForAI() {
    // 优先取 selectedFilters.time，其次取快捷标签
    const f = this.data.selectedFilters || {};
    const mealFromFilter = this.mapMealTypeCNToEn(f.time);
    if (mealFromFilter) return mealFromFilter;

    const qt = String(this.data.activeQuickTag || '').trim();
    if (qt === 'breakfast' || qt === 'lunch' || qt === 'dinner') return qt;

    return 'lunch';
  },

  _getBudgetForAI() {
    const f = this.data.selectedFilters || {};
    const maxPrice = this.parseMaxPrice(f.price);
    if (typeof maxPrice === 'number' && !isNaN(maxPrice) && maxPrice > 0) return maxPrice;

    const qt = String(this.data.activeQuickTag || '').trim();
    if (qt === 'lt5') return 5;
    if (qt === 'lt10') return 10;

    return 20; // 默认
  },

  async _tryAiRecommendAndSet() {
    // 关键：只从当前池子里挑，保证“符合当前 filter”
    const pool = (this._recommendPool || []).filter(x => !x.blocked);
    if (!pool.length) return false;

    const mealType = this._getMealTypeForAI();
    const budget = this._getBudgetForAI();
    const userProfile = this._getUserProfileForAI();

    // 你也可以根据 quickTag/筛选调一下 maxCaloriesPerMeal
    // 这里给一个轻量策略：低脂 => 更低热量上限
    const activeQT = String(this.data.activeQuickTag || '').trim();
    const maxCaloriesPerMeal = (activeQT === 'lowfat') ? 600 : 800;

    let aiResp;
    try {
      aiResp = await this.callCloud('aiRecommend', {
        type: 'diet',
        mealType,
        budget,
        maxCaloriesPerMeal,
        minProtein: 20,
        userProfile
      });
    } catch (e) {
      console.warn('[aiRecommend] call fail:', e);
      return false;
    }

    if (!aiResp || aiResp.code !== 200 || !aiResp.data) return false;

    const items = safeArray(aiResp.data.items);
    if (!items.length) return false;

    // poolMap：只要在池子里就算符合当前 filter
    const poolMap = {};
    pool.forEach(d => {
      const id = String(d.id || '').trim();
      if (id) poolMap[id] = d;
    });

    // 依 AI 顺序挑，去重，最多 6
    const picked = [];
    const seen = {};
    items.forEach(it => {
      const sid = String(it.sourceId || '').trim();
      if (!sid || seen[sid]) return;
      const hit = poolMap[sid];
      if (!hit) return; // 不在当前 filter 池里 => 丢弃
      seen[sid] = true;

      // 保持原 dish 结构，额外挂一个 reason（不影响你现有 UI；以后想展示可用）
      picked.push({
        ...hit,
        aiReason: String(it.reason || '').trim()
      });
    });

    const finalList = picked.slice(0, 6);
    if (!finalList.length) return false;

    this.setData({ recommendDishes: finalList });
    return true;
  },

  // =========================
  // Tab 切换
  // =========================
  async onSubTabTap(e) {
    const tab = e.currentTarget.dataset.tab;
    if (!tab || tab === this.data.activeTab) return;

    this.setData({
      activeTab: tab,
      dropdownVisible: false,
      menuDropdownVisible: false
    });

    wx.showLoading({ title: '加载中...' });
    try {
      await this.loadDishPreferences();
      if (tab === 'recommend') {
        await this.loadRecommendPool();
        this.generateRecommendDishes(); // ✅切回推荐 tab 仍走随机
      } else {
        await this.loadMenuDishes();
      }
    } catch (e2) {
      console.error('[onSubTabTap] error:', e2);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // =========================
  // 推荐tab筛选交互
  // =========================
  onFilterHeaderTap(e) {
    const filter = e.currentTarget.dataset.type;
    if (!filter) return;

    const isSame = this.data.dropdownVisible && this.data.activeFilter === filter;
    const nextVisible = !isSame;

    this.setData({
      activeFilter: nextVisible ? filter : '',
      dropdownVisible: nextVisible,
      dropdownOptions: nextVisible ? (this.data.filterOptions[filter] || []) : [],
      currentDropdownSelected: nextVisible ? (this.data.selectedFilters[filter] || '') : ''
    });
  },

  // ✅筛选：不调用AI，只走“拉池子 + 随机”
  async onDropdownOptionTap(e) {
    const option = e.currentTarget.dataset.value;
    const filter = this.data.activeFilter;
    if (!filter || option === undefined) return;

    const selectedFilters = Object.assign({}, this.data.selectedFilters);
    const nextValue = (option === '不限' || selectedFilters[filter] === option) ? '' : option;
    selectedFilters[filter] = nextValue;

    this.setData({
      selectedFilters,
      dropdownVisible: false,
      activeFilter: '',
      dropdownOptions: [],
      currentDropdownSelected: ''
    });

    wx.showLoading({ title: '加载中...' });
    try {
      await this.loadRecommendPool();
      this.generateRecommendDishes(); // ✅只随机
    } catch (err) {
      console.error('[recommend] refresh error:', err);
      wx.showToast({ title: '刷新失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // ✅快捷标签：不调用AI，只走“拉池子 + 随机”
  async onQuickTagTap(e) {
    const tagValue = e.currentTarget.dataset.value;
    if (!tagValue) return;

    const isSame = this.data.activeQuickTag === tagValue;
    const activeQuickTag = isSame ? '' : tagValue;

    const selectedFilters = Object.assign({}, this.data.selectedFilters);

    const tagToFilterMap = {
      breakfast: { type: 'time', value: '早餐' },
      lunch: { type: 'time', value: '午餐' },
      dinner: { type: 'time', value: '晚餐' },
      lowfat: { type: 'nutrition', value: '低脂' },
      mild: { type: 'taste', value: '微辣' },
      lt5: { type: 'price', value: '≤5元' },
      lt10: { type: 'price', value: '≤10元' }
    };

    const map = tagToFilterMap[tagValue];
    if (map) {
      selectedFilters[map.type] = isSame ? '' : map.value;
    }

    this.setData({ activeQuickTag, selectedFilters });

    wx.showLoading({ title: '加载中...' });
    try {
      await this.loadRecommendPool();
      this.generateRecommendDishes(); // ✅只随机
    } catch (err) {
      console.error('[quickTag] refresh error:', err);
      wx.showToast({ title: '刷新失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // =========================
  // ✅“一键生成今日推荐”：只在这里调用 AI
  // =========================
  async onGenerate() {
    wx.showLoading({ title: '生成中...' });

    try {
      // 先确保池子是当前 filter 对应的
      await this.loadDishPreferences();
      await this.loadRecommendPool();

      // 先试 AI；不行就回退随机
      const ok = await this._tryAiRecommendAndSet();
      if (!ok) {
        this.generateRecommendDishes();
      }
    } catch (e) {
      console.error('[onGenerate] error:', e);
      this.generateRecommendDishes();
    } finally {
      wx.hideLoading();
    }
  },

  // =========================
  // 菜单tab筛选交互
  // =========================
  onCanteenTap() { this.openMenuDropdown('canteen'); },
  onWindowTap() { this.openMenuDropdown('window'); },
  onTypeTap() { this.openMenuDropdown('type'); },

  openMenuDropdown(type) {
    const { menuDropdownVisible, activeMenuFilter, menuFilterOptions, selectedMenuFilters } = this.data;

    const visible = !(menuDropdownVisible && activeMenuFilter === type);

    if (!visible) {
      this.setData({
        menuDropdownVisible: false,
        activeMenuFilter: '',
        menuDropdownOptions: [],
        currentMenuDropdownSelected: ''
      });
      return;
    }

    if (type === 'canteen') {
      const canteenOpt = menuFilterOptions.canteen || [];
      const options = [];

      if (canteenOpt.length && typeof canteenOpt[0] === 'object' && canteenOpt[0].category) {
        canteenOpt.forEach(category => {
          options.push({ type: 'category', label: category.category });
          (category.items || []).forEach(item => {
            options.push({ type: 'item', label: item, category: category.category });
          });
        });
      } else {
        canteenOpt.forEach(item => {
          options.push({ type: 'item', label: item });
        });
      }

      this.setData({
        menuDropdownVisible: true,
        activeMenuFilter: type,
        menuDropdownOptions: options,
        currentMenuDropdownSelected: selectedMenuFilters[type] || ''
      });
    } else {
      this.setData({
        menuDropdownVisible: true,
        activeMenuFilter: type,
        menuDropdownOptions: (menuFilterOptions[type] || []),
        currentMenuDropdownSelected: selectedMenuFilters[type] || ''
      });
    }
  },

  async onMenuDropdownOptionTap(e) {
    const { index } = e.currentTarget.dataset;
    const { activeMenuFilter, menuDropdownOptions } = this.data;

    if (!activeMenuFilter) return;

    const option = menuDropdownOptions[index];
    if (!option) return;
    if (option.type === 'category') return;

    const value = option.label || option;

    const selectedMenuFilters = Object.assign({}, this.data.selectedMenuFilters || {});
    if (selectedMenuFilters[activeMenuFilter] === value) selectedMenuFilters[activeMenuFilter] = '';
    else selectedMenuFilters[activeMenuFilter] = value;

    this.setData({
      selectedMenuFilters,
      menuDropdownVisible: false,
      activeMenuFilter: '',
      menuDropdownOptions: [],
      currentMenuDropdownSelected: ''
    });

    wx.showLoading({ title: '筛选中...' });
    try {
      await this.loadMenuDishes();
      this.setData({ lastUpdate: this.formatNow() });
    } catch (err) {
      console.error('[menuFilter] loadMenuDishes error:', err);
      wx.showToast({ title: '筛选失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // =========================
  // 交互：收藏/拉黑/详情
  // =========================
  onLikeDishFromRecommend(e) {
    const idx = e.detail ? e.detail.index : -1;
    const dish = (this.data.recommendDishes || [])[idx];
    if (!dish) return;
    this.togglePreference(dish.id, 'favorite', dish.name);
  },

  onBlockDishFromRecommend(e) {
    const idx = e.detail ? e.detail.index : -1;
    const dish = (this.data.recommendDishes || [])[idx];
    if (!dish) return;
    this.togglePreference(dish.id, 'blocked', dish.name);
  },

  onLikeDishFromMenu(e) {
    const idx = e.detail ? e.detail.index : -1;
    const dish = (this.data.menuDishes || [])[idx];
    if (!dish) return;
    this.togglePreference(dish.id, 'favorite', dish.name);
  },

  onBlockDishFromMenu(e) {
    const idx = e.detail ? e.detail.index : -1;
    const dish = (this.data.menuDishes || [])[idx];
    if (!dish) return;
    this.togglePreference(dish.id, 'blocked', dish.name);
  },

  onDishTap(e) {
    const { index } = e.detail || {};
    const dish = (this.data.menuDishes || [])[index];
    if (!dish) return;
    this.setData({
      detailModalVisible: true,
      detailDish: dish
    });
  },

  onCloseDetailModal() {
    this.setData({
      detailModalVisible: false,
      detailDish: null
    });
  },

  // =========================
  // 收藏/拉黑列表弹窗
  // =========================
  async onOpenFavorites() {
    await this.loadDishPreferences();
    this.setData({ modalVisible: true, modalType: 'favorites' });
    this.refreshModalList();
  },

  async onOpenBlockList() {
    await this.loadDishPreferences();
    this.setData({ modalVisible: true, modalType: 'blocked' });
    this.refreshModalList();
  },

  onCloseModal() {
    this.setData({ modalVisible: false, modalType: '' });
  },
  onCloseFavorites() { this.onCloseModal(); },
  onCloseBlockList() { this.onCloseModal(); },

  refreshModalList() {
    const pref = this._prefs || { favorites: [], blocked: [] };

    const fav = this._hydratePrefNames(pref.favorites || []);
    const blk = this._hydratePrefNames(pref.blocked || []);
    this._prefs = { favorites: fav, blocked: blk };

    const favorites = fav.map(it => ({
      id: String(it.id),
      name: String(it.name || '（未命名菜品）')
    })).filter(x => x.id);

    const blocked = blk.map(it => ({
      id: String(it.id),
      name: String(it.name || '（未命名菜品）')
    })).filter(x => x.id);

    this.setData({
      favoriteDishes: favorites,
      blockedDishes: blocked
    });
  },

  async onRemoveFromFavorites(e) {
    const index = e.currentTarget.dataset.index;
    const item = (this.data.favoriteDishes || [])[index];
    if (!item || !item.id) return;

    wx.showLoading({ title: '取消中...' });
    try {
      await this.togglePreference(item.id, 'favorite', item.name);
      wx.showToast({ title: '已取消收藏', icon: 'success' });
    } catch (err) {
      console.error('[onRemoveFromFavorites] error:', err);
      wx.showToast({ title: '操作失败', icon: 'none' });
    } finally {
      await this.sleep(800);
      wx.hideLoading();
    }
    this.refreshModalList();
  },

  async onRemoveFromBlocked(e) {
    const index = e.currentTarget.dataset.index;
    const item = (this.data.blockedDishes || [])[index];
    if (!item || !item.id) return;

    wx.showLoading({ title: '取消中...' });
    try {
      await this.togglePreference(item.id, 'blocked', item.name);
      wx.showToast({ title: '已移出拉黑', icon: 'success' });
    } catch (err) {
      console.error('[onRemoveFromBlocked] error:', err);
      wx.showToast({ title: '操作失败', icon: 'none' });
    } finally {
      await this.sleep(800);
      wx.hideLoading();
    }
    this.refreshModalList();
  },

  onLikeDishFromModal(e) {
    const dish = (e && e.detail && e.detail.dish) ? e.detail.dish : this.data.detailDish;
    if (!dish) return;
    this.togglePreference(dish.id, 'favorite', dish.name);
  },

  onBlockDishFromModal(e) {
    const dish = (e && e.detail && e.detail.dish) ? e.detail.dish : this.data.detailDish;
    if (!dish) return;
    this.togglePreference(dish.id, 'blocked', dish.name);
  },

  // =========================
  // 评分（本地展示，不入库）
  // =========================
  onRateDish(e) {
    const dish = e.detail ? e.detail.dish : null;
    const rating = e.detail ? e.detail.rating : null;
    if (!dish || rating === null || rating === undefined) return;

    dish.rating = rating;
    this.syncDishFlagsEverywhere(String(dish.id));
    this.setData({ detailDish: dish });
  },

  // =========================
  // “加入今日饮食” -> addMeal
  // =========================
  formatNow() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${hh}:${mm}`;
  },

  _getUserIdForMeal() {
    return this.getUserId();
  },

  _getTodayStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  _normalizeMealType(mt) {
    const s = String(mt || '').trim().toLowerCase();
    if (s === 'breakfast' || s === 'lunch' || s === 'dinner') return s;
    return 'lunch';
  },

  async _addMealByDish(dish) {
    const userId = this._getUserIdForMeal();
    if (!userId) {
      wx.showToast({ title: '未获取到用户信息，请先登录', icon: 'none' });
      return;
    }

    const date = this._getTodayStr();
    const mealType = this._normalizeMealType(dish.mealType);
    const foodName = String(dish.name || dish.foodName || '').trim();
    const kcalNum = Number(dish.kcal);
    const kcal = Number.isFinite(kcalNum) ? kcalNum : 0;

    if (!foodName) {
      wx.showToast({ title: '菜品信息缺失', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '加入中...' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'addMeal',
        data: { userId, date, mealType, foodName, kcal }
      });

      const r = res && res.result ? res.result : {};
      if (r.code === 200) {
        wx.showToast({ title: '已加入今日饮食', icon: 'success' });
      } else {
        wx.showToast({ title: r.message || '添加失败', icon: 'none' });
        console.error('[addMeal] failed:', r);
      }
    } catch (err) {
      console.error('[addMeal] error:', err);
      wx.showToast({ title: (err && err.errMsg) ? err.errMsg : '添加失败', icon: 'none' });
    } finally {
      await this.sleep(800);
      wx.hideLoading();
    }
  },

  async onAddMealFromRecommend(e) {
    const idx = e.detail ? e.detail.index : -1;
    const dish = (this.data.recommendDishes || [])[idx];
    if (!dish) return;
    await this._addMealByDish(dish);
  },

  async onAddMealFromMenu(e) {
    const idx = e.detail ? e.detail.index : -1;
    const dish = (this.data.menuDishes || [])[idx];
    if (!dish) return;
    await this._addMealByDish(dish);
  },

  async onAddMealFromModal(e) {
    const dish = e.detail ? e.detail.dish : null;
    if (!dish) return;
    await this._addMealByDish(dish);
  },

  // =========================
  // Debug：一键 seed
  // =========================
  async onSeedDishes() {
    wx.showLoading({ title: 'Seeding...' });
    try {
      const r = await this.callCloud('seedDishes', {});
      if (r.code === 200 || r.code === 0) {
        wx.showToast({ title: 'Seed 成功', icon: 'success' });
        await this.refreshCurrentTab();
      } else {
        wx.showToast({ title: r.message || 'Seed 失败', icon: 'none' });
      }
    } catch (e) {
      console.error('[seedDishes] error:', e);
      wx.showToast({ title: 'Seed 失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  }
});
