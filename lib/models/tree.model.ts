import { Injectable, Component, Input, EventEmitter, TemplateRef } from '@angular/core';
import { ITreeNodeTemplate } from '../components/tree-node-content.component';
import { TreeNode } from './tree-node.model';
import { TreeOptions } from './tree-options.model';
import { ITreeModel } from '../defs/api';
import { TREE_EVENTS } from '../constants/events';

import { first, last, compact, find, includes, remove, indexOf, pullAt, isString, isFunction } from 'lodash';

export class TreesState {
  @observable focusedTree = null;
}
export const treesState = new TreesState();


@Injectable()
export class TreeModel {
  @observable roots: any[];
  @observable allNodes: {[id:any]:any};
  @observable parents: {[id:any]:any};
  @observable options: ITreeOptions;
  @observable treeState = new TreeState();

  @computed get isFocused(): boolean {
    return treesState.focusedTree === this;
  }

  @computed get expandedNodes(): TreeNode[] {
    return compact(Object.keys(this.treeState.expandedNodeIds)
      .filter((id) => this.treeState.expandedNodeIds[id])
      .map((id) => this.getNodeById(id)));
  }

  @computed get activeNodes(): TreeNode[] {
    return compact(Object.keys(this.treeState.activeNodeIds)
      .filter((id) => this.expandedNodeIds[id])
      .map((id) => this.getNodeById(id)));
  }
  @computed get focusedNode(): TreeNode {
    return this.getNodeById(this.focusedNodeId);
  }

  registerNode(node, parent) {
    if (!this._getField(node, 'id')) {
      console.warn('Node does not contain ID, assigning one to it. This will not work if your data is immutable');
      this._setField(node, 'id', uuid());
    }
    this.allNodes[node.id] = node;
    this.parents[node.id] = parent;
  }

  deregisterNode(node) {
    delete this.allNodes[node.id];
    delete this.parents[node.id];
  }

  private _getField(node, fieldName) {
    return node[getOption(this.options, `fields.${fieldName}`)];
  }

  private _setField(node, fieldName, value) {
    node[getOption(this.options, `fields.${fieldName}`)] = value;
  }
}

