// pages/forum/info-detail/info-detail.js
Page({
  data: {
    statusBarHeight: 0,
    navbarHeight: 132,
    articleId: null,
    article: {},
    comments: [],
    commentText: '',
    replyingTo: null,
    replyingCommentId: null
  },

  onLoad(options) {
    // 获取状态栏高度
    const systemInfo = wx.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight || 0;
    const navbarHeight = statusBarHeight + 88;
    
    this.setData({
      statusBarHeight: statusBarHeight,
      navbarHeight: navbarHeight,
      articleId: options.id
    });

    // 加载资讯数据
    this.loadArticleData();
  },

  // 加载资讯数据
  loadArticleData() {
    // 从论坛页面获取资讯数据
    const pages = getCurrentPages();
    const forumPage = pages.find(page => page.route === 'pages/forum/forum/forum');
    
    if (forumPage) {
      const article = forumPage.data.articles.find(a => a.id === parseInt(this.data.articleId));
      if (article) {
        // 从本地存储加载评论数
        const articleCommentsKey = `article_${this.data.articleId}_comments`;
        const comments = wx.getStorageSync(articleCommentsKey) || [];
        const totalComments = comments.reduce((total, comment) => {
          return total + 1 + (comment.replies ? comment.replies.length : 0);
        }, 0);
        
        this.setData({ 
          article: { 
            ...article, 
            comments: totalComments || article.comments || 0
          }
        });
        this.loadComments();
        return;
      }
    }

    // 如果没有找到，使用默认数据
    const defaultArticle = {
      id: parseInt(this.data.articleId),
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
    };
    
    this.setData({ article: defaultArticle });
    this.loadComments();
  },

  // 加载评论
  loadComments() {
    const articleId = this.data.articleId;
    const currentAccount = wx.getStorageSync('currentAccount') || '';
    const userInfo = wx.getStorageSync('userInfo') || {};
    const currentUser = userInfo.nickName || currentAccount;
    
    // 从本地存储加载该资讯的评论
    const articleCommentsKey = `article_${articleId}_comments`;
    let comments = wx.getStorageSync(articleCommentsKey) || [];
    
    // 如果没有评论数据，初始化为空数组
    if (comments.length === 0) {
      comments = [];
    }
    
    // 标记哪些是自己的评论
    comments = comments.map(comment => ({
      ...comment,
      isMine: comment.author === currentUser
    }));
    
    // 更新资讯评论数（包括回复）
    const totalComments = comments.reduce((total, comment) => {
      return total + 1 + (comment.replies ? comment.replies.length : 0);
    }, 0);
    
    const article = {
      ...this.data.article,
      comments: totalComments
    };
    
    this.setData({ 
      comments,
      article
    });
    
    // 同步到论坛页面
    const pages = getCurrentPages();
    const forumPage = pages.find(page => page.route === 'pages/forum/forum/forum');
    if (forumPage) {
      const articles = forumPage.data.articles.map(a => {
        if (a.id === article.id) {
          return { ...a, comments: totalComments };
        }
        return a;
      });
      forumPage.setData({ articles });
    }
  },

  // 评论输入
  onCommentInput(e) {
    this.setData({
      commentText: e.detail.value
    });
  },

  // 评论输入框聚焦
  onCommentInputFocus() {
    // 聚焦输入框
  },

  // 评论输入框失焦
  onCommentInputBlur() {
    // 失焦处理
  },

  // 提交评论
  onSubmitComment() {
    const commentText = this.data.commentText.trim();
    if (!commentText) {
      wx.showToast({
        title: '请输入评论内容',
        icon: 'none'
      });
      return;
    }

    // 获取当前用户信息
    const currentAccount = wx.getStorageSync('currentAccount') || '游客';
    const userInfo = wx.getStorageSync('userInfo') || {};
    const currentUser = userInfo.nickName || currentAccount;
    
    const articleId = this.data.articleId;
    const articleCommentsKey = `article_${articleId}_comments`;
    
    if (this.data.replyingCommentId) {
      // 回复评论
      const comments = this.data.comments.map(comment => {
        if (comment.id === this.data.replyingCommentId) {
          const replies = comment.replies || [];
          replies.push({
            id: Date.now(),
            author: currentUser,
            content: commentText
          });
          return { ...comment, replies };
        }
        return comment;
      });
      
      // 保存到本地存储
      wx.setStorageSync(articleCommentsKey, comments);
      
      // 计算总评论数（包括回复）
      const totalComments = comments.reduce((total, comment) => {
        return total + 1 + (comment.replies ? comment.replies.length : 0);
      }, 0);
      
      const article = {
        ...this.data.article,
        comments: totalComments
      };
      
      this.setData({
        comments,
        article,
        commentText: '',
        replyingTo: null,
        replyingCommentId: null
      });
      
      // 同步到论坛页面
      const pages = getCurrentPages();
      const forumPage = pages.find(page => page.route === 'pages/forum/forum/forum');
      if (forumPage) {
        const articles = forumPage.data.articles.map(a => {
          if (a.id === article.id) {
            return { ...a, comments: totalComments };
          }
          return a;
        });
        forumPage.setData({ articles });
      }
    } else {
      // 新评论
      const newComment = {
        id: Date.now(),
        author: currentUser,
        avatar: userInfo.avatarUrl || '/images/tabbar/mine.png',
        time: '刚刚',
        content: commentText,
        likes: 0,
        liked: false,
        replies: [],
        isMine: true
      };

      const comments = [newComment, ...this.data.comments];
      
      // 保存到本地存储
      wx.setStorageSync(articleCommentsKey, comments);
      
      // 计算总评论数（包括回复）
      const totalComments = comments.reduce((total, comment) => {
        return total + 1 + (comment.replies ? comment.replies.length : 0);
      }, 0);
      
      const article = {
        ...this.data.article,
        comments: totalComments
      };

      this.setData({
        comments,
        article,
        commentText: ''
      });

      // 同步到论坛页面
      const pages = getCurrentPages();
      const forumPage = pages.find(page => page.route === 'pages/forum/forum/forum');
      if (forumPage) {
        const articles = forumPage.data.articles.map(a => {
          if (a.id === article.id) {
            return { ...a, comments: totalComments };
          }
          return a;
        });
        forumPage.setData({ articles });
      }
    }

    wx.showToast({
      title: this.data.replyingCommentId ? '回复成功' : '评论成功',
      icon: 'success'
    });
  },

  // 评论点赞
  onCommentLikeTap(e) {
    const commentId = e.currentTarget.dataset.commentId;
    const articleId = this.data.articleId;
    const articleCommentsKey = `article_${articleId}_comments`;
    
    const comments = this.data.comments.map(comment => {
      if (comment.id === commentId) {
        const liked = !comment.liked;
        return {
          ...comment,
          liked: liked,
          likes: liked ? (comment.likes || 0) + 1 : Math.max(0, (comment.likes || 0) - 1)
        };
      }
      return comment;
    });
    
    // 保存到本地存储
    wx.setStorageSync(articleCommentsKey, comments);
    
    this.setData({ comments });
  },

  // 回复评论
  onReplyTap(e) {
    const commentId = e.currentTarget.dataset.commentId;
    const author = e.currentTarget.dataset.author;
    this.setData({
      replyingTo: author,
      replyingCommentId: commentId
    });
  },

  // 删除评论
  onDeleteComment(e) {
    const commentId = e.currentTarget.dataset.commentId;
    const articleId = this.data.articleId;
    const articleCommentsKey = `article_${articleId}_comments`;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条评论吗？',
      success: (res) => {
        if (res.confirm) {
          const comments = this.data.comments.filter(comment => comment.id !== commentId);
          
          // 保存到本地存储
          wx.setStorageSync(articleCommentsKey, comments);
          
          // 计算总评论数（包括回复）
          const totalComments = comments.reduce((total, comment) => {
            return total + 1 + (comment.replies ? comment.replies.length : 0);
          }, 0);
          
          const article = {
            ...this.data.article,
            comments: totalComments
          };
          
          this.setData({
            comments,
            article
          });

          // 同步到论坛页面
          const pages = getCurrentPages();
          const forumPage = pages.find(page => page.route === 'pages/forum/forum/forum');
          if (forumPage) {
            const articles = forumPage.data.articles.map(a => {
              if (a.id === article.id) {
                return { ...a, comments: totalComments };
              }
              return a;
            });
            forumPage.setData({ articles });
          }

          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  },

  // 图片点击
  onImageTap(e) {
    const src = e.currentTarget.dataset.src;
    const images = this.data.article.images || [];
    wx.previewImage({
      current: src,
      urls: images
    });
  },

  // 返回
  onBack() {
    wx.navigateBack();
  }
});

