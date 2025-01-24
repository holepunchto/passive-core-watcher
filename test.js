const test = require('brittle')
const Corestore = require('corestore')
const tmpDir = require('test-tmp')
const b4a = require('b4a')

const PassiveCoreWatcher = require('.')

test('basic watcher', async (t) => {
  const store = new Corestore(await tmpDir())

  const watching = []
  const watch = () => true
  const open = (weakSession) => {
    watching.push(weakSession)
    weakSession.on('close', () => {
      watching.pop(weakSession)
    })
  }
  const watcher = new PassiveCoreWatcher(store, { watch, open })

  const core = store.get({ name: 'c1' })
  const core2 = store.get({ name: 'c2' })
  await Promise.all([core.ready(), core2.ready()])

  t.is(watching.length, 2, 'watching 2 cores')

  await core.close()

  // Sync, but needs event loop to trigger
  await new Promise(resolve => setImmediate(resolve))
  t.is(watching.length, 1, 'core close triggered')

  watcher.destroy()

  await new Promise(resolve => setImmediate(resolve))
  t.is(watching.length, 0, 'weakSessions close when watcher closes')
  t.is(core2.closed, false, 'Core itself did not close')
})

test('processes already-opened cores', async (t) => {
  const store = new Corestore(await tmpDir())
  const core = store.get({ name: 'c1' })
  const core2 = store.get({ name: 'c2' })
  await Promise.all([core.ready(), core2.ready()])

  const watching = []
  const watch = () => true
  const open = (weakSession) => {
    watching.push(weakSession)
  }
  const watcher = new PassiveCoreWatcher(store, { watch, open })

  await new Promise(resolve => setImmediate(resolve))
  t.is(watching.length, 2)

  watcher.destroy()
})

test('does not process cores for which watch returns false', async (t) => {
  const store = new Corestore(await tmpDir())
  const core = store.get({ name: 'c1' })
  const core2 = store.get({ name: 'c2' })

  await Promise.all([core.ready(), core2.ready()])

  const watching = []
  const watch = (c) => b4a.equals(c.key, core.key)

  const open = (weakSession) => {
    watching.push(weakSession)
  }
  const watcher = new PassiveCoreWatcher(store, { watch, open })

  await new Promise(resolve => setImmediate(resolve))
  t.alike(watching.map(c => c.key), [core.key])

  watcher.destroy()
})
