#! /usr/bin/env node

import {
  createDir,
  createTmpDir,
  createTmpFile,
  createWord,
  deleteDir,
  optionsFromCli,
  pathExists,
  pathsFromChars
} from './helpers'

import Promise from 'bluebird'

const {
  charDir,
  format,
  inputFormat,
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
  .then(({ charPaths, tmpDir }) => (
    Promise.all(
      charPaths.map(charPath => createTmpFile({
        charPath,
        options: { size },
        tmpDir
      }))
    )
      .then(tmpPaths => ({ tmpDir, tmpPaths }))
  ))
  .then(({ tmpDir, tmpPaths }) => {
    console.log('All temporary files created')

    return Promise.all(
      words.map(word => createWord({
        format,
        inputFormat,
        outDir,
        tmpPaths,
        word
      }))
    )
      .then(() => tmpDir)
  })
  .then(tmpDir => {
    console.log('Tidying up temporary files')
    deleteDir(tmpDir)
  })
  .then(() => console.log('All words created!'))
  .catch(err => console.error(err))
