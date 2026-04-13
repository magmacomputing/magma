import { Tempo } from '#tempo'

describe('Tempo Infinite Loop Protection', () => {
  beforeEach(() => {
    Tempo.init()
  })

  afterEach(() => vi.restoreAllMocks())

  test('cyclic alias resolution (A -> B -> A) is broken by resolvingKeys', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
    const event = {
      loopA: 'loopB',
      loopB: 'loopA'
    }
    const t = new Tempo('loopA', { event, catch: true })
    expect(t.toString()).toBe('loopA')
    expect(spy).toHaveBeenCalled();
  })

  test('deep alias chain is broken by MAX_DEPTH', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
    const event: Record<string, string> = {}
    for (let i = 0; i < 60; i++) {
      event[`step${i}`] = `step${i + 1}`
    }

    const t = new Tempo('step0', { event, catch: true })
    expect(t.toString()).toBe('step0')
    expect(spy).toHaveBeenCalled();
  })
})
