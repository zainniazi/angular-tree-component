import { Injectable } from '@angular/core';
import { observable, computed, action, autorun } from 'mobx';
import { TreeModel } from './tree.model';

const Y_OFFSET = 200;
const Y_DIVIDER = 100;

@Injectable()
export class TreeVirtualScroll {
  private _dispose: any;

  @observable yBlocks = 0;
  @observable x = 0;
  @observable viewportHeight = null;
  viewport = null;

  @computed get y() {
    return this.yBlocks * Y_DIVIDER;
  }

  @computed get totalHeight() {
    return this.treeModel.virtualRoot ? this.treeModel.virtualRoot.height : 0;
  }

  @computed.struct get viewportNodes() {
    return this.getViewportNodes(this.treeModel.roots);
  }

  @computed get translateY() {
    return this.viewportNodes[0] ? this.viewportNodes[0].position + this.y : 0;
  }

  constructor(private treeModel: TreeModel) {
    treeModel.virtualScroll = this;
    this._dispose = autorun(() => this.fixScroll());
  }

  clear() {
    this._dispose();
  }

  @action setNewScroll({ viewport }) {
    Object.assign(this, {
      viewport,
      x: viewport.scrollLeft,
      yBlocks: Math.round(viewport.scrollTop / Y_DIVIDER),
      viewportHeight: viewport.getBoundingClientRect().height
    });
  }

  @action scrollIntoView(node, force, scrollToMiddle = true) {
    if (force || // force scroll to node
      node.position < this.y || // node is above viewport
      node.position + node.getSelfHeight() > this.y + this.viewportHeight) { // node is below viewport
      this.viewport.scrollTop = scrollToMiddle ?
        node.position - this.viewportHeight / 2 : // scroll to middle
        node.position; // scroll to start

      this.yBlocks = Math.floor(this.viewport.scrollTop / Y_DIVIDER);
    }
  }

  getViewportNodes(nodes) {
    if (!this.viewportHeight) return [];

    // Search for first node in the viewport using binary search
    // Look for first node that starts after the beginning of the viewport (with buffer)
    // Or that ends after the beginning of the viewport
    const firstIndex = binarySearch(nodes, (node) => {
      return (node.position + Y_OFFSET > this.y) ||
             (node.position + node.height > this.y);
    });

    // Search for last node in the viewport using binary search
    // Look for first node that starts after the end of the viewport (with buffer)
    const lastIndex = binarySearch(nodes, (node) => {
      return node.position - Y_OFFSET > this.y + this.viewportHeight;
    }, firstIndex);

    const viewportNodes = [];
    for (let i = firstIndex; i <= lastIndex; i++) {
      viewportNodes.push(nodes[i]);
    }

    return viewportNodes;
  }

  fixScroll() {
    const maxY = Math.max(0, this.totalHeight - this.viewportHeight);

    if (this.y < 0) this.yBlocks = 0;
    if (this.y > maxY) this.yBlocks = maxY / Y_DIVIDER;
  }
}

function binarySearch(nodes, condition, firstIndex = 0) {
  let index = firstIndex;
  let toIndex = nodes.length - 1;

  while (index !== toIndex) {
    let midIndex = Math.floor((index + toIndex) / 2);

    if (condition(nodes[midIndex])) {
      toIndex = midIndex;
    }
    else {
      if (index === midIndex) index = toIndex;
      else index = midIndex;
    }
  }
  return index;
}
