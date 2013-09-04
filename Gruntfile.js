
/**
 * MailDev - Gruntfile.js
 */

var lrSnippet = require('grunt-contrib-livereload/lib/utils').livereloadSnippet;
var mountFolder = function (connect, dir) {
  return connect.static(require('path').resolve(dir));
};


module.exports = function (grunt) {
  
  // load all grunt tasks
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  var packageJSON = grunt.file.readJSON('package.json');

  // configurable paths
  var yeomanConfig = {
    app: 'app',
    assets: 'assets',
    dist: 'dist',
    packaged: packageJSON.name + '-' + packageJSON.version
  };

  try {
    yeomanConfig.app = require('./component.json').appPath || yeomanConfig.app;
  } catch (e) {}

  grunt.initConfig({
    yeoman: yeomanConfig,
    watch: {
      coffee: {
        files: ['<%= yeoman.assets %>/scripts/{,*/}*.coffee'],
        tasks: ['coffee:dist']
      },
      coffeeTest: {
        files: ['test/spec/{,*/}*.coffee'],
        tasks: ['coffee:test']
      },
      compass: {
        files: ['<%= yeoman.assets %>/styles/{,*/}*.{scss,sass}'],
        tasks: ['compass']
      }//,
      // livereload: {
      //   files: [
      //     '<%= yeoman.app %>/{,*/}*.html',
      //     '{.tmp,<%= yeoman.app %>}/styles/{,*/}*.css',
      //     '{.tmp,<%= yeoman.app %>}/scripts/{,*/}*.js',
      //     '<%= yeoman.app %>/images/{,*/}*.{png,jpg,jpeg}'
      //   ],
      //   tasks: ['livereload']
      // }
    },
    connect: {
      livereload: {
        options: {
          port: 9000,
          // Change this to '0.0.0.0' to access the server from outside.
          hostname: 'localhost',
          middleware: function (connect) {
            return [
              lrSnippet,
              mountFolder(connect, '.tmp'),
              mountFolder(connect, yeomanConfig.app)
            ];
          }
        }
      },
      test: {
        options: {
          port: 9000,
          middleware: function (connect) {
            return [
              mountFolder(connect, '.tmp'),
              mountFolder(connect, 'test')
            ];
          }
        }
      }
    },
    open: {
      server: {
        url: 'http://localhost:<%= connect.livereload.options.port %>'
      },
      dev: {
        url: 'http://localhost:1080'
      }
    },
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      all: [
        'Gruntfile.js'//,
        // 'index.js',
        // 'lib/*.js'
        // '<%= yeoman.app %>/scripts/{,*/}*.js'
      ]
    },
    coffee: {
      dist: {
        expand: true,
        cwd: '<%= yeoman.assets %>/scripts/',
        src: ['**/*.coffee'],
        dest: '<%= yeoman.app %>/scripts/',
        ext: '.js',
        options: {
          bare: true
        }
      }
    },
    compass: {
      options: {
        sassDir: '<%= yeoman.assets %>/styles',
        cssDir: '<%= yeoman.app %>/styles',
        // imagesDir: 'images',
        javascriptsDir: '<%= yeoman.app %>/scripts',
        fontsDir: 'styles/fonts',
        importPath: '<%= yeoman.app %>/components',
        relativeAssets: false
      },
      dist: {},
      server: {
        options: {
          debugInfo: true
        }
      }
    },
    copy: {
      packaged: {
        files: [
          {src:'<%= yeoman.dist %>/**', dest:'<%= yeoman.packaged %>/' },
          {
            expand: true,
            dest: '<%= yeoman.packaged %>',
            src: [
              '*.coffee',
              'LICENSE',
              'package.json',
              'README.md'
            ]
          }
        ]
      }
    },
    zip: {
      '<%= yeoman.packaged %>.zip': ['<%= yeoman.packaged %>/**']
    }
  });

  grunt.registerTask('server', [
    'coffee:dist',
    'compass:server',
    'livereload-start',
    'connect:livereload',
    'open:server',
    'watch'
  ]);

  // New Dev function relies on Express for loading site
  grunt.registerTask('dev', [
    'coffee:dist',
    'compass:server',
    'open:dev',
    'watch'
  ]);

  grunt.registerTask('test', [
    'coffee',
    'compass',
    'connect:test'
  ]);

  // Create a .zip archive of the project
  grunt.registerTask('package', [
    'build',
    'copy:packaged',
    'zip'
  ]);

  grunt.registerTask('build', [
    'jshint',
    // 'test',
    'coffee',
    'compass:dist'
  ]);

  grunt.registerTask('default', ['build']);
};
