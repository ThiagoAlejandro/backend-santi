const express = require('express');

//const  validationResult = require('express-validator');
import {
  calculateTextCredibility,
  socialCredibility,
  twitterUserCredibility,
  calculateTweetCredibility,
  scrapperTwitterUserCredibility,
  scrapedSocialCredibility,
  scrapedtweetCredibility
} from './service';

/* 
import { validationResult } from 'express-validator';
import { validate, errorMapper } from './validation';*/
import { asyncWrap } from '../utils'; 

const router = express.Router();

router.get('/plain-text', async function (req, res) {
  try {
    const rows = await calculateTextCredibility(
      {
        text: String(req.query.text),
        lang: req.query.lang
      },
      {
        weightBadWords: req.query.weightBadWords,
        weightMisspelling: req.query.weightMisspelling,
        weightSpam: req.query.weightSpam
      }
      );
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/twitter/tweets', asyncWrap(async function(req, res) {
/*   const errors = validationResult(req)
  if (!errors.isEmpty()){
    errorMapper(errors.array())
  }  */
  res.json(await calculateTweetCredibility(req.query.tweetId, {
    weightBadWords: +req.query.weightBadWords,
    weightMisspelling: +req.query.weightMisspelling,
    weightSpam: +req.query.weightSpam,
    weightSocial: +req.query.weightSocial,
    weightText: +req.query.weightText,
    weightUser: +req.query.weightUser },
  +req.query.maxFollowers))
}))

router.get('/twitter/tweets1', asyncWrap(async function(req, res) {
/*   const errors = validationResult(req)
  if (!errors.isEmpty()){
    errorMapper(errors.array())
  }  */
  res.json(await calculateTweetNewCredibility(req.query.tweetId, {
    weightBadWords: +req.query.weightBadWords,
    weightMisspelling: +req.query.weightMisspelling,
    weightSpam: +req.query.weightSpam,
    weightSocial: +req.query.weightSocial,
    weightText: +req.query.weightText,
    weightUser: +req.query.weightUser,
    weightHistoric: +req.query.weightHistoric
  },
  +req.query.maxFollowers))
}))



module.exports = router;
