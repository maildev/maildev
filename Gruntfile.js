
/**
 * MailDev - Gruntfile.js
 */

module.exports = function (grunt) {

  grunt.initConfig({
    
    // Path config:
    path: {
      app: 'app',
      assets: 'assets'
    },

    watch: {
      compass: {
        files: ['<%= path.assets %>/styles/{,*/}*.{scss,sass}'],
        tasks: ['compass']
      }
    },

    open: {
      dev: {
        url: 'http://localhost:1080'
      }
    },

    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      all: [
        'Gruntfile.js',
        'index.js',
        'lib/*.js',
        '<%= path.app %>/scripts/{,*/}*.js'
      ]
    },

    compass: {
      options: {
        sassDir: '<%= path.assets %>/styles',
        cssDir: '<%= path.app %>/styles',
        javascriptsDir: '<%= path.app %>/scripts',
        fontsDir: 'styles/fonts',
        importPath: '<%= path.app %>/components',
        relativeAssets: false
      },
      dist: {},
      server: {
        options: {
          debugInfo: true
        }
      }
    },
  });

  // Load all grunt tasks
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  grunt.registerTask('dev', [
    'compass:server',
    'open:dev',
    'watch'
  ]);

  grunt.registerTask('build', [
    'jshint',
    'compass:dist'
  ]);

  grunt.registerTask('default', ['build']);
};
