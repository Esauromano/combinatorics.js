var fs = require('fs'),
    gulp = require('gulp'),
    gutil = require('gulp-util'),
    webpack = require('webpack'),
    uglify = require('uglify-js'),
    docgenerator = require('./tools/docgenerator');

var ENTRY       = './index.js',
    HEADER      = './lib/header.js',
    VERSION     = './lib/version.js',
    FILE        = 'combinatorics.js',
    FILE_MIN    = 'combinatorics.min.js',
    FILE_MAP    = 'combinatorics.map',
    DIST        = './dist',
    REF_SRC     = './lib/',
    REF_DEST    = './docs/reference/functions/',
    COMBINATORICS_JS     = DIST + '/' + FILE;

// generate banner with today's date and correct version
function createBanner() {
  var today = gutil.date(new Date(), 'yyyy-mm-dd'); // today, formatted as yyyy-mm-dd
  var version = require('./package.json').version;

  return String(fs.readFileSync(HEADER))
      .replace('@@date', today)
      .replace('@@version', version);
}

// generate a js file containing the version number
function updateVersionFile() {
  var version = require('./package.json').version;

  // generate file with version number
  fs.writeFileSync(VERSION, 'module.exports = \'' + version + '\';\n' +
      '// Note: This file is automatically generated when building combinatorics.js.\n' +
      '// Changes made in this file will be overwritten.\n');
}

var bannerPlugin = new webpack.BannerPlugin(createBanner(), {
  entryOnly: true,
  raw: true
});

var webpackConfig = {
  entry: ENTRY,
  output: {
    library: 'combinatorics',
    libraryTarget: 'umd',
    path: DIST,
    filename: FILE
  },
  externals: [
    'crypto' // is referenced by decimal.js
  ],
  plugins: [ bannerPlugin ],
  cache: true
};

var uglifyConfig = {
  outSourceMap: FILE_MAP,
  output: {
    comments: /@license/
  }
};

// create a single instance of the compiler to allow caching
var compiler = webpack(webpackConfig);
gulp.task('bundle', function (cb) {
//gulp.task('bundle', ['validate'], function (cb) {
  // update the banner contents (has a date in it which should stay up to date)
  bannerPlugin.banner = createBanner();

  updateVersionFile();

  compiler.run(function (err, stats) {
    if (err) {
      gutil.log(err);
    }

    gutil.log('bundled ' + COMBINATORICS_JS);

    cb();
  });
});

gulp.task('minify', ['bundle'], function () {
  var oldCwd = process.cwd();
  process.chdir(DIST);

  try {
    var result = uglify.minify([FILE], uglifyConfig);

    fs.writeFileSync(FILE_MIN, result.code);
    fs.writeFileSync(FILE_MAP, result.map);

    gutil.log('Minified ' + FILE_MIN);
    gutil.log('Mapped ' + FILE_MAP);
  } catch(e) {
    throw e;
  } finally {
    process.chdir(oldCwd);
  }
});

//// test whether the docs for the expression parser are complete
//gulp.task('validate', function (cb) {
  //var child_process = require('child_process');
//
  // this is run in a separate process as the modules need to be //reloaded
  //// with every validation (and required modules stay in cache).
  //child_process.execFile ('node', ['./tools/validate'], function(err//, stdout, stderr) {
    //if (err instanceof Error) {
      //throw err;
    //}
    //process.stdout.write(stdout);
    //process.stderr.write(stderr);
    //cb();
  //});
//});

gulp.task('docs', function () {
  docgenerator.iteratePath(REF_SRC, REF_DEST);
});

// The watch task (to automatically rebuild when the source code changes)
gulp.task('watch', ['bundle', 'minify'], function () {
  gulp.watch(['index.js', 'lib/**/*.js'], ['bundle', 'minify']);
});

// The default task (called when you run `gulp`)
gulp.task('default', ['bundle', 'minify']);
