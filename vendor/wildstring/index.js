'use strict';

/**
* @namespace wildstring
* @property {string} wildcard the wildcard to use in your strings, defaults to '*'
* @property {boolean} caseSensitive whether matches should care about case, defaults to true
*/
var wildstring = {
	wildcard: '*',
	caseSensitive: true,

	/**
	* When a match doesn't continue to the end of the string, this function rolls back to try again with the rest of the string
	* @memberof wildstring
	* @access private
	* @param {string[]} rollbackStrings The list of substrings that appeared prior to the current match
	* @param {string[]} patternSubstrings The matching list of pattens that need to be matched before the current pattern
	*/
	checkRollbackStrings: function (rollbackStrings, patternSubstrings) {
		for (var s = 0; s < rollbackStrings.length; ++s) {
			var currentString = rollbackStrings[s].string;	// starting with the rolled back string
			var patternIndex = rollbackStrings[s].index;

			while (patternIndex < patternSubstrings.length) {
				if (currentString.indexOf(patternSubstrings[patternIndex]) === -1) {
					break;
				}

				var testString = currentString.substr(1);	//remove just one char to retest
				rollbackStrings.push({ string: testString, index: patternIndex });
				if (testString.indexOf(patternSubstrings[patternIndex]) === -1) {
					rollbackStrings.pop();
				}

				currentString = currentString.substr(
					currentString.indexOf(patternSubstrings[patternIndex]) + patternSubstrings[patternIndex].length
				);

				patternIndex++;
				while (patternSubstrings[patternIndex] === '') {
					patternIndex++;
				}

				if (patternIndex >= patternSubstrings.length) {
					if (patternSubstrings[patternSubstrings.length - 1] !== '' &&
						currentString.length > 0) {
						// not ending with a wildcard, we need to backtrack
						break;
					}
					else {
						return true;
					}
				}
			}
		}

		return false;
	},

	/**
	* Check if a string matches a pattern
	* @memberof wildstring
	* @param {string} pattern The pattern to match using the configured wildcard
	* @param {string} string The string to test for a match
	*/
	match: function (pattern, string) {
		if (!wildstring.caseSensitive) {
			pattern = pattern.toLowerCase();
			string = string.toLowerCase();
		}

		// if there are no wildcards, must be exact
		if (pattern.indexOf(wildstring.wildcard) === -1) {
			return pattern === string;
		}
		var patternSubstrings = pattern.split(wildstring.wildcard);
		
		var patternIndex = 0;
		var currentString = string;

		// find pattern beginning
		while (patternSubstrings[patternIndex] === '') {
			patternIndex++;
			// if the pattern is just wildcards, it matches
			if (patternIndex === pattern.length) {
				return true;
			}
		}

		if (patternIndex === 0 && string.indexOf(patternSubstrings[0]) !== 0) {
			// not starting with a wildcard
			return false;
		}

		var rollbackStrings = [];

		while (patternIndex < patternSubstrings.length) {
			if (currentString.indexOf(patternSubstrings[patternIndex]) === -1) {
				return wildstring.checkRollbackStrings(rollbackStrings, patternSubstrings);
			}
			
			// create a queue of strings to roll back and try again if we fail later
			var testString = currentString.substr(1);	//remove just one char to retest
			rollbackStrings.push({ string: testString, index: patternIndex });
			if (testString.indexOf(patternSubstrings[patternIndex]) === -1) {
				rollbackStrings.pop();
			}

			currentString = currentString.substr(
				currentString.indexOf(patternSubstrings[patternIndex]) + patternSubstrings[patternIndex].length
			);

			patternIndex++;
			while (patternSubstrings[patternIndex] === '') {
				patternIndex++;
			}
		}

		if (patternIndex >= patternSubstrings.length &&
				patternSubstrings[patternSubstrings.length - 1] !== '' &&
				currentString.length > 0) {
			// not ending with a wildcard, we need to backtrack
			if (currentString === string) { // this string doesn't even match a little
				return false;
			}

			return wildstring.checkRollbackStrings(rollbackStrings, patternSubstrings);
		}

		return true;
	},

	/**
	* Replace wildcards in a pattern with strings (string interpolation)
	* @memberof wildstring
	* @param {string} pattern The start string, using wildcards as placeholders
	* @param {string|string[]} strings The string or strings to replace the wildcards in the pattern.
	* 	If you pass a single string, it will replace all the wildcards with the string.
	* 	If you pass an array of strings, they will replace the wildcards in order from left to right.
	* @throws The number of items in the strings array (if you pass an array) must match the number of wildcards in the pattern string.
	* @throws You need to pass both parameters
	* @throws You need to pass the right types
	*/
	replace: function (pattern, strings) {
		if (pattern === undefined || strings === undefined) {
			throw new Error('wildstring.replace takes the pattern as one parameter and either a string or an array of strings as the second.  You didn\'t pass enough parameters.');
		}
		if (typeof(strings) === typeof('')) {
			return pattern.replace(wildstring.wildcard, strings);
		}
		if (!Array.isArray(strings) || typeof(pattern) !== typeof('')) {
			throw new Error('wildstring.replace takes the pattern as one parameter and either a string or an array of strings as the second.  Your parameter types are incorrect.');
		}
		if (pattern.indexOf(wildstring.wildcard) === -1) {
			return pattern; // if there are no wildcards, just return the pattern
		}
		var patternSubstrings = pattern.split(wildstring.wildcard);
		if (patternSubstrings.length - 1 !== strings.length) {
			var message = 'There are a different number of wildcards than strings to replace them. You have ' +
				wildstring.wildcard +' wildcards in "' + wildstring.wildcard + '" and ' + wildstring.wildcard +
				' replacement strings.';
			throw new Error(wildstring.replace(message, [ patternSubstrings.length - 1, pattern, strings.length ]));
		}

		var result = '';

		for (var s = 0; s < strings.length; ++s) {
			result += patternSubstrings[s] + strings[s];
		}

		return result;
	}
};

if (typeof(module) !== 'undefined') { module.exports = wildstring; }
if (typeof(angular) !== 'undefined') { angular.module('wildstring', []).factory('wildstring', function() { return wildstring; }); }
if (typeof(define) !== 'undefined') { define([], wildstring); }
