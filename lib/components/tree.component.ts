import {
  Component, Input, Output, OnChanges, SimpleChange, EventEmitter, ElementRef, ViewChild,
  ViewEncapsulation, ContentChild, TemplateRef, HostListener, ChangeDetectionStrategy
} from '@angular/core';
import { TreeModel } from '../models/tree.model';
import { TreeNode } from '../models/tree-node.model';
import { TreeDraggedElement } from '../models/tree-dragged-element.model';
import { TreeOptions } from '../models/tree-options.model';
import { KEYS } from '../constants/keys';

import * as _ from 'lodash';

const Y_OFFSET = 200;
const support = {
  hasWheelEvent: document && ('onwheel' in document),
  hasMouseWheelEvent: document && ('onmousewheel' in document),
  hasTouch: document && ('ontouchstart' in document),
  hasTouchWin: navigator && navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 1,
  hasPointer: window && window.navigator && !!window.navigator.msPointerEnabled,
  hasKeyDown: document && ('onkeydown' in document),
  isFirefox: navigator && navigator.userAgent && navigator.userAgent.indexOf('Firefox') > -1
};

const options = {
    mouseMultiplier: 1,
    touchMultiplier: 2,
    firefoxMultiplier: 15,
    keyStep: 120,
    preventTouch: false,
    unpreventTouchClass: 'vs-touchmove-allowed',
    limitInertia: false
};

@Component({
  selector: 'Tree',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.Default,
  providers: [TreeModel],
  styles: [
    '.tree-children { padding-left: 20px }',
    '.empty-tree-drop-slot .node-drop-slot { height: 20px; min-width: 100px }',
    `.tree-viewport {
      height: 100%;
      overflow-x: scroll;
      overflow-y: hidden;
    }`,
    `.tree {
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
    <div class="tree-viewport" #viewport>
      <div
        #treeElement
        [style.transform]="_getTranslate()"
        class="tree"
        [class.node-dragging]="treeDraggedElement.isDragging()">
        <TreeNode
          *ngFor="let node of viewportNodes"
          [node]="node"
          [index]="node.index"
          [templates]="{
            loadingTemplate: loadingTemplate,
            treeNodeTemplate: treeNodeTemplate,
            treeNodeFullTemplate: treeNodeFullTemplate
          }">
        </TreeNode>
        <TreeNodeDropSlot
          class="empty-tree-drop-slot"
          *ngIf="treeModel.isEmptyTree()"
          [dropIndex]="0"
          [node]="treeModel.virtualRoot">
        </TreeNodeDropSlot>
      </div>
    </div>
  `
})
export class TreeComponent implements OnChanges {
  _nodes: any[];
  _options: TreeOptions;

  _scrollPosition = {
    y: 0,
    x: 0,
    deltaX: 0,
    deltaY: 0,
    minX: 0,
    minY: 0,
    maxX: 0,
    maxY: 0,
    translateY: 0
  };

  viewportNodes: TreeNode[];

  @ViewChild('viewport') viewport;
  @ViewChild('treeElement') treeElement;

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

  constructor(public treeModel: TreeModel, public treeDraggedElement: TreeDraggedElement, private elementRef: ElementRef) {
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

    if (changes.nodes) {
      this._calcViewPortNodes();
    }
  }

  @HostListener('wheel', ['$event'])
  onWheel(e) {
    const evt = this._scrollPosition;
    evt.deltaX = e.wheelDeltaX || e.deltaX * -1;
    evt.deltaY = e.wheelDeltaY || e.deltaY * -1;

    // for our purpose deltamode = 1 means user is on a wheel mouse, not touch pad
    // real meaning: https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent#Delta_modes
    if (support.isFirefox && e.deltaMode == 1) {
      evt.deltaX *= options.firefoxMultiplier;
      evt.deltaY *= options.firefoxMultiplier;
    }

    evt.deltaX *= options.mouseMultiplier;
    evt.deltaY *= options.mouseMultiplier;

    this._recalcViewPort(e);
  }

  @HostListener('mousewheel', ['$event'])
  onMouseWheel(e) {
    const evt = this._scrollPosition;

    // In Safari, IE and in Chrome if 'wheel' isn't defined
    evt.deltaX = (e.wheelDeltaX) ? e.wheelDeltaX : 0;
    evt.deltaY = (e.wheelDeltaY) ? e.wheelDeltaY : e.wheelDelta;

    this._recalcViewPort(e);
  }

  _recalcViewPort(e) {
    e.preventDefault();

    const rect = this.viewport.nativeElement.getBoundingClientRect();
    const innerRect = this.treeElement.nativeElement.getBoundingClientRect();
    const totalHeight = this.treeModel.virtualRoot.getHeight();
    const evt = this._scrollPosition;

    evt.minX = 0;
    evt.minY = 0;
    evt.maxX = Math.max(innerRect.width - rect.width, 0);
    evt.maxY = Math.max(totalHeight - rect.height, 0);

    evt.x += evt.deltaX;
    evt.y += evt.deltaY;

    evt.x = Math.min(evt.x, -evt.minX);
    evt.x = Math.max(evt.x, -evt.maxX);
    evt.y = Math.min(evt.y, -evt.minY);
    evt.y = Math.max(evt.y, -evt.maxY);

    this._calcViewPortNodes();
  }

  _getTranslate() {
    return `translate(${this._scrollPosition.x}px, ${this._scrollPosition.translateY}px)`;
  }

  _calcViewPortNodes() {
    const rect = this.viewport.nativeElement.getBoundingClientRect();

    const y = -this._scrollPosition.y;

    let i = 0;
    let node = this.treeModel.roots[i];
    let nodePosition = 0;
    let found = false;

    while(!found) {
      if (nodePosition + Y_OFFSET > y) {
        found = true;
      }
      else {
        nodePosition += node.getHeight();
        node = this.treeModel.roots[++i];
      }
    }
    const nodes = [];
    const firstNodePosition = nodePosition;

    found = false;
    while(!found) {
      nodes.push(node);
      if ((nodePosition - Y_OFFSET > y + rect.height) ||
        (i >= this.treeModel.roots.length - 1)) {
        found = true;
      }
      else {
        nodePosition += node.getHeight();
        node = this.treeModel.roots[++i];
      }
    }

    this.viewportNodes = nodes;
    this._scrollPosition.translateY = firstNodePosition - y;
  }
}
