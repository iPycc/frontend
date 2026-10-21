export type UploadHashAlgorithm = "md5" | "sha256"

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
])

const MD5_ROTATION = new Uint8Array([
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
])
const MD5_K = new Uint32Array(Array.from({ length: 64 }, (_, index) =>
  Math.floor(Math.abs(Math.sin(index + 1)) * 0x1_0000_0000) >>> 0
))

function rotateRight(value: number, amount: number) {
  return (value >>> amount) | (value << (32 - amount))
}

function rotateLeft(value: number, amount: number) {
  return (value << amount) | (value >>> (32 - amount))
}

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("")
}

abstract class IncrementalHash {
  protected tail = new Uint8Array(0)
  protected length = 0n

  update(chunk: Uint8Array) {
    this.length += BigInt(chunk.byteLength)
    let offset = 0
    if (this.tail.byteLength) {
      const needed = 64 - this.tail.byteLength
      if (chunk.byteLength < needed) {
        const merged = new Uint8Array(this.tail.byteLength + chunk.byteLength)
        merged.set(this.tail)
        merged.set(chunk, this.tail.byteLength)
        this.tail = merged
        return
      }
      const block = new Uint8Array(64)
      block.set(this.tail)
      block.set(chunk.subarray(0, needed), this.tail.byteLength)
      this.process(block, 0)
      this.tail = new Uint8Array(0)
      offset = needed
    }
    while (offset + 64 <= chunk.byteLength) {
      this.process(chunk, offset)
      offset += 64
    }
    if (offset < chunk.byteLength) this.tail = chunk.slice(offset)
  }

  protected padded(littleEndianLength: boolean) {
    const size = this.tail.byteLength < 56 ? 64 : 128
    const final = new Uint8Array(size)
    final.set(this.tail)
    final[this.tail.byteLength] = 0x80
    let bits = this.length * 8n
    for (let index = 0; index < 8; index += 1) {
      const target = littleEndianLength ? size - 8 + index : size - 1 - index
      final[target] = Number(bits & 0xffn)
      bits >>= 8n
    }
    return final
  }

  protected abstract process(bytes: Uint8Array, offset: number): void
  abstract digest(): string
}

class Sha256Hash extends IncrementalHash {
  private state = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ])

  protected process(bytes: Uint8Array, offset: number) {
    const words = new Uint32Array(64)
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 64)
    for (let index = 0; index < 16; index += 1) words[index] = view.getUint32(index * 4, false)
    for (let index = 16; index < 64; index += 1) {
      const x = words[index - 15]
      const y = words[index - 2]
      const s0 = rotateRight(x, 7) ^ rotateRight(x, 18) ^ (x >>> 3)
      const s1 = rotateRight(y, 17) ^ rotateRight(y, 19) ^ (y >>> 10)
      words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0
    }
    let [a, b, c, d, e, f, g, h] = this.state
    for (let index = 0; index < 64; index += 1) {
      const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25)
      const choice = (e & f) ^ (~e & g)
      const temp1 = (h + s1 + choice + SHA256_K[index] + words[index]) >>> 0
      const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22)
      const majority = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (s0 + majority) >>> 0
      h = g; g = f; f = e; e = (d + temp1) >>> 0
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0
    }
    const values = [a, b, c, d, e, f, g, h]
    for (let index = 0; index < 8; index += 1) this.state[index] = (this.state[index] + values[index]) >>> 0
  }

  digest() {
    const final = this.padded(false)
    for (let offset = 0; offset < final.byteLength; offset += 64) this.process(final, offset)
    const output = new Uint8Array(32)
    const view = new DataView(output.buffer)
    this.state.forEach((value, index) => view.setUint32(index * 4, value, false))
    return hex(output)
  }
}

class Md5Hash extends IncrementalHash {
  private state = new Uint32Array([0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476])

  protected process(bytes: Uint8Array, offset: number) {
    const words = new Uint32Array(16)
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 64)
    for (let index = 0; index < 16; index += 1) words[index] = view.getUint32(index * 4, true)
    let [a, b, c, d] = this.state
    for (let index = 0; index < 64; index += 1) {
      let value: number
      let word: number
      if (index < 16) {
        value = (b & c) | (~b & d); word = index
      } else if (index < 32) {
        value = (d & b) | (~d & c); word = (5 * index + 1) % 16
      } else if (index < 48) {
        value = b ^ c ^ d; word = (3 * index + 5) % 16
      } else {
        value = c ^ (b | ~d); word = (7 * index) % 16
      }
      const next = d
      d = c
      c = b
      b = (b + rotateLeft((a + value + MD5_K[index] + words[word]) >>> 0, MD5_ROTATION[index])) >>> 0
      a = next
    }
    this.state[0] = (this.state[0] + a) >>> 0
    this.state[1] = (this.state[1] + b) >>> 0
    this.state[2] = (this.state[2] + c) >>> 0
    this.state[3] = (this.state[3] + d) >>> 0
  }

  digest() {
    const final = this.padded(true)
    for (let offset = 0; offset < final.byteLength; offset += 64) this.process(final, offset)
    const output = new Uint8Array(16)
    const view = new DataView(output.buffer)
    this.state.forEach((value, index) => view.setUint32(index * 4, value, true))
    return hex(output)
  }
}

export async function hashBlob(
  blob: Blob,
  algorithm: UploadHashAlgorithm,
  signal?: AbortSignal,
  onProgress?: (progress: {
    processedBytes: number
    totalBytes: number
    bytesPerSecond: number
  }) => void
) {
  const hasher = algorithm === "md5" ? new Md5Hash() : new Sha256Hash()
  const chunkSize = 4 * 1024 * 1024
  const startedAt = Date.now()
  let lastReportedAt = startedAt
  for (let offset = 0; offset < blob.size || (blob.size === 0 && offset === 0); offset += chunkSize) {
    if (signal?.aborted) throw new DOMException("aborted", "AbortError")
    const end = blob.size === 0 ? 0 : Math.min(blob.size, offset + chunkSize)
    hasher.update(new Uint8Array(await blob.slice(offset, end).arrayBuffer()))
    const now = Date.now()
    if (onProgress && (now - lastReportedAt >= 100 || end >= blob.size)) {
      const elapsedSeconds = Math.max((now - startedAt) / 1000, 0.001)
      onProgress({
        processedBytes: end,
        totalBytes: blob.size,
        bytesPerSecond: end / elapsedSeconds,
      })
      lastReportedAt = now
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
    }
    if (blob.size === 0) break
  }
  return hasher.digest()
}
