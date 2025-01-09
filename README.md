# Passive Core Watcher

Run conditional logic on a corestore's hypercores when they open. Useful for example when one hypercore being active implies other hypercores should be active too.

```
npm i passive-core-watcher
```

## API

#### `const watcher = new PassiveCoreWatcher(corestore, { watch, open })`

Create a new passive core watcher.

`corestore` is a Corestore

`watch` is a (possibly async) function, returning a boolean for a given `Hypercore.Core` object indicating whether the Hypercore should be watched.

`open` is a (possibly async) function containing the intended side effects for Hypercores which should be watched. Its input is a Hypercore session. It is a weak session, closing when no other sessions exist.

The session emits a `close` event when it is closing. If teardown of the side effects is needed, a listener needs to be defined in the `open` function:

`session.on('close', () => { /* run teardown logic for side effects */ } )`

#### `await watcher.ready()`

Setup the passive watcher, so it starts listening for new hypercores.

This also checks which of the already-opened hypercores need to be watched, and calls the `open` function for those.

#### `await watcher.close()`

Stops watching the corestore for new cores, and closes all weak sessions.

#### `await watcher.ensureTracked(key)`

`key` is a hypercore key (buffer, z32 or hex format).

If the hypercore is open in the corestore, it is added to the watcher lifecycle, and the `open` method is called (does nothing otherwise).

Useful when the `watch` condition might be false when the core first opens, but became true later.
