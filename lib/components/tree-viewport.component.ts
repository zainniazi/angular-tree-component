import {
  Component, ElementRef, ViewEncapsulation, HostListener
} from '@angular/core';
import { TreeVirtualScroll } from '../models/tree-virtual-scroll.model';
import { TreeModel } from '../models/tree.model';

import { throttle } from 'lodash';

const SCROLL_REFRESH_INTERVAL = 17;

const isFirefox = navigator && navigator.userAgent && navigator.userAgent.indexOf('Firefox') > -1;

@Component({
  selector: 'TreeViewport',
  styles: [
    `:host {
      height: 100%;
      overflow: auto;
      display: block;
    }`
  ],
  template: `
    <ng-content></ng-content>
  `
})
export class TreeViewportComponent {
  _debounceOnVirtualScroll:() => void;

  constructor(
    public treeModel: TreeModel,
    private elementRef: ElementRef,
    private virtualScroll:TreeVirtualScroll)
  {
    virtualScroll.setTreeModel(treeModel);

    this._debounceOnVirtualScroll = throttle(this._onVirtualScroll.bind(this), SCROLL_REFRESH_INTERVAL);
  }

  ngAfterViewInit() {
    setTimeout(() => this._onVirtualScroll());
  }

  @HostListener('scroll', ['$event'])
  onScroll(e) {
    this._onWheel(e);
  }

  _onWheel(e) {
    this._debounceOnVirtualScroll();
  }

  _onVirtualScroll() {
    this.virtualScroll.setNewScroll({ viewport: this.elementRef.nativeElement });
  }
}
