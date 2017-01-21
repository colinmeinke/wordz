#! /usr/bin/env node

import {
  createDir,
  createTmpDir,
  createTmpFile,
  createWord,
  deleteDir,
  optionsFromCli,
  pathExists,
  pathsFromChars,
  processQueue
} from './helpers'

import Promise from 'bluebird'

const {
  bg,
  charDir,
  concurrency,
  format,
  inputFormat,
  letterSpacing,
  padding,
  outDir,
  size,
  words
} = optionsFromCli(process.argv)

createDir(outDir)
  .then(() => createTmpDir({ outDir }))
  // Get a list of required chars and check they exist
  .then(tmpDir => {
    const uniqueChars = [ ...new Set(words.join('').split('')) ]

    const charPaths = pathsFromChars({
      chars: uniqueChars,
      dir: charDir,
      ext: inputFormat
    })

    return Promise.all(charPaths.map(pathExists))
      .then(() => ({ charPaths, tmpDir }))
  })
  // Create temporary files
  .then(({ charPaths, tmpDir }) => {
    const func = charPath => createTmpFile({
      charPath,
      options: { size },
      tmpDir
    })

    return processQueue({ concurrency, func, queue: charPaths })
      .then(tmpPaths => {
        console.log('All temporary files created')
        return { tmpDir, tmpPaths }
      })
  })
  .then(({ tmpDir, tmpPaths }) => {
    const func = word => createWord({
      bg,
      format,
      inputFormat,
      letterSpacing,
      outDir,
      padding,
      tmpPaths,
      word
    })

    return processQueue({ concurrency, func, queue: words })
      .then(() => tmpDir)
  })
  .then(tmpDir => {
    console.log('Tidying up temporary files')
    deleteDir(tmpDir)
  })
  .then(() => console.log('All words created!'))
  .catch(err => console.error(err))
