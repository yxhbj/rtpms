#!/usr/bin/env node

import { spawn } from 'child_process'
import electron from 'electron'
import { join } from 'path'

const appPath = join(__dirname, 'main.js')
const args = [appPath].concat(process.argv.slice(2))
const proc = spawn(electron, args, {
    stdio: 'inherit'
})

proc.on('close', (code) => process.exit(code))
