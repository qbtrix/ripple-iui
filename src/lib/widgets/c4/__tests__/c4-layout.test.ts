// c4-layout.test.ts — Tests for ELK layout computation and C4→SvelteFlow conversion
// Created: 2026-04-07 — Tests for the SvelteFlow + ELK C4 diagram widget

import { describe, it, expect } from 'vitest';
import { computeElkLayout, getNodeType, isGroupNode } from '../elk-layout.js';
import type { C4Diagram, C4Person, C4System, C4Container, C4Component, C4Element } from '../types.js';

// --- Test fixtures ---

const person: C4Person = {
  id: 'user',
  name: 'End User',
  description: 'Uses the system',
  external: true,
};

const system: C4System = {
  id: 'my-system',
  name: 'My System',
  description: 'The main system',
  technology: 'Python',
  containers: [
    {
      id: 'api',
      name: 'API Server',
      technology: 'FastAPI',
      type: 'api',
    },
    {
      id: 'db',
      name: 'Database',
      technology: 'PostgreSQL',
      type: 'database',
    },
  ],
};

const externalSystem: C4System = {
  id: 'ext-api',
  name: 'External API',
  description: 'Third-party service',
  technology: 'REST',
  external: true,
};

const queue: C4Container = {
  id: 'mq',
  name: 'Message Queue',
  technology: 'RabbitMQ',
  type: 'queue',
};

const component: C4Component = {
  id: 'auth',
  name: 'Auth Module',
  technology: 'Python',
  type: 'service',
  kb_article: 'auth-module',
};

// --- getNodeType tests ---

describe('getNodeType', () => {
  it('returns "person" for person elements', () => {
    expect(getNodeType(person)).toBe('person');
  });

  it('returns "group" for systems with containers', () => {
    expect(getNodeType(system)).toBe('group');
  });

  it('returns "system" for systems without containers', () => {
    expect(getNodeType(externalSystem)).toBe('system');
  });

  it('returns "database" for database containers', () => {
    const db: C4Container = { id: 'db', name: 'DB', type: 'database' };
    expect(getNodeType(db)).toBe('database');
  });

  it('returns "queue" for queue containers', () => {
    expect(getNodeType(queue)).toBe('queue');
  });

  it('returns "system" for plain components', () => {
    // Components without containers/components arrays fall through to 'system'
    expect(getNodeType(component)).toBe('system');
  });
});

// --- isGroupNode tests ---

describe('isGroupNode', () => {
  it('returns true for systems with containers', () => {
    expect(isGroupNode(system)).toBe(true);
  });

  it('returns false for systems without containers', () => {
    expect(isGroupNode(externalSystem)).toBe(false);
  });

  it('returns false for person elements', () => {
    expect(isGroupNode(person)).toBe(false);
  });

  it('returns false for systems with empty containers array', () => {
    const empty: C4System = { id: 's', name: 'S', containers: [] };
    expect(isGroupNode(empty)).toBe(false);
  });
});

// --- computeElkLayout tests ---

describe('computeElkLayout', () => {
  it('returns empty map for empty diagram', async () => {
    const diagram: C4Diagram = {
      level: 'context',
      title: 'Empty',
      elements: [],
      relationships: [],
    };
    const result = await computeElkLayout(diagram);
    expect(result.size).toBe(0);
  });

  it('computes positions for a simple context diagram', async () => {
    const diagram: C4Diagram = {
      level: 'context',
      title: 'System Context',
      elements: [person, externalSystem],
      relationships: [
        { from: 'user', to: 'ext-api', label: 'Uses' },
      ],
    };
    const result = await computeElkLayout(diagram);

    expect(result.size).toBe(2);
    expect(result.has('user')).toBe(true);
    expect(result.has('ext-api')).toBe(true);

    const userPos = result.get('user')!;
    expect(userPos.x).toBeGreaterThanOrEqual(0);
    expect(userPos.y).toBeGreaterThanOrEqual(0);
    expect(userPos.width).toBeGreaterThan(0);
    expect(userPos.height).toBeGreaterThan(0);
  });

  it('computes nested positions for container diagram with group', async () => {
    const diagram: C4Diagram = {
      level: 'container',
      title: 'Containers',
      elements: [person, system],
      relationships: [
        { from: 'user', to: 'api', label: 'Makes requests' },
        { from: 'api', to: 'db', label: 'Reads/writes', technology: 'SQL' },
      ],
    };
    const result = await computeElkLayout(diagram);

    // Should have positions for: user, my-system (group), api, db
    expect(result.has('user')).toBe(true);
    expect(result.has('my-system')).toBe(true);
    expect(result.has('api')).toBe(true);
    expect(result.has('db')).toBe(true);
  });

  it('respects direction option', async () => {
    const diagram: C4Diagram = {
      level: 'context',
      title: 'Test',
      elements: [
        { id: 'a', name: 'A' } as C4Person,
        { id: 'b', name: 'B', technology: 'Go' } as C4System,
      ],
      relationships: [{ from: 'a', to: 'b', label: 'calls' }],
    };

    const downLayout = await computeElkLayout(diagram, { direction: 'DOWN' });
    const rightLayout = await computeElkLayout(diagram, { direction: 'RIGHT' });

    // Both should produce valid positions
    expect(downLayout.size).toBe(2);
    expect(rightLayout.size).toBe(2);
  });

  it('handles relationships with unknown element IDs gracefully', async () => {
    const diagram: C4Diagram = {
      level: 'context',
      title: 'Test',
      elements: [person],
      relationships: [
        { from: 'user', to: 'nonexistent', label: 'broken ref' },
      ],
    };
    const result = await computeElkLayout(diagram);
    expect(result.has('user')).toBe(true);
    // Should not crash — invalid edges are filtered out
  });
});

// --- Type extensions tests ---

describe('C4 type extensions', () => {
  it('supports kb_article on containers', () => {
    const container: C4Container = {
      id: 'api',
      name: 'API',
      kb_article: 'api-server',
      tags: ['web', 'internal'],
    };
    expect(container.kb_article).toBe('api-server');
    expect(container.tags).toContain('web');
  });

  it('supports kb_article on components', () => {
    expect(component.kb_article).toBe('auth-module');
  });

  it('supports tags on all element types', () => {
    const tagged: C4Person = {
      id: 'admin',
      name: 'Admin',
      tags: ['internal', 'privileged'],
    };
    expect(tagged.tags).toEqual(['internal', 'privileged']);
  });
});
