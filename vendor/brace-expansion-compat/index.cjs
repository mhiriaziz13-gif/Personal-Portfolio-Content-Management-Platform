"use strict";

const modern = require("brace-expansion-modern");

// minimatch 3 expects brace-expansion to be directly callable, while the
// patched v5 package exposes expand as a named export.
function braceExpansion(pattern, options) {
  return modern.expand(pattern, options);
}

module.exports = braceExpansion;
