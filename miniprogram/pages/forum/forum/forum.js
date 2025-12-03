// pages/forum/forum/forum.js
Page({
  data: {
    // 顶部论坛 / 资讯
    activeTab: 'forum',
    
    // 论坛排序
    sortType: 'latest', // 'latest' | 'hot'
    
    // 论坛帖子列表
    posts: [
      {
        id: 1,
        author: '麦门信徒',
        time: '5分钟前',
        content: '麦摇摇薯条什么时候回归麦摇摇薯条什么时候回归麦摇摇薯条什么时候回归',
        images: [
          '/images/tabbar/forum.png',
          '/images/tabbar/forum.png',
          '/images/tabbar/forum.png',
          '/images/tabbar/forum.png',
          '/images/tabbar/forum.png'
        ],
        mainImage: '/images/tabbar/forum.png',
        hot: 130,
        likes: 9,
        comments: 12
      },
      {
        id: 2,
        author: '熊 (减脂版)',
        time: '20分钟前',
        content: '好消息: 熊蛋白质拉满了; 坏消息: 牙...',
        images: [],
        mainImage: '',
        hot: 297,
        likes: 13,
        comments: 25
      }
    ],
    
    // 资讯文章列表
    articles: [
      {
        id: 1,
        title: '春天户外运动注意事项',
        snippet: '春暖花开, 正是户外运动的好时节。但也要注意提防花粉过敏和温差变化...',
        images: [
          '/images/tabbar/forum.png',
          '/images/tabbar/forum.png',
          '/images/tabbar/forum.png',
          '/images/tabbar/forum.png'
        ],
        imageCount: 4,
        time: '7小时前',
        comments: 13
      },
      {
        id: 2,
        title: '新手健身入门指南',
        snippet: '想开始健身却不知道从哪练起?先抓住三个核心:1.有氧+力量结合...',
        images: [
          '/images/tabbar/forum.png',
          '/images/tabbar/forum.png'
        ],
        imageCount: 2,
        time: '10小时前',
        comments: 5
      }
    ]
  },

  // 顶部 论坛 / 资讯 tab
  onSubTabTap(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  // 排序切换
  onSortTap(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ sortType: type });
    // TODO: 重新加载数据
  },

  // 发布按钮
  onPublish() {
    wx.showToast({
      title: '发布帖子',
      icon: 'none'
    });
  },

  onLoad() {
    console.log('论坛页面加载');
  }
});