export class TreeState {
  @observable expandedNodeIds: { [id:string]: boolean } = {};
  @observable activeNodeIds: { [id:string]: boolean } = {};
  @observable focusedNodeId: string = null;
}

  private events: any;
  private eventNames = Object.keys(TREE_EVENTS);

  setData({ nodes, options = null, events = null }:{nodes:any,options:any,events:any}) {
    if (options) {
      this.options = new TreeOptions(options);
    }
    if (events) {
      this.events = events;
    }
    if (nodes) {
      this.nodes = nodes;
    }
  }

  update() {
    this._loadState();

    // Fire event:
    if (this.firstUpdate) {
      if (this.roots) {
        this.fireEvent({ eventName: TREE_EVENTS.onInitialized });
        this.firstUpdate = false;
        this._calculateExpandedNodes();
      }
    } else {
      this.fireEvent({ eventName: TREE_EVENTS.onUpdateData });
    }
  }

  _calculateExpandedNodes(startNode = null) {
    startNode = startNode || this.virtualRoot;

    if (startNode.data[this.options.isExpandedField]) {
      this.expandedNodeIds[startNode.id] = true;
    }
    if (startNode.children) {
      startNode.children.forEach((child) => this._calculateExpandedNodes(child));
    }
  }

  fireEvent(event) {
    this.events[event.eventName].emit(event);
    this.events.onEvent.emit(event);
  }

  get focusedNode() { deprecated('focusedNode attribute', 'getFocusedNode'); return this.getFocusedNode(); }
  set focusedNode(value) { deprecated('focusedNode = ', 'setFocusedNode'); this.setFocusedNode(value) };

  getFocusedNode():TreeNode {
    return this._focusedNode;
  }

  setFocusedNode(node) {
    this._focusedNode = node;
    this.focusedNodeId = node ? node.id : null;
  }

  getActiveNode():TreeNode {
    return this.activeNodes[0];
  }

  getActiveNodes():TreeNode[] {
    return this.activeNodes;
  }

  getTreeNode(node:any, parent:TreeNode):TreeNode {
    return new TreeNode(node, parent, this);
  }

  getVisibleRoots() {
    return this.virtualRoot.getVisibleChildren();
  }

  getFirstRoot(skipHidden = false) {
    return first(skipHidden ? this.getVisibleRoots() : this.roots);
  }

  getLastRoot(skipHidden = false) {
    return last(skipHidden ? this.getVisibleRoots() : this.roots);
  }

  get isFocused() {
    return TreeModel.focusedTree === this;
  }

  isNodeFocused(node) {
    return this._focusedNode === node;
  }

  setFocus(value) {
    treesState.focusedTree = value ? this : null;
  }

  getNodeByPath(path, startNode=null):TreeNode {
    if (!path) return null;

    startNode = startNode || this.virtualRoot;
    if (path.length === 0) return startNode;

    if (!startNode.children) return null;

    const childId = path.shift();
    const childNode = find(startNode.children, { [this.options.idField]: childId });

    if (!childNode) return null;

    return this.getNodeByPath(path, childNode)
  }

  getNodeById(id) {
    return this.allNodes[id];
  }

  getNodeBy(predicate, startNode = null) {
    startNode = startNode || this.virtualRoot;

    if (!startNode.children) return null;

    const found = find(startNode.children, predicate);

    if (found) { // found in children
      return found;
    } else { // look in children's children
      for (let child of startNode.children) {
        const found = this.getNodeBy(predicate, child);
        if (found) return found;
      }
    }
  }

  _createAdHocComponent(templateStr): any {
    @Component({
        selector: 'TreeNodeTemplate',
        template: templateStr
    })
    class AdHocTreeNodeTemplateComponent {
        @Input() node: TreeNode;
    }
    return AdHocTreeNodeTemplateComponent;
  }

  focusNextNode() {
    let previousNode = this.getFocusedNode();
    let nextNode = previousNode ? previousNode.findNextNode(true, true) : this.getFirstRoot(true);
    nextNode && nextNode.focus();
  }

  focusPreviousNode() {
    let previousNode = this.getFocusedNode();
    let nextNode = previousNode ? previousNode.findPreviousNode(true) : this.getLastRoot(true);
    nextNode && nextNode.focus();
  }

  focusDrillDown() {
    let previousNode = this.getFocusedNode();
    if (previousNode && previousNode.isCollapsed && previousNode.hasChildren) {
      previousNode.toggleExpanded();
    }
    else {
      let nextNode = previousNode ? previousNode.getFirstChild(true) : this.getFirstRoot(true);
      nextNode && nextNode.focus();
    }
  }

  focusDrillUp() {
    let previousNode = this.getFocusedNode();
    if (!previousNode) return;
    if (previousNode.isExpanded) {
      previousNode.toggleExpanded();
    }
    else {
      let nextNode = previousNode.realParent;
      nextNode && nextNode.focus();
    }
  }

  isActive(node) {
    return this.activeNodeIds[node.id];
  }

  setActiveNode(node, value, multi = false) {
    if (value) {
      node.focus();
      this.fireEvent({ eventName: TREE_EVENTS.onActivate, node });
    } else {
      this.fireEvent({ eventName: TREE_EVENTS.onDeactivate, node });
    }

    if (multi) {
      this._setActiveNodeMulti(node, value);
    }
    else {
      this._setActiveNodeSingle(node, value);
    }
  }

  _setActiveNodeSingle(node, value) {
    // Deactivate all other nodes:
    this.activeNodes
      .filter((activeNode) => activeNode != node)
      .forEach((activeNode) => {
        this.fireEvent({ eventName: TREE_EVENTS.onDeactivate, node: activeNode });
      });

    this.activeNodeIds = {};
    this.activeNodes = [];
    if (value) {
      this.activeNodes.push(node);
      this.activeNodeIds[node.id] = true;
    }
  }

  _setActiveNodeMulti(node, value) {
    this.activeNodeIds[node.id] = value;
    if (value) {
      if (!includes(this.activeNodes, node)) {
        this.activeNodes.push(node);
      }
    } else {
      if (includes(this.activeNodes, node)) {
        remove(this.activeNodes, node);
      }
    }
  }

  isExpanded(node) {
    return this.expandedNodeIds[node.id];
  }

  setExpandedNode(node, value) {
    const index = indexOf(this.expandedNodes, node);

    if (value && !index) this.expandedNodes.push(node);
    else if (index) pullAt(this.expandedNodes, index);

    this.expandedNodeIds[node.id] = value;
  }

  performKeyAction(node, $event) {
    const action = this.options.actionMapping.keys[$event.keyCode]
    if (action) {
      $event.preventDefault();
      action(this, node, $event);
      return true;
    } else {
      return false;
    }
  }

  filterNodes(filter, autoShow = false) {
    let filterFn;

    if (!filter) {
      return this.clearFilter();
    }

    if (isString(filter)) {
      filterFn = (node) => node.displayField.toLowerCase().indexOf(filter.toLowerCase()) != -1
    }
    else if (isFunction(filter)) {
       filterFn = filter;
    }
    else {
      console.error('Don\'t know what to do with filter', filter);
      console.error('Should be either a string or function', filter);
    }
    this.roots.forEach((node) => node.filter(filterFn, autoShow));
  }

  clearFilter() {
    this.roots.forEach((node) => node.clearFilter());
  }

  private _canMoveNode(node, fromIndex, to) {
    // same node:
    if (node.parent === to.parent && fromIndex === to.index) {
      return false;
    }

    return !to.parent.isDescendantOf(node);
  }

  moveNode(node, to) {
    const fromIndex = node.getIndexInParent();
    const fromParent = node.parent;

    if (!this._canMoveNode(node, fromIndex , to)) return;

    const fromChildren = fromParent.getField('children');

    // If node doesn't have children - create children array
    if (!to.parent.getField('children')) {
      to.parent.setField('children', []);
    }
    const toChildren = to.parent.getField('children');

    const originalNode = fromChildren.splice(fromIndex, 1)[0];

    // Compensate for index if already removed from parent:
    let toIndex = (fromParent === to.parent && to.index > fromIndex) ? to.index - 1 : to.index;

    toChildren.splice(toIndex, 0, originalNode);

    fromParent.treeModel.update();
    if (to.parent.treeModel !== fromParent.treeModel) {
      to.parent.treeModel.update();
    }

    this.fireEvent({ eventName: TREE_EVENTS.onMoveNode, node: originalNode, to: { parent: to.parent.data, index: toIndex } });
  }
}
function uuid() {
  return Math.floor(Math.random() * 10000000000000);
}
