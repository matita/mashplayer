module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    concat: {
      scripts: {
        src: 'src/**/*.js',
        dest: './mashplayer.js'
      }
    },

    copy: {
      test: {
        src: './mashplayer.js',
        dest: 'test/mashplayer.js'
      }
    },

    browserify: {
      scripts: {
        files: {
          './mashplayer.js': ['src/player.js']
        }
      },

      test: {
        files: {
          './test/test.js': ['./test/app.js']
        }
      }
    },

    watch: {
      scripts: {
        files: 'src/**/*.js',
        tasks: ['browserify:scripts', 'copy:test', 'browserify:test'],
        options: {
          debounceDelay: 250
        }
      }
    }
  });

  grunt.registerTask('default', ['watch']);

}