const { User, Conference, Participant, Poll, PollOption, Question, TariffPlan } = require('../models/mysql');
const { sequelize } = require('../lib/sequelize');

async function seed() {
  try {
    console.log('🌱 Starting mock data seeding...');

    // 1. Ensure Default Tariff Plan
    const [tariff] = await TariffPlan.findOrCreate({
      where: { name: 'free' },
      defaults: {
        displayName: 'Free Plan',
        description: 'Basic plan for small conferences',
        pricePerMonth: 0,
        limits: {
          maxConferences: 1,
          maxParticipantsPerConference: 50,
          maxPollsPerConference: 10,
          maxQuestionsPerConference: 100,
          maxMeetingsPerConference: 50,
          maxMeetingsPerUser: 10,
          pollsEnabled: true
        },
        isDefault: true,
        isActive: true
      }
    });
    console.log('✅ Tariff Plan ensured.');

    // 2. Create Organizer
    const [organizer] = await User.findOrCreate({
      where: { telegramId: '12345' },
      defaults: {
        username: 'mock_organizer',
        firstName: 'Ivan',
        lastName: 'Organizer',
        globalRole: 'conference_admin',
        about: 'Professional event organizer with 10 years of experience.',
        company: 'EventPro Inc.',
        position: 'Senior Manager',
        onboardingCompleted: true
      }
    });
    console.log('✅ Organizer created.');

    // 3. Create Regular User
    const [user] = await User.findOrCreate({
      where: { telegramId: '67890' },
      defaults: {
        username: 'mock_user',
        firstName: 'Anna',
        lastName: 'Participant',
        globalRole: 'user',
        about: 'Tech enthusiast looking for new connections.',
        company: 'Innovate LLC',
        position: 'Developer',
        interests: ['AI', 'React', 'Startups'],
        onboardingCompleted: true
      }
    });
    console.log('✅ Regular User created.');

    // 4. Create Mock Conference
    const [conference] = await Conference.findOrCreate({
      where: { conferenceCode: 'MOCK26' },
      defaults: {
        title: 'Mock Tech Conference 2026',
        description: 'A place where mock data meets real innovation.',
        access: 'public',
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        isActive: true,
        isEnded: false,
        organizerId: organizer.id
      }
    });
    console.log('✅ Mock Conference created.');

    // 5. Join Users to Conference
    await Participant.findOrCreate({
      where: { userId: organizer.id, conferenceId: conference.id },
      defaults: {
        displayName: 'Ivan O.',
        role: 'organizer',
        company: 'EventPro Inc.',
        interests: ['Networking', 'Management']
      }
    });
    
    await Participant.findOrCreate({
      where: { userId: user.id, conferenceId: conference.id },
      defaults: {
        displayName: 'Anna P.',
        role: 'participant',
        company: 'Innovate LLC',
        interests: ['AI', 'React']
      }
    });
    console.log('✅ Participants joined.');

    // 6. Create Poll
    const [poll] = await Poll.findOrCreate({
      where: { conferenceId: conference.id, question: 'What is your favorite tech stack?' },
      defaults: {
        creatorId: organizer.id,
        isActive: true
      }
    });
    
    await PollOption.bulkCreate([
      { pollId: poll.id, text: 'React + Node' },
      { pollId: poll.id, text: 'Vue + Python' },
      { pollId: poll.id, text: 'Angular + Java' }
    ], { ignoreDuplicates: true });
    console.log('✅ Poll and Options created.');

    // 7. Create Question
    await Question.findOrCreate({
      where: { conferenceId: conference.id, userId: user.id, text: 'How can we scale AI networking?' },
      defaults: {
        isApproved: true,
        upvotesCount: 5
      }
    });
    console.log('✅ Mock Question created.');

    console.log('🚀 Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seed();
