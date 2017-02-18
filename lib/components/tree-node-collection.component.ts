import {
  Component, Input, ViewEncapsulation, OnInit, OnDestroy
} from '@angular/core';
import { reaction, autorun } from 'mobx';
import { TreeVirtualScroll } from '../models/tree-virtual-scroll.model';
import { TreeNode } from '../models/tree-node.model';

import * as _ from 'lodash';

@Component({
  selector: 'TreeNodeCollection',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div *mobxAutorun>
      <div
        [style.margin-top]="marginTop">
        <TreeNode
          *ngFor="let node of viewportNodes; trackBy: index"
          [node]="node"
          [index]="node.index"
          [templates]="templates">
        </TreeNode>
      </div>
    </div>
  `
})
export class TreeNodeCollectionComponent implements OnInit, OnDestroy {
  @Input() nodes;
  @Input() templates;

  viewportNodes: TreeNode[];
  marginTop: string;

  _dispose = [];

  constructor(private virtualScroll: TreeVirtualScroll) {
  }

  ngOnInit() {
    this._dispose = [
      autorun(() => {
        // If we don't fetch node position serially,
        // then first node to be fetched might be a distnat sibling (like index 5000)
        // and it will cause a stack overflow when calculating recursive attributes
        // such as position or relativePosition
        this.nodes.forEach((node) => node.position);
      }),
      reaction(
        // return node indexes so we can compare structurally,
        () => this.virtualScroll.getViewportNodes(this.nodes).map(n => n.index),
        (nodeIndexes) => {
          this.viewportNodes = nodeIndexes.map((i) => this.nodes[i]);
          this.marginTop = this.viewportNodes[0] ? `${this.viewportNodes[0].relativePosition}px` : '0';
        }, { compareStructural: true, fireImmediately: true }
      )
    ];
  }

  ngOnDestroy() {
    this._dispose.forEach(d => d());
  }
}
