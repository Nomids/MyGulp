//Подключаем галп
const {
  src,
  dest,
  series,
  watch
} = require('gulp');
const sass = require('gulp-sass')
const less = require('gulp-less')
const stylus = require('gulp-stylus')
const csso = require('gulp-csso')
const rename = require("gulp-rename")
const sourcemaps = require('gulp-sourcemaps')
const include = require('gulp-file-include')
const htmlmin = require('gulp-htmlmin')
const del = require('del')
const concat = require('gulp-concat')
const autoprefixer = require('gulp-autoprefixer')
const sync = require('browser-sync').create()
const gulpWebpack = require('webpack-stream')
const imagemin = require('gulp-imagemin')
const fs = require('fs')
const pug = require('gulp-pug');
const { resolve } = require('path');
const { rejects } = require('assert');


const compilePreprocessorCSS = 'scss'
const compilePreprocessorHTML = 'pug'

const returnCompile = (name)=>{
  switch(compilePreprocessorCSS){
    case "styl": 
      return `@import './components/${name}'\n`; 
    break;
    case "scss": 
      return `@import "./components/${name}";\n`; 
    break;
    case "sass": 
      return `@import "./components/${name}"\n`; 
    break;
    case "less": 
      return `@import "./components/_${name}.less";\n`; 
    break;
  }
}

function html() {
  if (compilePreprocessorHTML == 'html') {
    return src('src/**.html')
      .pipe(include({
        prefix: '@@'
      }))
      .pipe(htmlmin({
        collapseWhitespace: true
      }))
      .pipe(dest('dist'))
  } else {
    return src('src/**.pug')
      .pipe(pug())
      .pipe(dest('dist'))
  }
}


function webpacks() {
  return src('src/js/main.js')
    .pipe(gulpWebpack({
      mode: 'production',
      output: {
        filename: '[name].js',
      },
      module: {
        rules: [{
          test: /\.m?js$/,
          exclude: /(node_modules|bower_components)/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env']
            }
          }
        }, ]
      }
    }))
    .on('error', function (err) {
      console.error('WEBPACK ERROR', err);
      this.emit('end'); // Don't stop the rest of the task
    })
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(sourcemaps.init())
    .pipe(sourcemaps.write('.'))
    .pipe(dest('dist/js'))
    .pipe(sync.stream());
}


function fonts() {
  return src('./src/font/**.ttf')
    .pipe(dest('./dist/font/'));
}


function stylecCompiler() {
  return src(`src/${compilePreprocessorCSS}/index.${compilePreprocessorCSS}`)
    .pipe(sourcemaps.init())
    .pipe(sass())
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(autoprefixer())
    .pipe(csso())
    .pipe(sourcemaps.write('.'))
    .pipe(dest('./dist/style'))
    .pipe(sync.stream());
}


function minifyImg() {
  return src('src/img/*')
    .pipe(imagemin())
    .pipe(dest('dist/img'))
}


const cb = () => {};

const checkWeight = (fontname) => {
  let weight = 400;
  switch (true) {
    case /Thin/.test(fontname):
      weight = 100;
      break;
    case /ExtraLight/.test(fontname):
      weight = 200;
      break;
    case /Light/.test(fontname):
      weight = 300;
      break;
    case /Regular/.test(fontname):
      weight = 400;
      break;
    case /Medium/.test(fontname):
      weight = 500;
      break;
    case /SemiBold/.test(fontname):
      weight = 600;
      break;
    case /Semi/.test(fontname):
      weight = 600;
      break;
    case /Bold/.test(fontname):
      weight = 700;
      break;
    case /ExtraBold/.test(fontname):
      weight = 800;
      break;
    case /Heavy/.test(fontname):
      weight = 700;
      break;
    case /Black/.test(fontname):
      weight = 900;
      break;
    default:
      weight = 400;
  }
  return weight;
}

let srcFonts = './src/scss/fontstyle/_fonts.scss';
let appFonts = './app/fonts/';

const fontsStyle = (done) => {
  let file_content = fs.readFileSync(srcFonts);

  fs.writeFile(srcFonts, '', cb);
  fs.appendFile(srcFonts, '@import "./font-face";\r\n', cb);
  fs.readdir(appFonts, function (err, items) {
    if (items) {
      let c_fontname;
      for (var i = 0; i < items.length; i++) {
				let fontname = items[i].split('.');
				fontname = fontname[0];
        let font = fontname.split('-')[0];
        let weight = checkWeight(fontname);

        if (c_fontname != fontname) {
          fs.appendFile(srcFonts, `@include font-face("${font}", "${fontname}", ${weight});\r\n`, cb);
        }
        c_fontname = fontname;
      }
    }
  })

  done();
}

const srcPage = './src/page/',
  srcToCreate = `./src/${compilePreprocessorCSS}/components`;

async function constructor() {
  await fs.readdir(srcPage, '', function (err, item) {
    fs.mkdir(`src/${compilePreprocessorCSS}/components`, ()=>{})
    if (item) {
      fs.writeFile(`./src/${compilePreprocessorCSS}/_component.${compilePreprocessorCSS}`, '', cb)
      item.forEach(el => {
        let componentName = el.split('.');
        componentName = componentName[0];

        console.log("\x1b[33m", `Complete ${componentName}`);
        fs.appendFile(`./src/${compilePreprocessorCSS}/_component.${compilePreprocessorCSS}`, returnCompile(componentName), cb);
        fs.appendFile(`${srcToCreate}/_${componentName}.${compilePreprocessorCSS}`, '', ()=>{});
      });
    }

    if (err) {
      console.error(err);
      return
    }
  })
}


function clear() {
  return del('dist')
}


function server() {
  sync.init({
    server: './dist'
  })

  watch('src/page', series(constructor)).on('change', sync.reload)
  watch('src/**/**.pug', series(html)).on('change', sync.reload)
  watch('src/**/**.html', series(html)).on('change', sync.reload)
  watch('src/font/**', fonts).on('change', sync.reload)
  watch('src/js/**/*.js', webpacks).on('change', sync.reload)
  watch('src/scss/**/**.scss', series(stylecCompiler)).on('change', sync.reload)
  watch('src/less/**/**.less', series(stylecCompiler)).on('change', sync.reload)
  watch('src/styl/**/**.styl', series(stylecCompiler)).on('change', sync.reload)
  watch('src/img/**', series(minifyImg)).on('change', sync.reload)
}


// Дефолтные настройки 
exports.default = series(clear, constructor, webpacks, fonts, fontsStyle, stylecCompiler, html, minifyImg, server)

exports.clear = clear