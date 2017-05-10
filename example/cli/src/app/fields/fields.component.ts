import { Component } from '@angular/core';
import { ITreeOptions } from 'angular-tree-component';

@Component({
  selector: 'app-fields',
  template: `
    <h3>Overriding displayField & nodeClass</h3>
    <tree-root #tree id="tree1" [focused]="true" [nodes]="nodes1" [options]="options1"></tree-root>
    <button (click)="tree.treeModel.getNodeById('root1').setIsActive(true)">select node by id</button>
  `,
  styles: []
})
export class FieldsComponent {
  nodes1 = [
    {
      title: 'root1',
      className: 'root1Class',
      expanded: true,
      nodes: [
        { title: 'child1', className: 'child1Class' }
      ]
    },
    {
      title: 'root2',
      className: 'root2Class'
    },
    {
      title: 'hiddenRoot',
      className: 'hiddenRootClass',
      hidden: true
    }
  ];

  options1: ITreeOptions = {
    displayField: 'title',
    idField: 'title',
    childrenField: 'nodes',
    isExpandedField: 'expanded',
    isHiddenField: 'hidden',
    nodeClass: (node) => node.data.className
  };
}
