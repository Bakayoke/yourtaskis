import fs from 'node:fs'

const path = 'dist/index.html'
fs.writeFileSync(path, fs.readFileSync(path, 'utf8').replaceAll(' crossorigin', ''))
