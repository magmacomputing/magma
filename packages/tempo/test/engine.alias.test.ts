import { AliasEngine } from '../src/engine/engine.alias.js';

describe('AliasEngine', () => {
  it('assigns correct prefixes and group names for root and children', () => {
    const root = new AliasEngine();
    const child1 = new AliasEngine({ parent: root });
    const child2 = new AliasEngine({ parent: root });
    root.registerEventAlias('rootEvent', 'rootValue');
    child1.registerEventAlias('child1Event', 'child1Value');
    child2.registerEventAlias('child2Event', 'child2Value');
    expect(root.getIndexedAliases('event')[0].groupName).toBe('0evt0');
    expect(child1.getIndexedAliases('event')[0].groupName).toBe('1evt0');
    expect(child2.getIndexedAliases('event')[0].groupName).toBe('1evt0');
  });

  it('returns correct lineage from registerEvents/registerPeriods', () => {
    const root = new AliasEngine();
    const events = [ ['a', 'A'], ['b', 'B'] ] as [string, string][];
    const periods = [ ['x', 'X'], ['y', 'Y'] ] as [string, string][];
    const eventLineage = root.registerEvents(events);
    const periodLineage = root.registerPeriods(periods);
    expect(eventLineage[0].groupName).toBe('0evt0');
    expect(eventLineage[1].groupName).toBe('0evt1');
    expect(periodLineage[0].groupName).toBe('0per0');
    expect(periodLineage[1].groupName).toBe('0per1');
  });

  it('resolves aliases up the proto chain', () => {
    const root = new AliasEngine();
    const child = new AliasEngine({ parent: root });
    root.registerEventAlias('rootEvent', 'rootValue');
    child.registerEventAlias('childEvent', 'childValue');
    expect(child.resolveEventAlias('rootEvent')).toBe('rootValue');
    expect(child.resolveEventAlias('childEvent')).toBe('childValue');
  });

  it('clears aliases correctly', () => {
    const root = new AliasEngine();
    root.registerEventAlias('e1', 'v1');
    root.registerPeriodAlias('p1', 'v2');
    root.clear('event');
    expect(root.getIndexedAliases('event').length).toBe(0);
    expect(root.getIndexedAliases('period').length).toBe(1);
    root.clear('period');
    expect(root.getIndexedAliases('period').length).toBe(0);
  });
});
