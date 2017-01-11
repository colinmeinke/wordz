import del from 'del'
import fs from 'fs'
import gm from 'gm'
import p from 'path'
import Promise from 'bluebird'

Promise.promisifyAll(fs)
Promise.promisifyAll(gm.prototype)

const createDir = dir => new Promise((resolve, reject) => {
  pathExists(dir)
    .then(resolve)
    .catch(() => {
      fs.mkdirAsync(dir)
        .then(() => resolve())
        .catch(reject)
    })
})

const createTmpDir = ({ outDir, i = 0 }) => new Promise((resolve, reject) => {
  const path = p.join(outDir, `tmp${i || ``}`)

  pathExists(path)
    .then(() => {
      createTmpDir({ outDir, i: ++i })
        .then(resolve)
        .catch(reject)
    })
    .catch(() => {
      createDir(path)
        .then(() => resolve(path))
        .catch(reject)
    })
})

const createTmpFile = ({ charPath, options, tmpDir }) => new Promise((resolve, reject) => {
  const { size } = options
  const file = fileFromPath(charPath)
  const tmpPath = p.join(tmpDir, file)

  console.log(`Attempting to create temporary file ${file}`)

  gm(charPath)
    .trim()
    .resize(null, size)
    .writeAsync(tmpPath)
    .then(() => {
      console.log(`${file} written to ${tmpDir}`)
      resolve(tmpPath)
    })
    .catch(reject)
})

const createWord = ({
  bg,
  format,
  inputFormat,
  letterSpacing,
  outDir,
  tmpPaths,
  word
}) => new Promise((resolve, reject) => {
  const chars = word.split('')

  const tmpCharPaths = chars.map(char => findPathMatchingChar({
    char,
    ext: inputFormat,
    paths: tmpPaths
  }))

  const firstTmpCharPath = tmpCharPaths.shift()
  const outPath = p.join(outDir, `${word}.${format}`)

  console.log(`Attempting to create ${word}`)

  const appendPath = (currentImg, path) => {
    const opts = []

    if (letterSpacing) {
      currentImg.in('-size', `${letterSpacing}x100%`)
      currentImg.append('xc:transparent')
    }

    return currentImg.append(path, true)
  }

  const currentImg = tmpCharPaths
    .reduce(appendPath, gm(firstTmpCharPath))

  if (bg) {
    currentImg.out('-background', bg)
    currentImg.out('-extent', '0x0')
  }

  currentImg
    .setFormat(format)
    .writeAsync(outPath)
    .then(() => {
      console.log(`Success! ${word} saved to ${outPath}`)
      resolve(word)
    })
    .catch(reject)
})

const deleteDir = dir => new Promise((resolve, reject) => {
  del(dir, { force: true })
    .then(resolve)
    .catch(reject)
})

const fileFromPath = path => p.basename(path)

const findPathMatchingChar = ({ char, ext, paths }) => {
  const file = `${char}.${ext}`

  for (let i = 0, l = paths.length; i < l; i++) {
    const path = paths[ i ]

    if (path.endsWith(file)) {
      return path
    }
  }

  return null
}

const getOptions = ({ key, options }) => {
  const k = `--${key}`
  const i = options.indexOf(k)

  if (i !== -1) {
    let stop = false

    return [ ...options ].splice(i + 1)
      .map(v => {
        if (v.includes('--')) {
          stop = true
        }

        return stop ? false : v
      })
      .filter(v => v !== false)
  }

  return []
}

const optionsFromCli = args => {
  const options = args.slice(2)

  const bg = getOptions({ key: 'bg', options }).toString()
  const charDir = getOptions({ key: 'charDir', options }).toString()
  const format = getOptions({ key: 'format', options }).toString() || 'png'
  const inputFormat = getOptions({ key: 'inputFormat', options }).toString() || 'png'
  const letterSpacing = parseInt(getOptions({ key: 'letterSpacing', options }).toString() || 0, 10)
  const outDir = getOptions({ key: 'outDir', options }).toString()
  const size = parseInt(getOptions({ key: 'size', options }).toString() || 16, 10)
  const words = getOptions({ key: 'words', options })

  if (!charDir) {
    throw Error('You must define a --charDir option')
  }

  if (!outDir) {
    throw Error('You must define a --outDir option')
  }

  if (!words.length) {
    throw Error('You must define a --words option')
  }

  return {
    bg,
    charDir,
    format,
    inputFormat,
    letterSpacing,
    outDir,
    size,
    words
  }
}

const pathExists = path => new Promise((resolve, reject) => {
  fs.accessAsync(path)
    .then(() => resolve(path))
    .catch(() => reject(`${path} does not exist`))
})

const pathsFromChars = ({ chars, dir, ext }) => chars.map(char => (
  p.join(dir, `${char}.${ext}`)
))

export {
  createDir,
  createTmpDir,
  createTmpFile,
  createWord,
  deleteDir,
  fileFromPath,
  findPathMatchingChar,
  getOptions,
  optionsFromCli,
  pathExists,
  pathsFromChars
}
