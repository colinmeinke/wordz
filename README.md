# Wordz

## Installation

First you will need [node](https://nodejs.org/en),
[Graphics Magick](http://www.graphicsmagick.org) and
[Image Magick](http://www.imagemagick.org) installed on your machine.

Assuming you have [homebrew](http://brew.sh) installed, run these three
commands in your terminal.

```
brew install node
brew install graphicsmagick
brew install imagemagick
```

Now you can install Wordz.

```
npm install -g wordz
```

## Usage

This is the most basic example of running Wordz.

```
wordz --words hello world --charDir ~/Desktop/font --outDir ~/Desktop
```

## Options

### --bg

The background color. e.g. `--bg rgb(235,235,220)`.

Can be any color supported by Graphics Magick.

If omitted background color will not be affected.

### --charDir

The path to the directory of font character files. e.g.
`--charDir ~/Desktop/font`.

Your character directory will need one file for each letter you use. For
example, to output the word foo, the character directory needs to include
the files `f.png` and `o.png`.

### --format

The output format. e.g. `--format jpg`.

If omitted this will default to `png`.

Can be any format supported by Graphics Magick.

### --inputFormat

The input format. e.g. `--inputFormat jpg`.

If omitted this will assume input character files are `png`.

### --letterSpacing

The letter spacing in pixels e.g. `--letterSpacing 20`.

Can be any number.

If omitted there will be no letter spacing.

### --outDir

The path to the output directory. e.g. `--outDir ~/Desktop`.

### --padding

The space around the word. e.g. `--padding 100`.

Can be a single number that will apply the same padding to each side, or a
series of 4 space separated numbers that represent top, right, bottom and left
padding respectively.

If omitted there will be no space around the word.

### --size

The font size in pixels. e.g. `--size 200`.

Can be any number.

If omitted characters will not be scaled.

### --words

A space separated list of words to output. e.g. `--words hello world`.
