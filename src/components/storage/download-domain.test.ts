import assert from "node:assert/strict"
import test from "node:test"
import { parseDownloadDomain } from "./download-domain"

test("download domains accept hosts and HTTP origins without paths or credentials", () => {
  assert.equal(parseDownloadDomain(" files.example.com ")?.hostname, "files.example.com")
  assert.equal(parseDownloadDomain("http://localhost:9000")?.origin, "http://localhost:9000")
  for (const invalid of ["", "https://files.example.com/path", "https://user:password@files.example.com", "https://files.example.com?key=value", "ftp://files.example.com"]) {
    assert.equal(parseDownloadDomain(invalid), null, invalid)
  }
})
