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
})
