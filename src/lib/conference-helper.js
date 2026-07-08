const { Conference } = require('../models/mysql');

async function getConferenceIdByCode(conferenceCode) {
  if (!conferenceCode) throw new Error('CONFERENCE_CODE_REQUIRED');
  const conference = await Conference.findOne({ where: { conferenceCode }, attributes: ['id'] });
  if (!conference) throw new Error('CONFERENCE_NOT_FOUND');
  return conference.id;
}

async function getConferenceByCode(conferenceCode) {
  if (!conferenceCode) throw new Error('CONFERENCE_CODE_REQUIRED');
  const conference = await Conference.findOne({ where: { conferenceCode }, attributes: ['id', 'conferenceCode'] });
  if (!conference) throw new Error('CONFERENCE_NOT_FOUND');
  return conference;
}

module.exports = {
  getConferenceIdByCode,
  getConferenceByCode,
};
