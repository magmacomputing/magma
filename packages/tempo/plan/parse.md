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
`monthDay`,					an object that controls MDY parsing
`layout`,						an object that describes the configured Layouts
 `snippet`, 				an object that describes the configured Snippets
`event`, 						an object that names Date aliases
`period`,						an object that names Time aliases
 `ignore`,					an array that names 'words' that can safely be ignored during a string-parse
 `pivot`,						a number that defines when to 'pivot' a string-date that has only two-digits for the year portion
 `order`,						an array of Layout names that will override the library-default Layout order
 `prefilter`, 			a flag that will enable Tempo to filter some strings into different parse-paths
`mode`							a flag that determines if Tempo will parse a value straight-away or defer until needed.

The above is not an exhaustive list (I do have more to add !), but shows the kind of things that an Option object must consider.
The Tempo.config (and new Tempo().config) getters will show the config-settings that in place.
The Tempo.parse (and new Tempo().parse) getters are intended to assist with debugging 'how' a Tempo was derived.

What are the industry standards for large Option objects ?
Do we break them into nested-groups ?  e.g.  new Tempo({config: {sphere: 'south'}, parse: {order: ['dt','wkd']}})
(this looks very awkward !)
Or do we break them into separate arguments ?  e.g.  new Tempo('Monday', {sphere:'south'}, {order: ['dt','wkd']})
(again, this looks awkward ))
Or do we allow the user to enter everything as top-level keys, and we sort it out when analyzing the Options ?
e.g.   new Tempo('Monday', {sphere: 'north', order: ['dt','wkd']}) ?
(this appears the 'friendliest', but can bombard the User with too many choices ?)
