import {
  Component, Input, ViewEncapsulation
} from '@angular/core';
import { reaction } from 'mobx';
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
          *ngFor="let node of viewportNodes"
          [node]="node"
          [index]="node.index"
          [templates]="templates">
        </TreeNode>
      </div>
    </div>
  `
})
export class TreeNodeCollectionComponent {
  @Input() nodes;
  @Input() templates;

  viewportNodes:TreeNode[];
  marginTop:string;

  _dispose:any;

  constructor(private virtualScroll:TreeVirtualScroll) {
  }
  ngOnInit() {
    this._dispose = reaction(
      () => this.virtualScroll.getViewportNodes(this.nodes).map(n => n.index),
      (nodeIndexes) => {
        this.viewportNodes = nodeIndexes.map((i) => this.nodes[i]);
        this.marginTop = this.viewportNodes[0] ? `${this.viewportNodes[0].relativePosition}px` : '0';
      }, { compareStructural: true, fireImmediately: true });
  }

  ngOnDestroy() {
    this._dispose();
  }
}
