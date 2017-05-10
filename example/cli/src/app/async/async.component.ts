import { Component } from '@angular/core';

@Component({
  selector: 'app-async',
  template: `
    <tree-root [focused]="true" [nodes]="nodes" [options]="options"></tree-root>
  `,
  styles: []
})
export class AsyncComponent {
  nodes = [
    {
      name: 'root1',
      hasChildren: true
    },
    {
      name: 'root2',
      hasChildren: false
    },
    {
      name: 'root3',
      children: [
        {name: 'child1'}
      ]
    },
    {
      name: 'root4',
      hasChildren: true,
      isExpanded: true
    },
  ];

  options = {
    getChildren: (node) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => resolve([
          { name: `${node.data.name}.child1`, hasChildren: false },
          {
            name: `${node.data.name}.child2`,
            isExpanded: true,
            children: [
              { name: `${node.data.name}.grandchild` }
            ]
          }
        ]), 500);
      });
    }
  };
}
