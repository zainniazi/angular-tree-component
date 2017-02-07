import {
  Component, Input, Output, OnChanges, SimpleChange, EventEmitter, ElementRef,
  ViewEncapsulation, ContentChild, TemplateRef, HostListener, ChangeDetectionStrategy
} from '@angular/core';
import { TreeModel } from '../models/tree.model';
import { TreeNode } from '../models/tree-node.model';
import { TreeDraggedElement } from '../models/tree-dragged-element.model';
import { TreeVirtualScroll } from '../models/tree-virtual-scroll.model';
import { TreeOptions } from '../models/tree-options.model';
import { KEYS } from '../constants/keys';

import * as _ from 'lodash';

@Component({
  selector: 'Tree',
  encapsulation: ViewEncapsulation.None,
  providers: [TreeModel, TreeVirtualScroll],
  styles: [
    '.tree-children { padding-left: 20px }',
    '.empty-tree-drop-slot .node-drop-slot { height: 20px; min-width: 100px }',
    `.tree {
      width: 100%;
      position:relative;
      display: inline-block;
      cursor: pointer;
      -webkit-touch-callout: none; /* iOS Safari */
      -webkit-user-select: none;   /* Chrome/Safari/Opera */
      -khtml-user-select: none;    /* Konqueror */
      -moz-user-select: none;      /* Firefox */
      -ms-user-select: none;       /* IE/Edge */
      user-select: none;           /* non-prefixed version, currently not supported by any browser */
    }`
  ],
  template: `
    <TreeViewport>
      <div *mobxAutorun>
        <div
          [style.height]="virtualScroll.totalHeight + 'px'"
          class="tree"
          [class.node-dragging]="treeDraggedElement.isDragging()">
          <TreeNodeCollection
            *ngIf="treeModel.roots"
            [nodes]="treeModel.roots"
            [templates]="{
              loadingTemplate: loadingTemplate,
              treeNodeTemplate: treeNodeTemplate,
              treeNodeFullTemplate: treeNodeFullTemplate
            }">
          </TreeNodeCollection>
          <TreeNodeDropSlot
            class="empty-tree-drop-slot"
            *ngIf="treeModel.isEmptyTree()"
            [dropIndex]="0"
            [node]="treeModel.virtualRoot">
          </TreeNodeDropSlot>
        </div>
      </div>
    </TreeViewport>
  `
})
export class TreeComponent implements OnChanges {
  _nodes: any[];
  _options: TreeOptions;

  @ContentChild('loadingTemplate') loadingTemplate: TemplateRef<any>;
  @ContentChild('treeNodeTemplate') treeNodeTemplate: TemplateRef<any>;
  @ContentChild('treeNodeFullTemplate') treeNodeFullTemplate: TemplateRef<any>;

  // Will be handled in ngOnChanges
  @Input() set nodes(nodes: any[]) { };
  @Input() set options(options: TreeOptions) { };

  @Input() set focused(value: boolean) {
    this.treeModel.setFocus(value);
  }

  @Output() onToggle;
  @Output() onToggleExpanded;
  @Output() onActiveChanged;
  @Output() onActivate;
  @Output() onDeactivate;
  @Output() onFocus;
  @Output() onBlur;
  @Output() onDoubleClick;
  @Output() onContextMenu;
  @Output() onUpdateData;
  @Output() onInitialized;
  @Output() onMoveNode;
  @Output() onEvent;

  constructor(
    public treeModel: TreeModel,
    public treeDraggedElement: TreeDraggedElement,
    private elementRef: ElementRef,
    private virtualScroll:TreeVirtualScroll)
  {
    treeModel.eventNames.forEach((name) => this[name] = new EventEmitter());
  }

  @HostListener('body: keydown', ['$event'])
  onKeydown($event) {
    if (!this.treeModel.isFocused) return;
    if (_.includes(['input', 'textarea'],
        document.activeElement.tagName.toLowerCase())) return;

    const focusedNode = this.treeModel.getFocusedNode();

    this.treeModel.performKeyAction(focusedNode, $event);
  }

  @HostListener('body: mousedown', ['$event'])
  onMousedown($event) {
    let insideClick = $event.target.closest('Tree');
    if (!insideClick) {
      this.treeModel.setFocus(false);
    }
  }

  ngOnChanges(changes) {
    this.treeModel.setData({
      options: changes.options && changes.options.currentValue,
      nodes: changes.nodes && changes.nodes.currentValue,
      events: _.pick(this, this.treeModel.eventNames)
    });
  }
}
