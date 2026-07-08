const { Conference } = require('../models/mysql');
const { emitToConference } = require('../lib/realtime');

async function setSlide({ conferenceCode, url, title }) {
  const conference = await Conference.findOne({ where: { conferenceCode } });
  if (!conference) throw new Error('CONFERENCE_NOT_FOUND');

  await conference.update({
    currentSlideUrl: url,
    currentSlideTitle: title || '',
  });

  emitToConference(conference.id, 'slide-updated', {
    url: conference.currentSlideUrl,
    title: conference.currentSlideTitle,
  });

  return conference;
}

async function clearSlide({ conferenceCode }) {
  const conference = await Conference.findOne({ where: { conferenceCode } });
  if (!conference) throw new Error('CONFERENCE_NOT_FOUND');

  await conference.update({
    currentSlideUrl: null,
    currentSlideTitle: null,
  });

  emitToConference(conference.id, 'slide-updated', {
    url: null,
    title: null,
  });

  return conference;
}

module.exports = {
  setSlide,
  clearSlide,
};
