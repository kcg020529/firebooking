import test from "node:test";
import assert from "node:assert/strict";

import { isProtectedPagePath } from "../lib/security/authPaths.js";

test("강한 서버 세션 갱신은 /my와 /admin 페이지에만 적용한다", () => {
  assert.equal(isProtectedPagePath("/my"), true);
  assert.equal(isProtectedPagePath("/my/history"), true);
  assert.equal(isProtectedPagePath("/admin"), true);
  assert.equal(isProtectedPagePath("/admin/security"), true);

  assert.equal(isProtectedPagePath("/"), false);
  assert.equal(isProtectedPagePath("/login"), false);
  assert.equal(isProtectedPagePath("/lookup"), false);
  assert.equal(isProtectedPagePath("/api/admin/events"), false);
});
