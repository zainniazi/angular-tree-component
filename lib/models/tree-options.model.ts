import { TreeNode } from './tree-node.model';
import { TreeModel } from './tree.model';
import { KEYS } from '../constants/keys';
import { deprecated } from '../deprecated';
import { ITreeOptions } from '../defs/api';

import { defaultsDeep, get } from 'lodash';

export interface IActionHandler {
  (tree:TreeModel, node:TreeNode, $event:any, ...rest);
}

export const TREE_ACTIONS = {
  TOGGLE_SELECTED: (tree:TreeModel, node:TreeNode, $event:any) => node.toggleActivated(),
  TOGGLE_SELECTED_MULTI: (tree:TreeModel, node:TreeNode, $event:any) => node.toggleActivated(true),
  SELECT: (tree:TreeModel, node:TreeNode, $event:any) => node.setIsActive(true),
  DESELECT: (tree:TreeModel, node:TreeNode, $event:any) => node.setIsActive(false),
  FOCUS: (tree:TreeModel, node:TreeNode, $event:any) => node.focus(),
  TOGGLE_EXPANDED: (tree:TreeModel, node:TreeNode, $event:any) => node.hasChildren && node.toggleExpanded(),
  EXPAND: (tree:TreeModel, node:TreeNode, $event:any) => node.expand(),
  COLLAPSE: (tree:TreeModel, node:TreeNode, $event:any) => node.collapse(),
  DRILL_DOWN: (tree:TreeModel, node:TreeNode, $event:any) => tree.focusDrillDown(),
  DRILL_UP: (tree:TreeModel, node:TreeNode, $event:any) => tree.focusDrillUp(),
  NEXT_NODE: (tree:TreeModel, node:TreeNode, $event:any) =>  tree.focusNextNode(),
  PREVIOUS_NODE: (tree:TreeModel, node:TreeNode, $event:any) =>  tree.focusPreviousNode(),
  MOVE_NODE: (tree:TreeModel, node:TreeNode, $event:any, {from , to}:{from:any, to:any}) => {
    // default action assumes from = node, to = {parent, index}
    tree.moveNode(from, to);
  }
}

const defaultActionMapping:IActionMapping = {
  mouse: {
    click: TREE_ACTIONS.TOGGLE_SELECTED,
    dblClick: null,
    contextMenu: null,
    expanderClick: TREE_ACTIONS.TOGGLE_EXPANDED,
    drop: TREE_ACTIONS.MOVE_NODE
  },
  keys: {
    [KEYS.RIGHT]: TREE_ACTIONS.DRILL_DOWN,
    [KEYS.LEFT]: TREE_ACTIONS.DRILL_UP,
    [KEYS.DOWN]: TREE_ACTIONS.NEXT_NODE,
    [KEYS.UP]: TREE_ACTIONS.PREVIOUS_NODE,
    [KEYS.SPACE]: TREE_ACTIONS.TOGGLE_SELECTED,
    [KEYS.ENTER]: TREE_ACTIONS.TOGGLE_SELECTED
  }
};

export interface IActionMapping {
  mouse?: {
    click?: IActionHandler,
    dblClick?: IActionHandler,
    contextMenu?: IActionHandler,
    expanderClick?: IActionHandler,
    dragStart?: IActionHandler,
    drag?: IActionHandler,
    dragEnd?: IActionHandler,
    dragOver?: IActionHandler,
    drop?: IActionHandler
  },
  keys?: {
    [key:number]: IActionHandler
  }
}

const defaultOptions = {
  fields: {
    children: 'children',
    display: 'name',
    id: 'id',
    isHidden: 'isHidden'
  },
  levelPadding: 0,
  actionMapping: defaultActionMapping
}

export function getOption(options, field) {
  const result = get(options, field);

  return result === undefined ? get(defaultOptions, field) : result;
}

export function allowDrop(options, element, to):boolean {
    if (options.allowDrop instanceof Function) {
      return options.allowDrop(element, to);
    }
    else {
      return options.allowDrop === undefined ? true : options.allowDrop;
    }
}
