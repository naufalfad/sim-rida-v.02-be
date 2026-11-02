const express = require('express');
const { login, registerResearcher, getMe, getOpdList, getReviewersList } = require('./auth.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.post('/login', login);
router.post('/register-researcher', registerResearcher);
router.get('/me', authenticate, getMe);
router.get('/opd-list', authenticate, getOpdList);
router.get('/reviewers-list', authenticate, getReviewersList);

module.exports = router;

