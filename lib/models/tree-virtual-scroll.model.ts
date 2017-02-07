import { Injectable } from '@angular/core';
import { observable, computed, action, autorun } from 'mobx';

const Y_OFFSET = 100;

@Injectable()
export class TreeVirtualScroll {
  @observable y = 0;
  @observable x = 0;
  @observable viewportHeight = null;
  @observable treeModel = null;

  @computed get totalHeight() {
    return this.treeModel.virtualRoot ? this.treeModel.virtualRoot.height : 0;
  }

  @computed.struct get viewportNodes() {
    return this.getViewportNodes(this.treeModel.roots);
  }

  @computed get translateY() {
    return this.viewportNodes[0] ? this.viewportNodes[0].position + this.y : 0;
  }

  @action setTreeModel(treeModel) {
    this.treeModel = treeModel;
    autorun(() => this.fixScroll());
  }

  @action setNewScroll({ viewport }) {
    Object.assign(this, {
      x: viewport.scrollLeft,
      y: viewport.scrollTop,
      viewportHeight: viewport.getBoundingClientRect().height
    });
  }

  getViewportNodes(nodes) {
    if (!this.viewportHeight) return [];

    let i = 0;
    let found = false;

    // TODO: binary search to improve performance
    while(!found) {
      if (i >= nodes.length) {
        // could not locate node for some reason. fallback to show all nodes from start
        found = true;
        i = 0;
      }
      else {
        const node = nodes[i];

        if ((node.position + Y_OFFSET > this.y) ||   // node starts after view + buffer starts
            (node.position + node.height > this.y)) {// node ends after view starts
          // node inside of viewport
          found = true;
        }
        else {
          i++;
        }
      }
    }
    const viewportNodes = [];

    found = false;
    // TODO: binary search to improve performance
    while(!found) {
      if (i >= nodes.length) {
        console.log('last', i)
        found = true;
      }
      else {
        const node = nodes[i];
        if (node.position - Y_OFFSET > this.y + this.viewportHeight) {
          // node outside of viewport
          console.log(node.data.name, node.position, this.y)
          found = true;
        }
        else {
          viewportNodes.push(node);
          i++;
        }
      }
    }

    return viewportNodes;
  }

  fixScroll() {
    const maxY = Math.max(0, this.totalHeight - this.viewportHeight);

    if (this.y < 0) this.y = 0;
    if (this.y > maxY) this.y = maxY;
  }
}
