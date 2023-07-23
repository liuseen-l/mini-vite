const path = require('node:path')

function getShortName(file, root) {
  return file.startsWith(`${root}/`) ? path.posix.relative(root, file) : file
}

console.log(getShortName('F:\forProjects\mini-vite\playground\src\main.ts', 'F:/forProjects/mini-vite/playground'))
