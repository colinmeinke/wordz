import del from 'del'
import fs from 'fs'
import gm from 'gm'
import p from 'path'
import Promise from 'bluebird'

Promise.promisifyAll(fs)
Promise.promisifyAll(gm.prototype)

const calculateDimensions = ({ letterSpacing, padding, paths }) => new Promise((resolve, reject) => {
  Promise.reduce(paths, ({ height, pathDimensions, width }, path, i) => (
    new Promise((resolve, reject) => {
      gm(path)
        .sizeAsync()
        .then(size => {
          height = Math.max(height, size.height + padding[ 0 ] + padding[ 2 ])
          width += i ? letterSpacing : padding[ 3 ]

          const x = width
          const y = padding[ 0 ]

          width += size.width

          if (i === paths.length - 1) {
            width += padding[ 1 ]
          }

          resolve({
            height,
            pathDimensions: [
              ...pathDimensions,
              { height: size.height, width: size.width, x, y }
            ],
            width
          })
        })
    }
  )), { height: 0, pathDimensions: [], width: 0 })
    .then(resolve)
    .catch(reject)
})

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

  console.log(`Creating temporary file ${file}`)

  gm(charPath)
    .identifyAsync('%h')
    .then(height => {
      gm(charPath)
        .in('-format', '%@')
        .writeAsync('info:-')
        .then(result => {
          const [ width, , x ] = result.split(/[\+x]+/)

          const state = gm(charPath).crop(width, height, x, 0)

          if (size && !isNaN(size)) {
            state.resize(null, parseInt(size, 10))
          }

          state
            .writeAsync(tmpPath)
            .then(() => {
              console.log(`${file} written to ${tmpDir}`)
              resolve(tmpPath)
            })
        })
    })
    .catch(reject)
})

const createWord = ({
  bg,
  format,
  inputFormat,
  letterSpacing,
  outDir,
  padding,
  tmpPaths,
  word
}) => new Promise((resolve, reject) => {
  const chars = word.split('')

  const tmpCharPaths = chars.map(char => findPathMatchingChar({
    char,
    ext: inputFormat,
    paths: tmpPaths
  }))

  console.log(`Calculating ${word} dimensions`)

  calculateDimensions({ letterSpacing, padding, paths: tmpCharPaths })
    .then(({ height, pathDimensions, width }) => {
      console.log(`Creating ${word}`)

      const outPath = p.join(outDir, `${word}.${format}`)
      const state = gm(width, height, bg || 'transparent')

      tmpCharPaths.map((path, i) => {
        const { height: pathHeight, width: pathWidth, x, y } = pathDimensions[ i ]

        state
          .in('-resize', `${pathWidth}x${pathHeight}!`)
          .in('-page', `+${x}+${y}`)
          .in(path)
      })

      state
        .mosaic()
        .setFormat(format)
        .writeAsync(outPath)
        .then(() => {
          console.log(`Success! ${word} saved to ${outPath}`)
          resolve(word)
        })
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

const getPadding = values => {
  const padding = values.map(v => parseInt(v, 10))

  if (!padding.length) {
    return [ 0, 0, 0, 0 ]
  }

  if (typeof padding[ 1 ] === 'undefined') {
    padding[ 1 ] = padding[ 0 ]
  }

  if (typeof padding[ 2 ] === 'undefined') {
    padding[ 2 ] = padding[ 0 ]
  }

  if (typeof padding[ 3 ] === 'undefined') {
    padding[ 3 ] = padding[ 1 ]
  }

  return padding
}

const optionsFromCli = args => {
  const options = args.slice(2)

  const bg = getOptions({ key: 'bg', options }).toString()
  const charDir = getOptions({ key: 'charDir', options }).toString()
  const format = getOptions({ key: 'format', options }).toString() || 'png'
  const inputFormat = getOptions({ key: 'inputFormat', options }).toString() || 'png'
  const letterSpacing = parseInt(getOptions({ key: 'letterSpacing', options }).toString() || 0, 10)
  const outDir = getOptions({ key: 'outDir', options }).toString()
  const padding = getPadding(getOptions({ key: 'padding', options }))
  const size = getOptions({ key: 'size', options }).toString()
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
    padding,
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
