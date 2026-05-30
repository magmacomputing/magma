# Tempo v3.0.0 Release Notes

Welcome to Tempo v3.0.0! This major release marks a significant milestone in our architectural journey by finalizing the decentralized plugin ecosystem. 

## 🚀 What's New & Changed

### Ticker Module Extraction (Breaking Change)
To lighten the core bundle and clean up the API surface for general use cases, the `TickerModule` has been extracted from the base open-source distribution into its own standalone premium plugin (`@magmacomputing/tempo-plugin-ticker`).

The Ticker is still completely free to use, but it is now protected by a License Key via the Tempo Registry. This allows us to better protect the investment in the advanced scheduling algorithms and restrict its payload footprint strictly to applications that need it.

### Formatting Module Additions
The `FormatModule` has been updated with new compact date tokens (`{dmy}`, `{mdy}`, `{ymd}`) for generating 8-digit compact date strings (e.g. `24102026`). Additionally, the `{hhmiss}` compact time token has been renamed to `{hms}` for consistency.
We have also introduced **Ordinal Tokens**: uppercase variants of standard date tokens (`{DAY}`, `{WW}`, `{MM}`) now output their ordinal string representation (e.g., `24th`, `1st`, `2nd`).

### Migration Path for `Tempo.ticker()` Users
If you are upgrading from v2.x and your application relies on `Tempo.ticker()`, you will need to update your integration:

1. **Install the Plugin**: 
   ```bash
   npm install @magmacomputing/tempo-plugin-ticker
   ```
2. **Activate your License**: Visit [registry.magmacomputing.com.au](https://registry.magmacomputing.com.au) to obtain your free JWT license key.
3. **Register the Plugin**: Wire the key into your application and extend Tempo:
   ```javascript
   import { Tempo } from '@magmacomputing/tempo';
   import { TickerModule } from '@magmacomputing/tempo-plugin-ticker';

   Tempo.init({ license: 'YOUR_JWT_KEY' });
   Tempo.extend(TickerModule);
   ```

A migration stub has been left in the core package for v3.0.0. If you accidentally call `Tempo.ticker()` without the plugin installed, the engine will safely throw an informative error directing you to the registry.

## 🛠️ Internal Improvements
- Bumped core engine to v3.0.0 to reflect the breaking API extraction.
- Fully synchronized build pipelines and TS declarations to ensure `vitest` and `tsc` operate seamlessly across local and premium workspaces.
- Removed legacy `Ticker` shorthands from core test suites for guaranteed separation of concerns.
- **ISO Getter Precision**: Upgraded the `.iso` property getter from native `Date.toISOString()` to Temporal's `Instant.toString()`. This provides full ISO 8601 nanosecond precision and conforms to RFC 3339 by gracefully omitting fractional seconds when they evaluate to exactly zero.

Thank you for continuing to build with Tempo!
