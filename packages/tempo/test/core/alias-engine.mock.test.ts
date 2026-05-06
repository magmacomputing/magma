import { AliasEngine } from '../../src/engine/engine.alias.js';

describe('AliasEngine', () => {
  it('assigns correct prefixes and group names for root and children', () => {
    const root = new AliasEngine();
    const child1 = new AliasEngine({ parent: root });
    const child2 = new AliasEngine({ parent: root });
    root.registerAliases('evt', [ ['rootEvent', 'rootValue'] ]);
    child1.registerAliases('evt', [ ['child1Event', 'child1Value'] ]);
    child2.registerAliases('evt', [ ['child2Event', 'child2Value'] ]);
    expect(root.getAliases('evt')[0].key).toBe('evt0_0');
    expect(child1.getAliases('evt')[0].key).toBe('evt1_0');
    expect(child2.getAliases('evt')[0].key).toBe('evt1_0');
  });

  it('returns correct lineage from registerEvents/registerPeriods', () => {
    const root = new AliasEngine();
    const events = [ ['a', 'A'], ['b', 'B'] ] as [string, string][];
    const periods = [ ['x', 'X'], ['y', 'Y'] ] as [string, string][];
    const eventPattern = root.registerAliases('evt', events);
    const periodPattern = root.registerAliases('per', periods);
    const eventLineage = root.getAliases('evt');
    const periodLineage = root.getAliases('per');
    expect(eventPattern).toBe('(?<evt0_0>a)|(?<evt0_1>b)');
    expect(periodPattern).toBe('(?<per0_0>x)|(?<per0_1>y)');

    expect(eventLineage[0].key).toBe('evt0_0');
    expect(eventLineage[1].key).toBe('evt0_1');
    expect(periodLineage[0].key).toBe('per0_0');
    expect(periodLineage[1].key).toBe('per0_1');
  });

  it('resolves aliases up the proto chain', () => {
    const root = new AliasEngine();
    const child = new AliasEngine({ parent: root });
    root.registerAliases('evt', [ ['rootEvent', 'rootValue'] ]);
    child.registerAliases('evt', [ ['childEvent', 'childValue'] ]);
    expect(child.resolveAlias('evt0_0')?.value).toBe('rootValue');
    expect(child.resolveAlias('evt1_0')?.value).toBe('childValue');
  });

  it('clears aliases correctly', () => {
    const root = new AliasEngine();
    root.registerAliases('evt', [ ['e1', 'v1'] ]);
    root.registerAliases('per', [ ['p1', 'v2'] ]);
    root.clear('evt');
    expect(root.getAliases('evt').length).toBe(0);
    expect(root.getAliases('per').length).toBe(1);
    root.clear('per');
    expect(root.getAliases('per').length).toBe(0);
  });
});
