import { Tempo } from '#tempo'

describe('Tempo Static Options', () => {
    // Unique symbol for test discovery
    const $TestTempo = Symbol('TestStaticOptionsDiscovery')

    beforeEach(() => {
        delete (globalThis as any)[$TestTempo]
        Tempo.init()
    })

    test('static options are reactive to discovery changes', () => {
        expect(Tempo.options.timeZone).toBeDefined()

        const myDiscovery = {
            options: { timeZone: 'Pacific/Auckland' }
        }

        // Register discovery
        Tempo.use(myDiscovery, $TestTempo)

        expect(Tempo.options.timeZone).toBe('Pacific/Auckland')
        expect((globalThis as any)[$TestTempo]).toBe(myDiscovery)
        expect(Tempo.config.discovery).toBe($TestTempo)
    })

    test.runIf(typeof (Tempo as any).extend === 'function')(
        'static options support legacy Tempo.extend with discovery symbol (while supported)',
        () => {
            const myDiscovery = {
                options: { timeZone: 'Asia/Tokyo' }
            }

            // Register discovery via legacy extend
            ;(Tempo as any).extend(myDiscovery, $TestTempo)

            expect(Tempo.options.timeZone).toBe('Asia/Tokyo')
            expect((globalThis as any)[$TestTempo]).toBe(myDiscovery)
            expect(Tempo.config.discovery).toBe($TestTempo)
        }
    )

    test('Tempo.use activates discovery slot even if global slot already equals item', () => {
        const $PreSlot = Symbol('TestPreSlot')
        const myDiscovery = {
            options: { timeZone: 'Pacific/Honolulu' }
        }

        // Pre-populate global slot with item
        ;(globalThis as any)[$PreSlot] = myDiscovery

        expect(Tempo.config.discovery).not.toBe($PreSlot)

        // Register discovery
        Tempo.use(myDiscovery, $PreSlot)

        expect(Tempo.config.discovery).toBe($PreSlot)
        expect(Tempo.discovery.options.timeZone).toBe('Pacific/Honolulu')
        expect(Tempo.options.timeZone).toBe('Pacific/Honolulu')

        delete (globalThis as any)[$PreSlot]
    })
})
