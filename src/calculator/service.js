const { PerformanceObserver, performance } = require('perf_hooks');
const emojiStrip = require('emoji-strip');
const NSpell = require('nspell');
const wash = require('washyourmouthoutwithsoap');
const esDictionaryBase = require.resolve('dictionary-es');
const fs = require('fs');
const path = require('path');
const SimpleSpamFilter = require('./spam-filter');
const middleware = require('../middlewares');

const dictionaries = {
  es: {
    aff: fs.readFileSync(
      path.join(esDictionaryBase, '..', 'index.aff'),
      'utf-8'
    ),
    dic: fs.readFileSync(
      path.join(esDictionaryBase, '..', 'index.dic'),
      'utf-8'
    )
  }
};

const spellingCheckers = {
  es: new NSpell(dictionaries.es.aff, dictionaries.es.dic)
};

function removePunctuation(text) {
  return text.replace(
    /(~|`|!|@|#|$|%|^|&|\*|\(|\)|{|}|\[|\]|;|:|"|'|<|,|\.|>|\?|\/|\\|\||-|_|\+|=)/g,
    ''
  );
}
function removeEmoji(text) {
  return emojiStrip(text);
}

function removeMention(text) {
  return text.replace(/\B@[a-z0-9_-]+\s/gi, '');
}

function removeHashtag(text) {
  return text
    .split(' ')
    .filter((word) => !(/^#/.test(word) || /#$/.test(word)))
    .join(' ');
}

function removeURL(text) {
  return text.replace(/(https?:\/\/[^\s]+)/g, '');
}

function getCleanedWords(text) {
  return String(text).replace(/ \s+/g, ' ').split(' ');
}

function isBadWord(word) {
  return Object.keys(spellingCheckers).some((lang) => wash.check(lang, word));
}

function getBadWords(words) {
  return words.filter(isBadWord);
}
function cleanText(text) {
  return removePunctuation(
    removeEmoji(removeHashtag(removeMention(removeURL(text))))
  );
}
function badWordsCriteria(text) {
  const cleanedText = cleanText(text);
  const wordsInText = getCleanedWords(cleanedText);
  const badWordsInText = getBadWords(wordsInText);
  const data1 = badWordsInText.length;
  const data2 = wordsInText.length;
  const dataFinal = 100 - (100 * data1) / data2;
  return dataFinal;
}

function spamCriteria(text) {
  const spamParams = {
    minWords: 5,
    maxPercentCaps: 30,
    maxNumSwearWords: 2,
    lang: text.lang
  };
  const spamFilter = new SimpleSpamFilter(spamParams);
  const cleanedText = cleanText(text.text);
  return spamFilter.isSpam(cleanedText) ? 0 : 100;
}

function missSpellingCriteria(text) {
  const cleanedText = cleanText(text.text);
  const wordsInText = getCleanedWords(cleanedText);
  const spellingChecker = spellingCheckers[text.lang];
  const numOfMissSpells = wordsInText
    .filter((word) => isNaN(+word))
    .reduce((acc, curr) => (spellingChecker.correct(curr) ? acc : acc + 1), 0);
  return 100 - (100 * numOfMissSpells) / wordsInText.length;
}

async function getTweetInfo(tweetId)  {
  const DEBUG_TWEET_TWITTER_API_TIME_LABEL = 'Time spent calling the Twitter API\
  to get tweet info - ' + Math.random()
  //console.log("validación")
  console.time(DEBUG_TWEET_TWITTER_API_TIME_LABEL)
  const client = buildTwitClient()  

  try {
    const response = await client.get('statuses/show', { id: tweetId, tweet_mode: 'extended' })
    console.timeEnd(DEBUG_TWEET_TWITTER_API_TIME_LABEL)
    
    return responseToTweet(response.data)
  } catch (e) {
    console.log(e)
    console.timeEnd(DEBUG_TWEET_TWITTER_API_TIME_LABEL)
    throw e
  }
}

async function calculateTextCredibility(text, params, next) {
  const start = performance.now();
  const badWordsCalculation =
    Number(params.weightBadWords) * Number(badWordsCriteria(text.text));
  const spamCalculation = params.weightSpam * spamCriteria(text);
  const missSpellingCalculation =
    params.weightMisspelling * missSpellingCriteria(text);
  const credibility =
    badWordsCalculation + spamCalculation + missSpellingCalculation;
  const end = performance.now();
  console.log(
    JSON.stringify({
      time: end - start,
      metric: 'TEXT_CREDIBILITY'
    })
  );
  try {
    await middleware.mongoLoggerSave(credibility);
  } catch (error) {
    logger.info('Error en queryLogger - ini mongoDB');
  }
  return { credibility };
}

async function calculateTweetCredibility(tweetId,  params , maxFollowers) {
  //console.log(tweetId)
  try {
    const tweet = await getTweetInfo(tweetId)
    const user = tweet.user
    const userCredibility = calculateUserCredibility(user) * params.weightUser
    const textCredibility = calculateTextCredibility(tweet.text, params).credibility * params.weightText
    const socialCredibility = calculateSocialCredibility(user, maxFollowers) * params.weightSocial

    return {
      credibility: userCredibility + textCredibility + socialCredibility
    }
  } catch (e) {
    console.log(e)
    throw e
  }
}

module.exports.calculateTextCredibility = calculateTextCredibility;
module.exports.calculateTweetCredibility = calculateTweetCredibility;
