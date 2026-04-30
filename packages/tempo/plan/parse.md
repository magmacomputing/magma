Currently we provide input to Tempo via 'Option' arguments.
These can come from localStorage, or global-discovery, or library-defaults, or global/local settings.

Tempo takes in these and sorts them into a) Config (items that help describe how a Tempo is configured) and b) Parse (items that help describe how a Tempo will be instantiated).

The issue I am trying to solve is; the Option argument is getting too unwieldy as we add more capabilities.
I want to rationalize / group options so that the User is not overwhelmed for choice.
This is particularily more relevant in the Parse-related options, as we give more control (via Options) to the User.

# Config
`store`,						names the 'key' that will be used to fetch localStorage / process.env pre-built Option args
 `debug`, 					intended to control the level of display of console messages
 `catch`, 					intended to control whether Tempo 'throws' on error, or does a safe-fail and delegate back to the User
 `silent`, 					intended to control
 `timeZone`,				intended to name the specific timeZone to use (overrides inferred timeZone)
 `calendar`,				intended to name the calendar for Temporal (currenltly only iso8601 / gregory supported)
  `locale`,					intended to assist in Locale-specific formatting
  `sphere`,					intended to help with Terms to auto-flip from North- to South-based ranges
  `intl`,						intended to supply Intl namespace objects to Tempo
  `timeStamp`,			intended to name the precision of timestamps (milliseconds as Date does now, or nanoseconds)
 `discovery`,				intended to name the 'key' that will hold discovery object in globalThis
  `formats`, 				intended to provide format-aliases  (new Tempo().fmt.XXX)
 `plugins`					intended to provide Modules to be added to Tempo (calls Tempo.extend(Module))

 # Parse
