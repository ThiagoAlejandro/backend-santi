import { Request, Response, NextFunction } from "express";

export const asyncWrap = function (fn) {
  return function (req, res, done) {
    return fn(req, res).catch(done);
  };
};
