tempo.class will invoke $setEvents() as part of the global, sandbox and instance setup.
events will be an array of [eventName, eventTarget]
where eventName is a plain string or a regex-like string (e.g. "xmas( )?eve"), and eventTarget is a string or Function that returns a string.
the eventTarget will name the date-string (e.g. "25-Dec") that should be interpreted when this eventName is detected by the parse-engine.

$setEvents will then run "events=ownEntries();" on the list of Events it has been provided (most likely just the Default, but could be more from global-discovery, localStorage, etc.).

If there are no events (which can happen), $setEvents exits... nothing to do.

If there are events, it should
	check if there is an 'own' shape.aliasEngine, else allocate a 'new AliasEngine(...)"
the new aliasEngine should contain a reference to it's parent object... nothing for global,  global  for sandbox,  global-or-sandbox for instances.
This hierarchy is important for Event resolution (see below).
each new aliasEngine should calculate it's own 'depth'... that is,
	global => 0,
	sandbox => 1+ (increasing for each sandbox created from another sandbox),
	instance => 1 (if direct child of global) or => 2+ (if direct child of a sandbox)

$setEvents should then call aliasEngine.clear('event')... not sure if this is absolutely necessary, but couldn't hurt.

$setevents should then call "const groups = aliasEngine.registerEvents(events);"
to pass control to the shape's aliasEngine instance.

That instance will go through the 'events' array, and for each:
	stash some related information into the Engine's instance so we can track
		### a sequential number to be allocated on an Event
		### the baseName
		### the eventTarget
		### the eventName (? not sure if this is needed ?)
	a Set on the instance will track calc'd 'baseName'
	it will also output a 'warn' if it detects that a baseName has already been used (whether in the current events-array or up the proto-chain).

Once the registration process is complete, it should return a regex-like string back to the caller in tempo.class.
The string will contain (from lowest to highest in the proto-chain) a calculated named-group regex source, with "(?<calc>eventTarget)"
	the <calc> section will be "{depth}evt{index}" where depth is the aliasEngine's instance depth (0, 1, 2, etc.) and index is the sequential number that was assigned to an Event.
	For example, passing in ['xmas','25-Dec'] from the global shape will have the registration return "((?<0evt1>xmas))"
	For example, later passing in [bday; '20-May'] from an instance shape will have the registration return "((?<1evt1>bday)|(?<0evt1>xmas))"

When assembling the string to be returned (pipe-delimited named-group regex-source), the registration should:
	ensure lower-depth regex-sources are returned prior to higher-depth
	ensure that if a lower-depth is marked as a 'collision', then any higher-depth with that same baseName will be excluded

To use a Period as an example, assuming an instance wants to override a global definition of 'noon':
	"new Tempo('noon': {period: {noon:'11:00'}});
	We would expect the depth for the Tempo-instance to be '1' (direct child of global shape)
	We would expect the index to be '1' (first Period alias detected)
	We would expect the registerEvents to return "((?<1per1>noon)|... the rest of the global Periods *except* where baseName is 'noon')"

When the calculated alias-string is returned to tempo.class, it will then update it's shadow the definition of the parent's snippets for Token.evt and Token.per.
tempo.class then calls setPatterns which will build the actual patterns (based on the current Layouts / Snippets)

## Event Resolution
when the parsing engine detects a match against the patterns, and it finds a named-group with the pattern <nbr>evt<nbr>  or <nbr>per<nbr>, then it knows it has an alias to de-reference.

It will find the aliasEngine that is associated with the current tempo-level being parse (global, sandbox, instance).

It will then invoke that aliasEngine's instance's method resolveEvent (or resolvePeriod) by passing in the named-group and the 'this' reference.

The aliasEngine will decode the 'depth' from the alias argument (the leading digits before the 'evt' or 'per' portion of the string), and travel up the proto-chain til it finds the correct instance that matches that depth.

The aliasEngine will then decode the 'index' from the alias argument (the trailing digit after the 'evt' or 'per' portion of the string)

That resolved instance will lookup its own registry of Aliases for the index of the eventTarget.

If the retrieved eventTarget is a string, it will return it to the parsing engine.
If the retrieved eventTarget is a Function, it will invoke the function (binding the 'this' context), and invoke a .toString() on the result before passing it back to the eventTarget;'

* what to do if the alias resolution is cyclic ?
