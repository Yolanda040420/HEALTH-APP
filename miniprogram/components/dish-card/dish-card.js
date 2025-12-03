// components/dish-card/dish-card.js
Component({
  options: {
    addGlobalClass: true
  },
  
  properties: {
    dish: {
      type: Object,
      value: {}
    },
    index: {
      type: Number,
      value: 0
    },
    mode: {
      type: String,
      value: 'recommend' // 'recommend' | 'menu'
    }
  },

  methods: {
    onAddTap() {
      this.triggerEvent('add', { index: this.data.index });
    },
    onLikeTap() {
      this.triggerEvent('like', { index: this.data.index });
    },
    onBlockTap() {
      this.triggerEvent('block', { index: this.data.index });
    },
    onStarTap(e) {
      const score = e.currentTarget.dataset.score;
      this.triggerEvent('rate', { index: this.data.index, score });
    },
    onDetailTap() {
      this.triggerEvent('detail', { index: this.data.index });
    }
  }
});
