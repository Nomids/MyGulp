const {
  src,
  dest,
  series,
  parallel,
  watch
} = require('gulp');
const notify = require('gulp-notify');
const sass = require('gulp-sass')
const less = require('gulp-less')
const stylus = require('gulp-stylus')
const csso = require('gulp-csso')
const cleanCSS = require('gulp-clean-css');
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
const svgSprite = require('gulp-svg-sprite')
const svgmin = require('gulp-svgmin')
const cheerio = require('gulp-cheerio')
const fs = require('fs')
const pug = require('gulp-pug');
const ttf2woff2 = require('gulp-ttf2woff2');


const compilePreprocessorCSS = 'scss'
const compilePreprocessorHTML = 'html'

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

const svgSprites = () => {
  return src('./src/img/svg/**.svg')
    .pipe(svgmin({
      js2svg: {
        pretty: true
      }
    }))
    .pipe(cheerio({
      run: ($) => {
        $('[fill]').removeAttr('fill');
        $('[stroke]').removeAttr('stroke');
        $('[style]').removeAttr('style');
      },
      parserOptions: {xmlMode: true}
    }))
    .pipe(svgSprite({
      mode: {
        stack: {
          sprite: "../sprite.svg" //sprite file name
        }
      },
    }))
    .pipe(dest('./dist/img'));
}

function minifyImg() {
  return src(['./src/img/*.jpg', './src/img/*.png', './src/img/**.jpeg', './src/img/*.svg'])
    .pipe(imagemin())
    .pipe(dest('dist/img'))
}

function webpacks() {
  return src('src/js/main.js')
    .pipe(gulpWebpack({
      mode: 'production',
      output: {
        filename: 'main.js',
      },
      module: {
        rules: [{
          test: /\.m?js$/,
          exclude: /(node_modules|bower_components)/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [['@babel/preset-env', {
                useBuiltIns: 'usage',
                corejs: 3
              }]]
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
    .pipe(ttf2woff2())
    .pipe(dest('./dist/font/'));
}

const returnCompile = (name)=>{
  let defaultComile = `@import "./components/${name}";\n`
  switch(compilePreprocessorCSS){
    case "styl": 
      defaultComile = `@import './components/${name}'\n`; 
    break;
    case "sass": 
      defaultComile = `@import "./components/${name}"\n`; 
    break;
    case "less": 
      defaultComile = `@import "./components/_${name}.less";\n`; 
    break;
  }
  return defaultComile;
}

const stylecCompiler = () => {
  return src(`./src/${compilePreprocessorCSS}/**/*.${compilePreprocessorCSS}`)
    .pipe(sourcemaps.init())
    .pipe(sass({
      outputStyle: 'expanded'
    }).on("error", notify.onError()))
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(autoprefixer({
      cascade: false,
    }))
    .pipe(cleanCSS({
      level: 2
    }))
    .pipe(sourcemaps.write('.'))
    .pipe(dest('./dist/css/'))
    .pipe(sync.stream());
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
let appFonts = './src/font/';

const fontsStyle = (done) => {
  let file_content = fs.readFileSync(srcFonts);

  fs.writeFile(srcFonts, '', cb);
  fs.appendFile(srcFonts, '@import "./font-face";\r\n\r\n', cb);
  fs.readdir(appFonts, '', function (err, items) {
    if (items) {
      let c_fontname;
      items.forEach(item => {
        let fontname = item.split('.');
				fontname = fontname[0];
        let font = fontname.split('-')[0];
        let weight = checkWeight(fontname);

        console.log(item);
        if (c_fontname != fontname) {
          fs.appendFile(srcFonts, `@include font-face("${font}", "${fontname}", ${weight});\r\n`, cb);
        }
        c_fontname = fontname;
      })
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

const watching = (src, func, )=>{
  watch(src, func).on('change', sync.reload)
}

function server() {
  sync.init({
    server: './dist'
  })

  watching('src/page', constructor);
  watching('src/**/**.pug', html);
  watching('src/**/**.html', html);
  watching('src/font/**', fonts);
  watching('src/js/**/*.js', webpacks);
  watching('src/scss/**/**.scss', stylecCompiler);
  watching('src/less/**/**.less', stylecCompiler);
  watching('src/styl/**/**.styl', stylecCompiler);
  watching('src/img/svg/**.svg', svgSprites);
  watching('src/img/**', minifyImg);
}

// Дефолтные настройки 
exports.default = series(clear, parallel(fonts, minifyImg, svgSprites), constructor, webpacks, fontsStyle, stylecCompiler, html, server)
exports.clear = clear