// activate.ts — what activating a C4 node does. Every node component calls activateNode on click
// and C4Diagram calls it on Enter or Space, so the keyboard and the pointer cannot disagree.
//
// By SvelteFlow node type: person, system, container and component cards drill when the element
// is drillable and the host listens for drill-downs, and click otherwise; boundaries (group),
// databases, queues and code panels only click. The level handed to ondrilldown is the one each
// card has always passed: person and system step down from the diagram's level, a container
// drills to components on a container diagram and to code elsewhere, a component to code.

import type { C4NodeData } from './types.js';

type Level = C4NodeData['diagramLevel'];

/** The level a drillable node of this type drills to; undefined for types that never drill. */
function drillLevel(type: string | undefined, level: Level): Level | undefined {
  if (type === 'person' || type === 'system') {
    return level === 'context' ? 'container' : level === 'container' ? 'component' : 'code';
  }
  if (type === 'container') return level === 'container' ? 'component' : 'code';
  if (type === 'component') return 'code';
  return undefined;
}

export function activateNode(type: string | undefined, data: C4NodeData): void {
  const target = drillLevel(type, data.diagramLevel);
  if (target && data.drillable && data.ondrilldown) data.ondrilldown(data.element, target);
  else data.onclick?.(data.element);
}
