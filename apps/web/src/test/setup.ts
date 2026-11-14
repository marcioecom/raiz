// Node 22+ exposes a global localStorage that is undefined without
// --localstorage-file, and it shadows the jsdom one. Restore an in-memory Storage.

const store = new Map<string, string>()

const storage: Storage = {
  get length() {
    return store.size
  },
  clear: () => store.clear(),
  getItem: (key) => store.get(key) ?? null,
  key: (index) => Array.from(store.keys())[index] ?? null,
  removeItem: (key) => void store.delete(key),
  setItem: (key, value) => void store.set(key, String(value)),
}

for (const target of [window, globalThis]) {
  Object.defineProperty(target, "localStorage", {
    value: storage,
    configurable: true,
  })
}
