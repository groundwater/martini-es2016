#!/usr/bin/env node
var browserify = require('browserify')
var es6ify     = require('es6ify')
var path       = require('path')
var assert     = require('assert')

assert(process.argv[2], 'file required')

var file = path.join(__dirname, process.argv[2])

// add async/await
es6ify.traceurOverrides = { asyncFunctions: true }

browserify({ debug: true, builtins: false, commondir: false, detectGlobals: false })
  .add(es6ify.runtime)
  .transform(es6ify)
  .require(require.resolve(file), { entry: true })
  .bundle()
  .pipe(process.stdout)
