const { EventEmitter } = require('events')
const Hypercore = require('hypercore')
const b4a = require('b4a')
const HypCrypto = require('hypercore-crypto')
const IdEnc = require('hypercore-id-encoding')
const safetyCatch = require('safety-catch')

class PassiveCoreWatcher extends EventEmitter {
  constructor (corestore, { watch, open }) {
    super()
    this.store = corestore
    this.watch = watch
    this.open = open

    this._oncoreopenBound = this._oncoreopen.bind(this)
    this._openCores = new Map()

    this.destroyed = false

    // Give time to add event handlers
    queueMicrotask(() => {
      if (this.destroyed) return
      this.store.watch(this._oncoreopenBound)
      for (const core of this.store.cores.map.values()) {
        this._oncoreopenBound(core) // never rejects
      }
    })
  }

  destroy () {
    this.destroyed = true
    this.store.unwatch(this._oncoreopenBound)
    for (const core of this._openCores.values()) {
      core.close().catch(safetyCatch)
    }
  }

  async _oncoreopen (core) { // not allowed to throw
    try {
      if (await this.watch(core)) {
        await core.ready()
        await this.ensureTracked(core.key)
      }
    } catch (e) {
      this.emit('oncoreopen-error', e)
    }
  }

  async ensureTracked (key) {
    key = IdEnc.decode(key)

    const discKey = b4a.toString(HypCrypto.discoveryKey(key), 'hex')
    const core = this.store.cores.get(discKey)
    if (!core) return // not in corestore atm (will rerun when oncoreopen runs)
    if (this._openCores.has(discKey)) return // Already processed

    const session = new Hypercore({ core, weak: true })
    this._openCores.set(discKey, session)
    // Must be sync up till the line above, for the accounting

    await session.ready()
    if (session.closing) { // race condition (insta close)
      this._openCores.delete(discKey)
      return
    }

    session.on('close', () => {
      this._openCores.delete(discKey)
    })

    await this.open(session)
  }
}

module.exports = PassiveCoreWatcher
